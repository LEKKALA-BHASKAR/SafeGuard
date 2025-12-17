import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { getAuth } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

export interface CheckInTimer {
  id: string;
  duration: number; // in minutes
  startTime: number;
  endTime: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  destination?: string;
  status: 'active' | 'completed' | 'missed' | 'cancelled';
  notificationId?: string;
}

class CheckInService {
  private activeTimers: Map<string, CheckInTimer> = new Map();
  private notificationListeners: any[] = [];

  // Initialize notification permissions
  async initialize(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        console.warn('Check-in notifications limited on web');
        return true;
      }

      if (!Device.isDevice) {
        console.warn('Must use physical device for push notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.error('Notification permission denied');
        return false;
      }

      // Configure notification behavior
      await Notifications.setNotificationChannelAsync('check-in', {
        name: 'Check-in Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E63946',
        sound: 'default',
        enableVibrate: true,
      });

      return true;
    } catch (error) {
      console.error('Error initializing check-in service:', error);
      return false;
    }
  }

  // Start a new check-in timer
  async startTimer(
    durationMinutes: number,
    destination?: string,
    location?: { latitude: number; longitude: number }
  ): Promise<string> {
    const id = Date.now().toString();
    const startTime = Date.now();
    const endTime = startTime + durationMinutes * 60 * 1000;

    const timer: CheckInTimer = {
      id,
      duration: durationMinutes,
      startTime,
      endTime,
      location,
      destination,
      status: 'active',
    };

    this.activeTimers.set(id, timer);

    // Schedule notifications
    await this.scheduleNotifications(timer);

    // Save to Firestore
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      if (auth.currentUser) {
        await setDoc(doc(db, `users/${auth.currentUser.uid}/check_ins`, id), {
          ...timer,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error saving check-in timer:', error);
    }

    return id;
  }

  // Schedule reminder notifications
  private async scheduleNotifications(timer: CheckInTimer): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const durationSeconds = timer.duration * 60;
      
      // Notification at 75% of time
      const reminderTime = Math.floor(durationSeconds * 0.75);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Check-in Reminder',
          body: `Please check in within ${Math.floor(timer.duration * 0.25)} minutes`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'check-in',
        },
        trigger: {
          seconds: reminderTime,
          channelId: 'check-in',
        },
      });

      // Final notification when timer expires
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Check-in Missed!',
          body: 'Emergency contacts will be notified',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'check-in',
        },
        trigger: {
          seconds: durationSeconds,
          channelId: 'check-in',
        },
      });

      timer.notificationId = notificationId;

      // Set timeout to mark as missed
      setTimeout(() => {
        this.handleMissedCheckIn(timer.id);
      }, durationSeconds * 1000);

    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }

  // User checks in manually
  async checkIn(timerId: string): Promise<boolean> {
    const timer = this.activeTimers.get(timerId);
    
    if (!timer || timer.status !== 'active') {
      return false;
    }

    timer.status = 'completed';
    
    // Cancel notifications
    if (timer.notificationId && Platform.OS !== 'web') {
      await Notifications.cancelScheduledNotificationAsync(timer.notificationId);
    }

    // Update Firestore
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      if (auth.currentUser) {
        await setDoc(
          doc(db, `users/${auth.currentUser.uid}/check_ins`, timerId),
          { status: 'completed', completedAt: serverTimestamp() },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error updating check-in:', error);
    }

    return true;
  }

  // Handle missed check-in
  private async handleMissedCheckIn(timerId: string): Promise<void> {
    const timer = this.activeTimers.get(timerId);
    
    if (!timer || timer.status !== 'active') {
      return;
    }

    timer.status = 'missed';

    // Send emergency alert to contacts
    console.log('ALERT: User missed check-in, notifying emergency contacts');

    // Update Firestore
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      if (auth.currentUser) {
        await setDoc(
          doc(db, `users/${auth.currentUser.uid}/check_ins`, timerId),
          { status: 'missed', missedAt: serverTimestamp() },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error updating missed check-in:', error);
    }

    // Emergency alert would be triggered here
    // Requires integration with emergencyService and user's emergency contacts
    console.warn('Check-in timer missed - emergency alert should be configured');
  }

  // Cancel a timer
  async cancelTimer(timerId: string): Promise<boolean> {
    const timer = this.activeTimers.get(timerId);
    
    if (!timer) {
      return false;
    }

    timer.status = 'cancelled';

    // Cancel notifications
    if (timer.notificationId && Platform.OS !== 'web') {
      await Notifications.cancelScheduledNotificationAsync(timer.notificationId);
    }

    this.activeTimers.delete(timerId);
    return true;
  }

  // Get all active timers
  getActiveTimers(): CheckInTimer[] {
    return Array.from(this.activeTimers.values()).filter(
      t => t.status === 'active'
    );
  }

  // Get time remaining for a timer
  getTimeRemaining(timerId: string): number | null {
    const timer = this.activeTimers.get(timerId);
    
    if (!timer || timer.status !== 'active') {
      return null;
    }

    const remaining = timer.endTime - Date.now();
    return Math.max(0, Math.floor(remaining / 1000)); // seconds
  }
}

const checkInService = new CheckInService();
export default checkInService;
