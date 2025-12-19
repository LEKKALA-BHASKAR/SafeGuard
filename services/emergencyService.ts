import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import { Alert, Platform } from 'react-native';
import { LocationData } from './locationService';
import networkService from './networkService';
import smsService from './smsService';

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
  verified: boolean;
  email?: string;
}

class EmergencyService {
  // Send SMS to emergency contacts with fallback logic
  async sendEmergencySMS(
    contacts: EmergencyContact[],
    location: LocationData,
    userName: string
  ): Promise<boolean> {
    try {
      const isOnline = await networkService.checkConnection() ?? false;
      let cloudSuccess = false;

      // 1. Try Cloud SMS (Automatic, Background) if online
      if (isOnline) {
        try {
          const promises = contacts.map(contact => 
            smsService.sendEmergencyAlert(
              contact.phoneNumber,
              userName,
              location.latitude,
              location.longitude
            )
          );
          
          const results = await Promise.all(promises);
          // Consider success if at least one message sent
          cloudSuccess = results.some(r => r.success);
          
          if (cloudSuccess) {
            console.log('Emergency alerts sent via Cloud SMS');
            return true;
          }
        } catch (cloudError) {
          console.warn('Cloud SMS failed, falling back to native:', cloudError);
        }
      }

      // 2. Fallback to Native SMS (Requires user interaction, works offline)
      // Skip on Web as expo-sms is not supported
      if (Platform.OS !== 'web') {
        const isAvailable = await SMS.isAvailableAsync();
        
        if (isAvailable) {
          const phoneNumbers = contacts.map(contact => contact.phoneNumber);
          const locationUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
          
          const message = `🚨 EMERGENCY ALERT 🚨\n\n${userName} needs help!\n\nLocation: ${locationUrl}\n\nLatitude: ${location.latitude}\nLongitude: ${location.longitude}\n\nTime: ${new Date(location.timestamp).toLocaleString()}\n\nThis is an automated emergency message from SafeGuard app.`;

          const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
          return result === 'sent';
        }
      }

      return false;
    } catch (error) {
      console.error('Error sending emergency SMS:', error);
      return false;
    }
  }

  // Initiate emergency call
  async makeEmergencyCall(phoneNumber: string): Promise<boolean> {
    try {
      const url = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        Alert.alert('Error', 'Cannot make phone calls on this device');
        return false;
      }
    } catch (error) {
      console.error('Error making emergency call:', error);
      return false;
    }
  }

  // Trigger full emergency alert
  async triggerEmergencyAlert(
    contacts: EmergencyContact[],
    location: LocationData,
    userName: string,
    shouldCall: boolean = false
  ): Promise<void> {
    try {
      // Send SMS to all contacts
      const smsSuccess = await this.sendEmergencySMS(contacts, location, userName);
      
      if (smsSuccess) {
        Alert.alert(
          'Emergency Alert Sent',
          `Emergency SMS sent to ${contacts.length} contact(s)`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Alert Warning',
          'Some alerts may not have been sent. Please check your network.',
          [{ text: 'OK' }]
        );
      }

      // Make call to first emergency contact if requested
      if (shouldCall && contacts.length > 0) {
        await this.makeEmergencyCall(contacts[0].phoneNumber);
      }

      // Send push notifications (would integrate with your backend)
      await this.sendPushNotifications(contacts, location, userName);
    } catch (error) {
      console.error('Error triggering emergency alert:', error);
      Alert.alert(
        'Alert Error',
        'There was an error sending the emergency alert. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }

  // Send push notifications (requires Firebase Cloud Messaging backend)
  private async sendPushNotifications(
    contacts: EmergencyContact[],
    location: LocationData,
    userName: string
  ): Promise<void> {
    // Push notifications require Firebase Cloud Messaging (FCM) backend setup:
    // 1. Enable FCM in Firebase Console
    // 2. Create Cloud Function to send notifications
    // 3. Store device tokens in Firestore
    // 4. Call Cloud Function with contact IDs and alert data
    console.log('Push notifications require FCM backend configuration');
  }

  // Format location message for sharing
  formatLocationMessage(location: LocationData, userName: string): string {
    const locationUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    
    return `📍 ${userName} is sharing their location with you:\n\n${locationUrl}\n\nLast updated: ${new Date(location.timestamp).toLocaleString()}`;
  }

  // Share location via SMS (non-emergency)
  async shareLocationViaSMS(
    phoneNumber: string,
    location: LocationData,
    userName: string
  ): Promise<boolean> {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      
      if (!isAvailable) {
        return false;
      }

      const message = this.formatLocationMessage(location, userName);
      const { result } = await SMS.sendSMSAsync([phoneNumber], message);
      
      return result === 'sent';
    } catch (error) {
      console.error('Error sharing location via SMS:', error);
      return false;
    }
  }

  // Alias for triggerEmergencyAlert for compatibility
  async sendEmergencyAlert(
    contacts: EmergencyContact[],
    location: LocationData,
    userName: string,
    shouldCall: boolean = false
  ): Promise<void> {
    return this.triggerEmergencyAlert(contacts, location, userName, shouldCall);
  }
}

export default new EmergencyService();
