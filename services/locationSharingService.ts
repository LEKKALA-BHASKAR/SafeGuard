import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import enhancedLocationService, { LocationData } from './enhancedLocationService';
import { Platform } from 'react-native';

export interface LocationShare {
  id: string;
  shareCode: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  viewCount: number;
  maxViews?: number;
  recipientName?: string;
  recipientPhone?: string;
  lastLocation?: LocationData;
}

class LocationSharingService {
  private activeShares: Map<string, LocationShare> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  // Generate a unique share code
  private async generateShareCode(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(6);
    return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8).toUpperCase();
  }

  // Create a new location share
  async createShare(
    durationMinutes: number = 60,
    recipientName?: string,
    recipientPhone?: string,
    maxViews?: number
  ): Promise<{ shareId: string; shareUrl: string; shareCode: string }> {
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const shareId = Date.now().toString();
      const shareCode = await this.generateShareCode();
      const createdAt = Date.now();
      const expiresAt = createdAt + durationMinutes * 60 * 1000;

      // Get current location
      const currentLocation = await enhancedLocationService.getCurrentLocation();

      const share: LocationShare = {
        id: shareId,
        shareCode,
        createdAt,
        expiresAt,
        isActive: true,
        viewCount: 0,
        maxViews,
        recipientName,
        recipientPhone,
        lastLocation: currentLocation || undefined,
      };

      this.activeShares.set(shareId, share);

      // Save to Firestore
      const db = getFirestore();
      await setDoc(doc(db, 'location_shares', shareId), {
        userId: auth.currentUser.uid,
        ...share,
        createdAt: serverTimestamp(),
      });

      // Generate shareable URL
      const shareUrl = this.generateShareUrl(shareId, shareCode);

      // Start location updates for this share
      this.startLocationUpdates(shareId);

      return { shareId, shareUrl, shareCode };
    } catch (error) {
      console.error('Error creating location share:', error);
      throw error;
    }
  }

  // Generate shareable URL
  private generateShareUrl(shareId: string, shareCode: string): string {
    // Deep link format: safeguard://track/{shareId}?code={shareCode}
    // Web format: https://safeguard.app/track/{shareId}?code={shareCode}
    
    const baseUrl = __DEV__ 
      ? 'http://localhost:8081' 
      : 'https://safeguard.app';
    
    return `${baseUrl}/track/${shareId}?code=${shareCode}`;
  }

  // Send share via SMS
  async sendShareViaSMS(
    shareId: string,
    phoneNumber: string,
    message?: string
  ): Promise<boolean> {
    const share = this.activeShares.get(shareId);
    
    if (!share) {
      throw new Error('Share not found');
    }

    const shareUrl = this.generateShareUrl(shareId, share.shareCode);
    const smsBody = message || 
      `I'm sharing my live location with you for safety. Track me here: ${shareUrl}. Code: ${share.shareCode}`;

    try {
      const url = `sms:${phoneNumber}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(smsBody)}`;
      await Linking.openURL(url);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  // Start periodic location updates for a share
  private startLocationUpdates(shareId: string): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      const share = this.activeShares.get(shareId);
      
      if (!share || !share.isActive || Date.now() > share.expiresAt) {
        this.stopShare(shareId);
        return;
      }

      // Get current location and update
      const location = await enhancedLocationService.getCurrentLocation();
      
      if (location) {
        share.lastLocation = location;

        // Update Firestore
        try {
          const db = getFirestore();
          await updateDoc(doc(db, 'location_shares', shareId), {
            lastLocation: location,
            lastUpdated: serverTimestamp(),
          });
        } catch (error) {
          console.error('Error updating location share:', error);
        }
      }
    }, 10000); // Update every 10 seconds
  }

  // Access a shared location (for recipient)
  async accessShare(shareId: string, shareCode: string): Promise<LocationShare | null> {
    try {
      const db = getFirestore();
      const shareDoc = await getDoc(doc(db, 'location_shares', shareId));

      if (!shareDoc.exists()) {
        throw new Error('Share not found');
      }

      const shareData = shareDoc.data() as LocationShare;

      // Verify code
      if (shareData.shareCode !== shareCode) {
        throw new Error('Invalid share code');
      }

      // Check if expired
      if (Date.now() > shareData.expiresAt) {
        throw new Error('Share has expired');
      }

      // Check view limit
      if (shareData.maxViews && shareData.viewCount >= shareData.maxViews) {
        throw new Error('Share view limit reached');
      }

      // Increment view count
      await updateDoc(doc(db, 'location_shares', shareId), {
        viewCount: (shareData.viewCount || 0) + 1,
      });

      return shareData;
    } catch (error) {
      console.error('Error accessing share:', error);
      return null;
    }
  }

  // Stop a share
  async stopShare(shareId: string): Promise<boolean> {
    const share = this.activeShares.get(shareId);
    
    if (!share) {
      return false;
    }

    share.isActive = false;
    this.activeShares.delete(shareId);

    // Clear interval if no more active shares
    if (this.activeShares.size === 0 && this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Update Firestore
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'location_shares', shareId), {
        isActive: false,
        stoppedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error stopping share:', error);
    }

    return true;
  }

  // Get all active shares
  getActiveShares(): LocationShare[] {
    return Array.from(this.activeShares.values()).filter(s => s.isActive);
  }

  // Get time remaining for a share
  getTimeRemaining(shareId: string): number {
    const share = this.activeShares.get(shareId);
    
    if (!share) {
      return 0;
    }

    const remaining = share.expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / 1000)); // seconds
  }

  // Extend share duration
  async extendShare(shareId: string, additionalMinutes: number): Promise<boolean> {
    const share = this.activeShares.get(shareId);
    
    if (!share) {
      return false;
    }

    share.expiresAt += additionalMinutes * 60 * 1000;

    // Update Firestore
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'location_shares', shareId), {
        expiresAt: share.expiresAt,
      });
      return true;
    } catch (error) {
      console.error('Error extending share:', error);
      return false;
    }
  }
}

const locationSharingService = new LocationSharingService();
export default locationSharingService;
