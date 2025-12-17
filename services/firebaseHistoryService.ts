/**
 * Firebase History Service
 * Manages emergency event history in Firebase Firestore
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

const HISTORY_KEY = 'emergency_history';
const COLLECTION_NAME = 'emergency_events';

export interface EmergencyEvent {
  id: string;
  userId?: string;
  type: 'SOS' | 'LOCATION_SHARE' | 'CHECK_IN' | 'SAFE_ZONE_EXIT';
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null;
  contactsNotified: number;
  status: 'sent' | 'delivered' | 'failed' | 'queued';
  networkStatus: 'online' | 'offline';
  silentMode: boolean;
  responseTime?: number;
  notes?: string;
  trail?: Array<{
    latitude: number;
    longitude: number;
    timestamp: number;
  }>;
  createdAt?: any;
  updatedAt?: any;
}

class FirebaseHistoryService {
  private unsubscribe: Unsubscribe | null = null;
  private localCache: EmergencyEvent[] = [];
  private migrationComplete = false;

  /**
   * Initialize the service and migrate data from AsyncStorage if needed
   */
  async initialize(): Promise<void> {
    if (this.migrationComplete) return;

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.warn('No authenticated user, skipping history migration');
        return;
      }

      // Check if migration was already done
      const migrationKey = `history_migration_${userId}`;
      const migrationDone = await AsyncStorage.getItem(migrationKey);

      if (!migrationDone) {
        await this.migrateFromAsyncStorage(userId);
        await AsyncStorage.setItem(migrationKey, 'true');
      }

      this.migrationComplete = true;
    } catch (error) {
      console.error('Error initializing history service:', error);
    }
  }

  /**
   * Migrate existing emergency events from AsyncStorage to Firebase
   */
  private async migrateFromAsyncStorage(userId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);
      if (!stored) return;

      const localEvents: EmergencyEvent[] = JSON.parse(stored);
      if (localEvents.length === 0) return;

      console.log(`Migrating ${localEvents.length} emergency events to Firebase...`);

      // Add each event to Firebase
      for (const event of localEvents) {
        try {
          const { id, ...eventWithoutId } = event; // Remove local ID
          const eventData = {
            ...eventWithoutId,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await addDoc(collection(db, COLLECTION_NAME), eventData);
        } catch (error) {
          console.error('Error migrating event:', error);
        }
      }

      console.log('Emergency history migration complete');
    } catch (error) {
      console.error('Error during history migration:', error);
    }
  }

  /**
   * Get all emergency events for the current user
   */
  async getUserEvents(): Promise<EmergencyEvent[]> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('No authenticated user');
      }

      const eventsQuery = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(eventsQuery);
      const events: EmergencyEvent[] = [];

      snapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data(),
        } as EmergencyEvent);
      });

      this.localCache = events;
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      // Return cached data if available
      return this.localCache;
    }
  }

  /**
   * Add a new emergency event
   */
  async addEvent(event: Omit<EmergencyEvent, 'id' | 'userId'>): Promise<string> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('No authenticated user');
      }

      const eventData = {
        ...event,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), eventData);

      // Update local cache
      const newEvent: EmergencyEvent = {
        id: docRef.id,
        ...event,
        userId,
      };
      this.localCache = [newEvent, ...this.localCache];

      return docRef.id;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }

  /**
   * Update an existing emergency event
   */
  async updateEvent(eventId: string, updates: Partial<EmergencyEvent>): Promise<void> {
    try {
      const eventRef = doc(db, COLLECTION_NAME, eventId);
      await updateDoc(eventRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Update local cache
      const index = this.localCache.findIndex((e) => e.id === eventId);
      if (index !== -1) {
        this.localCache[index] = {
          ...this.localCache[index],
          ...updates,
        };
      }
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete an emergency event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, eventId));

      // Update local cache
      this.localCache = this.localCache.filter((e) => e.id !== eventId);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Delete all events for the current user
   */
  async clearHistory(): Promise<void> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('No authenticated user');
      }

      const eventsQuery = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(eventsQuery);
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      this.localCache = [];
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates of emergency events
   */
  subscribeToEvents(callback: (events: EmergencyEvent[]) => void): Unsubscribe {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('No authenticated user');
    }

    const eventsQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    this.unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const events: EmergencyEvent[] = [];
      snapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data(),
        } as EmergencyEvent);
      });

      this.localCache = events;
      callback(events);
    });

    return this.unsubscribe;
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromEvents(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Get cached events (offline support)
   */
  getCachedEvents(): EmergencyEvent[] {
    return this.localCache;
  }
}

export default new FirebaseHistoryService();
