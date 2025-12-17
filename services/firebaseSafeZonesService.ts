/**
 * Firebase Safe Zones Service
 * Manages safe zones (geofenced areas) in Firebase Firestore
 * Replaces AsyncStorage with cloud-based storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Unsubscribe,
    updateDoc,
    where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const SAFE_ZONES_KEY = 'safe_zones';
const COLLECTION_NAME = 'safe_zones';

export interface SafeZone {
  id: string;
  userId?: string;
  name: string;
  type: 'home' | 'work' | 'school' | 'hospital' | 'custom';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  radius: number; // in meters
  enabled: boolean;
  alertOnExit: boolean;
  alertOnEnter: boolean;
  createdAt?: any;
  updatedAt?: any;
  lastEntered?: number;
  lastExited?: number;
}

class FirebaseSafeZonesService {
  private unsubscribe: Unsubscribe | null = null;
  private localCache: SafeZone[] = [];
  private migrationComplete = false;

  /**
   * Initialize the service and migrate data from AsyncStorage if needed
   */
  async initialize(): Promise<void> {
    if (this.migrationComplete) return;

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.warn('No authenticated user, skipping safe zones migration');
        return;
      }

      // Check if migration was already done
      const migrationKey = `zones_migration_${userId}`;
      const migrationDone = await AsyncStorage.getItem(migrationKey);

      if (!migrationDone) {
        await this.migrateFromAsyncStorage(userId);
        await AsyncStorage.setItem(migrationKey, 'true');
      }

      this.migrationComplete = true;
    } catch (error) {
      console.error('Error initializing safe zones service:', error);
    }
  }

  /**
   * Migrate existing safe zones from AsyncStorage to Firebase
   */
  private async migrateFromAsyncStorage(userId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SAFE_ZONES_KEY);
      if (!stored) return;

      const localZones: SafeZone[] = JSON.parse(stored);
      if (localZones.length === 0) return;

      console.log(`Migrating ${localZones.length} safe zones to Firebase...`);

      // Add each zone to Firebase
      for (const zone of localZones) {
        try {
          const { id, ...zoneWithoutId } = zone; // Remove local ID
          const zoneData = {
            ...zoneWithoutId,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await addDoc(collection(db, COLLECTION_NAME), zoneData);
        } catch (error) {
          console.error('Error migrating zone:', error);
        }
      }

      console.log('Safe zones migration complete');
    } catch (error) {
      console.error('Error during safe zones migration:', error);
    }
  }

  /**
   * Get all safe zones for the current user
   */
  async getUserZones(): Promise<SafeZone[]> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('No authenticated user');
      }

      const zonesQuery = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(zonesQuery);
      const zones: SafeZone[] = [];

      snapshot.forEach((doc) => {
        zones.push({
          id: doc.id,
          ...doc.data(),
        } as SafeZone);
      });

      this.localCache = zones;
      return zones;
    } catch (error) {
      console.error('Error fetching safe zones:', error);
      // Return cached data if available
      return this.localCache;
    }
  }

  /**
   * Add a new safe zone
   */
  async addZone(zone: Omit<SafeZone, 'id' | 'userId'>): Promise<string> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('No authenticated user');
      }

      const zoneData = {
        ...zone,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), zoneData);

      // Update local cache
      const newZone: SafeZone = {
        id: docRef.id,
        ...zone,
        userId,
      };
      this.localCache = [newZone, ...this.localCache];

      return docRef.id;
    } catch (error) {
      console.error('Error adding safe zone:', error);
      throw error;
    }
  }

  /**
   * Update an existing safe zone
   */
  async updateZone(zoneId: string, updates: Partial<SafeZone>): Promise<void> {
    try {
      const zoneRef = doc(db, COLLECTION_NAME, zoneId);
      await updateDoc(zoneRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Update local cache
      const index = this.localCache.findIndex((z) => z.id === zoneId);
      if (index !== -1) {
        this.localCache[index] = {
          ...this.localCache[index],
          ...updates,
        };
      }
    } catch (error) {
      console.error('Error updating safe zone:', error);
      throw error;
    }
  }

  /**
   * Delete a safe zone
   */
  async deleteZone(zoneId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, zoneId));

      // Update local cache
      this.localCache = this.localCache.filter((z) => z.id !== zoneId);
    } catch (error) {
      console.error('Error deleting safe zone:', error);
      throw error;
    }
  }

  /**
   * Toggle zone enabled status
   */
  async toggleZone(zoneId: string, enabled: boolean): Promise<void> {
    await this.updateZone(zoneId, { enabled });
  }

  /**
   * Update zone entry/exit timestamps
   */
  async updateZoneEntry(zoneId: string, entered: boolean): Promise<void> {
    const updates: Partial<SafeZone> = entered
      ? { lastEntered: Date.now() }
      : { lastExited: Date.now() };
    await this.updateZone(zoneId, updates);
  }

  /**
   * Get enabled zones only
   */
  async getEnabledZones(): Promise<SafeZone[]> {
    const allZones = await this.getUserZones();
    return allZones.filter((zone) => zone.enabled);
  }

  /**
   * Subscribe to real-time updates of safe zones
   */
  subscribeToZones(callback: (zones: SafeZone[]) => void): Unsubscribe {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('No authenticated user');
    }

    const zonesQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    this.unsubscribe = onSnapshot(zonesQuery, (snapshot) => {
      const zones: SafeZone[] = [];
      snapshot.forEach((doc) => {
        zones.push({
          id: doc.id,
          ...doc.data(),
        } as SafeZone);
      });

      this.localCache = zones;
      callback(zones);
    });

    return this.unsubscribe;
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromZones(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Get cached zones (offline support)
   */
  getCachedZones(): SafeZone[] {
    return this.localCache;
  }

  /**
   * Check if a location is within any safe zone
   */
  isInSafeZone(
    location: { latitude: number; longitude: number },
    zones?: SafeZone[]
  ): { inZone: boolean; zone?: SafeZone } {
    const zonesToCheck = zones || this.localCache;
    const enabledZones = zonesToCheck.filter((z) => z.enabled);

    for (const zone of enabledZones) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        zone.location.latitude,
        zone.location.longitude
      );

      if (distance <= zone.radius) {
        return { inZone: true, zone };
      }
    }

    return { inZone: false };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
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
}

export default new FirebaseSafeZonesService();
