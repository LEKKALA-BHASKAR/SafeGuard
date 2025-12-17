import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';

export interface FakeCall {
  id: string;
  callerName: string;
  callerNumber?: string;
  delay: number; // seconds before "call" comes in
  duration: number; // how long the "call" lasts
  status: 'scheduled' | 'ringing' | 'answered' | 'ended' | 'cancelled';
}

class FakeCallService {
  private activeCalls: Map<string, FakeCall> = new Map();
  private callTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private ringtone: Audio.Sound | null = null;

  // Predefined fake callers
  private presetCallers = [
    { name: 'Mom', number: '+1 (555) 000-0001' },
    { name: 'Boss', number: '+1 (555) 000-0002' },
    { name: 'Friend', number: '+1 (555) 000-0003' },
    { name: 'Doctor Office', number: '+1 (555) 000-0004' },
    { name: 'Home', number: '+1 (555) 000-0005' },
  ];

  // Initialize with permissions
  async initialize(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        console.warn('Fake call features limited on web');
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('Notification permission required for fake calls');
        return false;
      }

      // Load ringtone
      await this.loadRingtone();

      return true;
    } catch (error) {
      console.error('Error initializing fake call service:', error);
      return false;
    }
  }

  // Load ringtone sound
  private async loadRingtone(): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        // Use default system sound or custom ringtone
        { uri: 'default' },
        { shouldPlay: false, isLooping: true }
      );
      this.ringtone = sound;
    } catch (error) {
      console.error('Error loading ringtone:', error);
    }
  }

  // Schedule a fake call
  async scheduleFakeCall(
    callerName: string,
    delaySeconds: number = 0,
    callerNumber?: string,
    durationSeconds: number = 30
  ): Promise<string> {
    const id = Date.now().toString();

    const fakeCall: FakeCall = {
      id,
      callerName,
      callerNumber,
      delay: delaySeconds,
      duration: durationSeconds,
      status: 'scheduled',
    };

    this.activeCalls.set(id, fakeCall);

    // Schedule the "incoming call"
    const timeout = setTimeout(() => {
      this.triggerFakeCall(id);
    }, delaySeconds * 1000);

    this.callTimeouts.set(id, timeout);

    console.log(`Fake call scheduled from ${callerName} in ${delaySeconds}s`);
    return id;
  }

  // Trigger the fake call (show notification + vibrate + sound)
  private async triggerFakeCall(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    
    if (!call) {
      return;
    }

    call.status = 'ringing';

    if (Platform.OS === 'web') {
      // Web: Show browser notification
      this.showWebNotification(call);
    } else {
      // Mobile: Show full-screen notification
      await this.showMobileNotification(call);
      
      // Start ringtone
      if (this.ringtone) {
        await this.ringtone.playAsync();
      }

      // Vibrate
      Vibration.vibrate([1000, 1000, 1000, 1000], true);
    }

    // Auto-end call after duration
    setTimeout(() => {
      this.endFakeCall(callId);
    }, call.duration * 1000);
  }

  // Show web notification
  private showWebNotification(call: FakeCall): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Incoming Call: ${call.callerName}`, {
        body: call.callerNumber || 'Unknown Number',
        icon: '/assets/phone-icon.png',
        tag: call.id,
        requireInteraction: true,
      });
    }
  }

  // Show mobile notification (looks like incoming call)
  private async showMobileNotification(call: FakeCall): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: call.callerName,
        body: call.callerNumber || 'Unknown Number',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'incoming_call',
        data: {
          type: 'fake_call',
          callId: call.id,
        },
      },
      trigger: null, // Show immediately
    });
  }

  // Answer the fake call
  async answerFakeCall(callId: string): Promise<boolean> {
    const call = this.activeCalls.get(callId);
    
    if (!call || call.status !== 'ringing') {
      return false;
    }

    call.status = 'answered';

    // Stop ringtone and vibration
    if (this.ringtone) {
      await this.ringtone.stopAsync();
    }
    Vibration.cancel();

    console.log(`Answered fake call from ${call.callerName}`);
    return true;
  }

  // End/reject the fake call
  async endFakeCall(callId: string): Promise<boolean> {
    const call = this.activeCalls.get(callId);
    
    if (!call) {
      return false;
    }

    call.status = 'ended';

    // Stop ringtone and vibration
    if (this.ringtone) {
      await this.ringtone.stopAsync();
    }
    Vibration.cancel();

    // Clear notification
    if (Platform.OS !== 'web') {
      await Notifications.dismissAllNotificationsAsync();
    }

    this.activeCalls.delete(callId);
    console.log(`Ended fake call from ${call.callerName}`);
    return true;
  }

  // Cancel scheduled fake call
  cancelFakeCall(callId: string): boolean {
    const timeout = this.callTimeouts.get(callId);
    
    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(callId);
    }

    const call = this.activeCalls.get(callId);
    if (call) {
      call.status = 'cancelled';
      this.activeCalls.delete(callId);
      return true;
    }

    return false;
  }

  // Quick fake call (instant)
  async quickFakeCall(presetIndex: number = 0): Promise<string> {
    const caller = this.presetCallers[presetIndex] || this.presetCallers[0];
    return this.scheduleFakeCall(caller.name, 0, caller.number, 30);
  }

  // Get preset callers
  getPresetCallers(): Array<{ name: string; number: string }> {
    return [...this.presetCallers];
  }

  // Get active calls
  getActiveCalls(): FakeCall[] {
    return Array.from(this.activeCalls.values());
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Cancel all timeouts
    for (const timeout of this.callTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.callTimeouts.clear();

    // Stop ringtone
    if (this.ringtone) {
      await this.ringtone.stopAsync();
      await this.ringtone.unloadAsync();
      this.ringtone = null;
    }

    // Stop vibration
    Vibration.cancel();

    this.activeCalls.clear();
  }
}

const fakeCallService = new FakeCallService();
export default fakeCallService;
