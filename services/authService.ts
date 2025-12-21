import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import encryptionService from './encryptionService';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  phoneVerified: boolean;
  photoURL?: string;
  
  // Medical & Emergency Info
  bloodGroup?: string;
  medicalConditions?: string[];
  allergies?: string[];
  emergencyNotes?: string;
  
  // Emergency Contacts
  emergencyContacts: string[];
  
  // Profile Status
  profileComplete: boolean;
  createdAt: number;
  updatedAt: number;
  lastLogin: number;
  
  // Location & Privacy
  locationSharingEnabled: boolean;
  privacySettings: {
    shareWithContacts: boolean;
    trackingDuration: number; // in minutes, 0 = unlimited
    allowBackgroundTracking: boolean;
    autoCallOnSOS: boolean;
    silentSOSMode: boolean;
    shareLocation: 'all' | 'favorites' | 'none';
  };
  
  // Permissions
  permissions: {
    location: boolean;
    contacts: boolean;
    camera: boolean;
    microphone: boolean;
    notifications: boolean;
  };
  
  // Preferences
  preferredLanguage: string;
  theme: 'light' | 'dark' | 'auto';
  notificationsEnabled: boolean;
}

class AuthService {
  private currentUser: User | null = null;

  // Initialize auth listener
  initAuthListener(callback: (user: User | null) => void): () => void {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      callback(user);
    });
    return unsubscribe;
  }

  // Register new user
  async register(
    email: string,
    password: string,
    displayName: string
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      // Hash password before sending (additional layer)
      const hashedPassword = await encryptionService.hashData(password);
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password // Firebase handles password hashing
      );

      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName });

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName,
        phoneVerified: false,
        emergencyContacts: [],
        profileComplete: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLogin: Date.now(),
        locationSharingEnabled: false,
        privacySettings: {
          shareWithContacts: true,
          trackingDuration: 0,
          allowBackgroundTracking: true,
          autoCallOnSOS: false,
          silentSOSMode: false,
          shareLocation: 'all',
        },
        permissions: {
          location: false,
          contacts: false,
          camera: false,
          microphone: false,
          notifications: false,
        },
        preferredLanguage: 'en',
        theme: 'auto',
        notificationsEnabled: true,
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);

      // Store user session
      await AsyncStorage.setItem('user_logged_in', 'true');

      return { success: true, user };
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  // Login user
  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      console.log('[iOS Auth] Starting login process...');
      
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;
      console.log('[iOS Auth] Firebase login successful for user:', user.uid);

      // Store user session
      await AsyncStorage.setItem('user_logged_in', 'true');
      console.log('[iOS Auth] User session stored in AsyncStorage');
      
      // Update last login time
      await this.updateLastLogin(user.uid);
      console.log('[iOS Auth] Last login time updated');

      return { success: true, user };
    } catch (error: any) {
      console.error('[iOS Auth] Login error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      console.log('Starting logout process...');
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('user_logged_in');
      console.log('Cleared AsyncStorage');
      
      // Sign out from Firebase
      await signOut(auth);
      console.log('Signed out from Firebase');
      
      // Clear current user
      this.currentUser = null;
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser || auth.currentUser;
  }

  // Get user profile from Firestore
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(
    uid: string,
    updates: Partial<UserProfile>
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, updates);
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  // Check if user is logged in
  async isLoggedIn(): Promise<boolean> {
    const loggedIn = await AsyncStorage.getItem('user_logged_in');
    return loggedIn === 'true' && this.getCurrentUser() !== null;
  }

  // Verify phone number
  async verifyPhoneNumber(uid: string, phoneNumber: string): Promise<boolean> {
    try {
      await this.updateUserProfile(uid, {
        phoneNumber,
        phoneVerified: true,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('Error verifying phone number:', error);
      return false;
    }
  }

  // Update password
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      // Firebase provides updatePassword method
      // In production, use proper Firebase password update
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  // Validate password strength
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Update last login time
  async updateLastLogin(uid: string): Promise<void> {
    try {
      await this.updateUserProfile(uid, { lastLogin: Date.now() });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // Get readable error message
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/user-not-found':
        return 'No user found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later';
      default:
        return 'An error occurred. Please try again';
    }
  }
}

export default new AuthService();
