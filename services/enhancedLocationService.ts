import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { getFirestore, collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCING_TASK_NAME = 'geofencing-task';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  active: boolean;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
}

class EnhancedLocationService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private isTracking = false;
  private locationHistory: LocationData[] = [];
  private maxHistorySize = 1000;
  private safeZones: SafeZone[] = [];
  private geofences: Location.LocationGeofencingEventType[] = [];

  // Initialize location service with enhanced permissions
  async initialize(): Promise<boolean> {
    try {
      // Request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.error('Foreground location permission denied');
        return false;
      }

      // Request background permissions (for iOS and Android)
      if (Platform.OS !== 'web') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission denied - some features limited');
          // Continue anyway - foreground tracking still works
        }
      }

      return true;
    } catch (error) {
      console.error('Location initialization error:', error);
      return false;
    }
  }

  // Get current location with high accuracy
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: location.timestamp,
      };

      this.addToHistory(locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  // Start high-accuracy foreground tracking
  async startForegroundTracking(
    callback: (location: LocationData) => void,
    options?: {
      accuracy?: Location.Accuracy;
      distanceInterval?: number;
      timeInterval?: number;
    }
  ): Promise<boolean> {
    try {
      if (this.isTracking) {
        await this.stopForegroundTracking();
      }

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: options?.accuracy || Location.Accuracy.BestForNavigation,
          distanceInterval: options?.distanceInterval || 10, // Update every 10 meters
          timeInterval: options?.timeInterval || 3000, // Or every 3 seconds
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            speed: location.coords.speed,
            heading: location.coords.heading,
            timestamp: location.timestamp,
          };

          this.addToHistory(locationData);
          callback(locationData);
          this.saveToBreadcrumb(locationData);
        }
      );

      this.isTracking = true;
      return true;
    } catch (error) {
      console.error('Error starting foreground tracking:', error);
      return false;
    }
  }

  // Stop foreground tracking
  async stopForegroundTracking(): Promise<void> {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isTracking = false;
  }

  // Start background tracking (works with Task Manager)
  async startBackgroundTracking(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.warn('Background tracking not supported on web');
      return false;
    }

    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.error('Background permission required');
        return false;
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 50, // meters
        timeInterval: 15000, // 15 seconds
        foregroundService: {
          notificationTitle: 'SafeGuard Active',
          notificationBody: 'Tracking your location for safety',
          notificationColor: '#E63946',
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });

      return true;
    } catch (error) {
      console.error('Error starting background tracking:', error);
      return false;
    }
  }

  // Stop background tracking
  async stopBackgroundTracking(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    } catch (error) {
      console.error('Error stopping background tracking:', error);
    }
  }

  // Add safe zone (geofencing)
  async addSafeZone(zone: Omit<SafeZone, 'id'>): Promise<string> {
    const id = Date.now().toString();
    const safeZone: SafeZone = { ...zone, id };
    
    this.safeZones.push(safeZone);

    if (Platform.OS !== 'web' && zone.active) {
      await this.startGeofencing();
    }

    // Save to Firestore
    try {
      const auth = getAuth();
      const db = getFirestore();
      await addDoc(collection(db, `users/${auth.currentUser?.uid}/safe_zones`), {
        ...safeZone,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error saving safe zone:', error);
    }

    return id;
  }

  // Start geofencing
  async startGeofencing(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const regions = this.safeZones
        .filter(zone => zone.active)
        .map(zone => ({
          identifier: zone.id,
          latitude: zone.latitude,
          longitude: zone.longitude,
          radius: zone.radius,
          notifyOnEnter: zone.notifyOnEnter,
          notifyOnExit: zone.notifyOnExit,
        }));

      if (regions.length === 0) return false;

      await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, regions);
      return true;
    } catch (error) {
      console.error('Error starting geofencing:', error);
      return false;
    }
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Calculate ETA based on current speed and distance
  calculateETA(distanceMeters: number, currentSpeed: number | null): string {
    if (!currentSpeed || currentSpeed === 0) {
      return 'Unknown';
    }

    const timeSeconds = distanceMeters / currentSpeed;
    const minutes = Math.round(timeSeconds / 60);

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  // Add location to history
  private addToHistory(location: LocationData): void {
    this.locationHistory.push(location);
    
    // Keep only last N locations
    if (this.locationHistory.length > this.maxHistorySize) {
      this.locationHistory.shift();
    }
  }

  // Get location history
  getLocationHistory(limit?: number): LocationData[] {
    if (limit) {
      return this.locationHistory.slice(-limit);
    }
    return [...this.locationHistory];
  }

  // Save location to breadcrumb trail
  private async saveToBreadcrumb(location: LocationData): Promise<void> {
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      if (!auth.currentUser) return;

      await addDoc(collection(db, `users/${auth.currentUser.uid}/breadcrumbs`), {
        ...location,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error saving breadcrumb:', error);
    }
  }

  // Detect unusual movement patterns (AI threat detection placeholder)
  detectAnomalies(): {
    isAnomalous: boolean;
    reason?: string;
    confidence: number;
  } {
    if (this.locationHistory.length < 10) {
      return { isAnomalous: false, confidence: 0 };
    }

    const recent = this.locationHistory.slice(-10);
    
    // Check for rapid location changes (possible phone theft/kidnapping)
    const distances = [];
    for (let i = 1; i < recent.length; i++) {
      const dist = this.calculateDistance(
        recent[i - 1].latitude,
        recent[i - 1].longitude,
        recent[i].latitude,
        recent[i].longitude
      );
      distances.push(dist);
    }

    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    
    // If average movement is > 1km in short time, flag as anomalous
    if (avgDistance > 1000) {
      return {
        isAnomalous: true,
        reason: 'Unusual rapid movement detected',
        confidence: 0.85,
      };
    }

    // Check for sudden speed changes
    const speeds = recent.map(l => l.speed || 0);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);

    if (maxSpeed > avgSpeed * 3 && maxSpeed > 50) {
      return {
        isAnomalous: true,
        reason: 'Sudden speed increase detected',
        confidence: 0.75,
      };
    }

    return { isAnomalous: false, confidence: 0 };
  }

  // Get safe zones
  getSafeZones(): SafeZone[] {
    return [...this.safeZones];
  }

  // Remove safe zone
  async removeSafeZone(id: string): Promise<boolean> {
    const index = this.safeZones.findIndex(zone => zone.id === id);
    if (index === -1) return false;

    this.safeZones.splice(index, 1);
    
    // Restart geofencing with updated zones
    if (Platform.OS !== 'web') {
      await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
      if (this.safeZones.some(z => z.active)) {
        await this.startGeofencing();
      }
    }

    return true;
  }
}

// Define background tasks
if (Platform.OS !== 'web') {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('Background location error:', error);
      return;
    }

    if (data) {
      const { locations } = data as any;
      const location = locations[0];

      // Save to Firestore
      try {
        const auth = getAuth();
        const db = getFirestore();
        
        if (auth.currentUser) {
          await addDoc(collection(db, `users/${auth.currentUser.uid}/locations`), {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
            createdAt: serverTimestamp(),
          });
        }
      } catch (error) {
        console.error('Error saving background location:', error);
      }
    }
  });

  TaskManager.defineTask(GEOFENCING_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('Geofencing error:', error);
      return;
    }

    if (data) {
      const { eventType, region } = data as any;
      
      // Send notification based on event
      console.log(`Geofence event: ${eventType} for region ${region.identifier}`);
      
      // TODO: Send push notification to emergency contacts
    }
  });
}

const enhancedLocationService = new EnhancedLocationService();
export default enhancedLocationService;
