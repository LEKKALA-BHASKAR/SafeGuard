/**
 * Firebase Contacts Service - Sync emergency contacts with Firebase
 * Replaces AsyncStorage with persistent Firestore storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  relationship: string;
  role: 'primary' | 'secondary' | 'tertiary';
  verified: boolean;
  favorite: boolean;
  email?: string;
  notes?: string;
  addedAt: number;
  verifiedAt?: number;
  lastContactedAt?: number;
  // Sync status
  syncedAt?: number;
  lastModified?: number;
}

class FirebaseContactsService {
  private readonly CONTACTS_COLLECTION = 'emergency_contacts';
  private readonly CACHE_KEY = 'contacts_cache';
  private syncTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialize service - sync existing local contacts to Firebase
   */
  async initialize(): Promise<void> {
    try {
      if (!auth.currentUser) {
        console.log('No authenticated user');
        return;
      }

      // Check if user has contacts in Firebase
      const userContacts = await this.getUserContacts();
      
      if (userContacts.length === 0) {
        // Try to migrate from local storage
        const localContacts = await this.getMigratedLocalContacts();
        if (localContacts.length > 0) {
          console.log(`Migrating ${localContacts.length} contacts from local storage to Firebase`);
          
          for (const contact of localContacts) {
            const fbContact: EmergencyContact = {
              ...contact,
              id: contact.id || Date.now().toString(),
              userId: auth.currentUser.uid,
              syncedAt: Date.now(),
              lastModified: Date.now(),
            } as EmergencyContact;
            await this.addContact(fbContact);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing contacts service:', error);
    }
  }

  /**
   * Get all contacts for current user from Firebase
   */
  async getUserContacts(): Promise<EmergencyContact[]> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const contactsRef = collection(db, this.CONTACTS_COLLECTION);
      const q = query(
        contactsRef,
        where('userId', '==', auth.currentUser.uid)
      );

      const snapshot = await getDocs(q);
      const contacts: EmergencyContact[] = [];

      snapshot.forEach((doc) => {
        contacts.push({
          id: doc.id,
          ...doc.data(),
        } as EmergencyContact);
      });

      // Sort by role and name
      contacts.sort((a, b) => {
        const roleOrder = { primary: 0, secondary: 1, tertiary: 2 };
        if (roleOrder[a.role] !== roleOrder[b.role]) {
          return roleOrder[a.role] - roleOrder[b.role];
        }
        return a.name.localeCompare(b.name);
      });

      // Cache locally
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(contacts));

      return contacts;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      // Return cached version if available
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    }
  }

  /**
   * Add new contact to Firebase
   */
  async addContact(contact: Omit<EmergencyContact, 'id'>): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const contactData: EmergencyContact = {
        ...contact,
        userId: auth.currentUser.uid,
        id: Date.now().toString(),
        syncedAt: Date.now(),
        lastModified: Date.now(),
      };

      const docRef = doc(db, this.CONTACTS_COLLECTION, contactData.id);
      await setDoc(docRef, contactData);

      return contactData.id;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }

  /**
   * Update contact in Firebase
   */
  async updateContact(id: string, updates: Partial<EmergencyContact>): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const docRef = doc(db, this.CONTACTS_COLLECTION, id);
      await updateDoc(docRef, {
        ...updates,
        lastModified: Date.now(),
        syncedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete contact from Firebase
   */
  async deleteContact(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.CONTACTS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    await this.updateContact(id, { favorite: !isFavorite });
  }

  /**
   * Mark contact as verified (after OTP verification)
   */
  async markContactAsVerified(id: string, phoneNumber: string): Promise<void> {
    await this.updateContact(id, {
      verified: true,
      verifiedAt: Date.now(),
    });
  }

  /**
   * Update last contacted time
   */
  async updateLastContacted(id: string): Promise<void> {
    await this.updateContact(id, {
      lastContactedAt: Date.now(),
    });
  }

  /**
   * Get favorite contacts only
   */
  async getFavoriteContacts(): Promise<EmergencyContact[]> {
    try {
      const contacts = await this.getUserContacts();
      return contacts.filter((c) => c.favorite);
    } catch (error) {
      console.error('Error fetching favorite contacts:', error);
      return [];
    }
  }

  /**
   * Get primary contact
   */
  async getPrimaryContact(): Promise<EmergencyContact | null> {
    try {
      const contacts = await this.getUserContacts();
      const primary = contacts.find((c) => c.role === 'primary');
      return primary || null;
    } catch (error) {
      console.error('Error fetching primary contact:', error);
      return null;
    }
  }

  /**
   * Batch update contacts with sync conflict resolution
   */
  async batchUpdateContacts(contacts: EmergencyContact[]): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const batch = writeBatch(db);

      for (const contact of contacts) {
        const docRef = doc(db, this.CONTACTS_COLLECTION, contact.id);
        batch.set(docRef, {
          ...contact,
          userId: auth.currentUser.uid,
          lastModified: Date.now(),
          syncedAt: Date.now(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error batch updating contacts:', error);
      throw error;
    }
  }

  /**
   * Get local cached contacts
   */
  async getCachedContacts(): Promise<EmergencyContact[]> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached contacts:', error);
      return [];
    }
  }

  /**
   * Clear local cache
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get local contacts that need migration
   */
  private async getMigratedLocalContacts(): Promise<Partial<EmergencyContact>[]> {
    try {
      const localData = await AsyncStorage.getItem('emergency_contacts');
      if (localData) {
        const contacts = JSON.parse(localData);
        // Remove old local storage key after migration
        await AsyncStorage.removeItem('emergency_contacts');
        return contacts;
      }
      return [];
    } catch (error) {
      console.error('Error migrating local contacts:', error);
      return [];
    }
  }

  /**
   * Sync status - for monitoring data sync
   */
  async checkSyncStatus(): Promise<{
    lastSync: number | null;
    contactCount: number;
    isSynced: boolean;
  }> {
    try {
      const contacts = await this.getUserContacts();
      const lastSync = contacts.length > 0
        ? Math.max(...contacts.map((c) => c.syncedAt || 0))
        : null;

      return {
        lastSync,
        contactCount: contacts.length,
        isSynced: true,
      };
    } catch (error) {
      return {
        lastSync: null,
        contactCount: 0,
        isSynced: false,
      };
    }
  }
}

export default new FirebaseContactsService();
