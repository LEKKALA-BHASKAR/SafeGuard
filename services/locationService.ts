import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_TRACKING_KEY = 'location_tracking_enabled';

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
  speed: number | null;
  heading: number | null;
}

// Define the background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    
    if (location) {
      await saveLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
        speed: location.coords.speed,
        heading: location.coords.heading,
      });
    }
  }
});

class LocationService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;

  // Request location permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.log('Background location permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Start foreground location tracking
  async startForegroundTracking(callback: (location: LocationData) => void): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
            speed: location.coords.speed,
            heading: location.coords.heading,
          };
          callback(locationData);
        }
      );

      this.isTracking = true;
      await AsyncStorage.setItem(LOCATION_TRACKING_KEY, 'true');
      return true;
    } catch (error) {
      console.error('Error starting foreground tracking:', error);
      return false;
    }
  }

  // Start background location tracking
  async startBackgroundTracking(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000, // Update every 15 seconds for battery optimization
        distanceInterval: 50, // Update every 50 meters
        foregroundService: {
          notificationTitle: 'SafeGuard Active',
          notificationBody: 'Your location is being tracked for safety',
          notificationColor: '#FF0000',
        },
        pausesUpdatesAutomatically: false,
      });

      this.isTracking = true;
      await AsyncStorage.setItem(LOCATION_TRACKING_KEY, 'true');
      return true;
    } catch (error) {
      console.error('Error starting background tracking:', error);
      return false;
    }
  }

  // Stop location tracking
  async stopTracking(): Promise<void> {
    try {
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      this.isTracking = false;
      await AsyncStorage.setItem(LOCATION_TRACKING_KEY, 'false');
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  }

  // Get current location
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
        speed: location.coords.speed,
        heading: location.coords.heading,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  // Check if tracking is enabled
  async isTrackingEnabled(): Promise<boolean> {
    const tracking = await AsyncStorage.getItem(LOCATION_TRACKING_KEY);
    return tracking === 'true';
  }

  getTrackingStatus(): boolean {
    return this.isTracking;
  }
}

// Save location to storage (for offline support)
async function saveLocation(location: LocationData): Promise<void> {
  try {
    const key = `location_${Date.now()}`;
    await AsyncStorage.setItem(key, JSON.stringify(location));
  } catch (error) {
    console.error('Error saving location:', error);
  }
}

export default new LocationService();
