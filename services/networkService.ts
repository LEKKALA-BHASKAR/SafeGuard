/**
 * Network Service - Handles connectivity detection and offline functionality
 * Ensures the app works even with poor or no internet connection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import emergencyService from './emergencyService';
import smsService from './smsService';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  details: any;
}

export interface QueuedAlert {
  id: string;
  type: 'SOS' | 'LOCATION' | 'MESSAGE';
  data: any;
  timestamp: number;
  retryCount: number;
}

class NetworkService {
  checkConnection() {
    throw new Error('Method not implemented.');
  }
  private networkStatus: NetworkStatus = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
    details: null,
  };
  
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private unsubscribe: (() => void) | null = null;
  private alertQueue: QueuedAlert[] = [];
  private readonly QUEUE_KEY = 'ALERT_QUEUE';
  private readonly MAX_RETRIES = 3;

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<void> {
    // Load queued alerts from storage
    await this.loadQueue();

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener((state) => {
      const wasConnected = this.networkStatus.isConnected;
      
      this.networkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        details: state.details,
      };

      // Notify listeners
      this.listeners.forEach((listener) => listener(this.networkStatus));

      // If connection restored, process queued alerts
      if (!wasConnected && this.networkStatus.isConnected) {
        this.processQueue();
      }
    });

    // Get initial network state
    const state = await NetInfo.fetch();
    this.networkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type,
      details: state.details,
    };
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return this.networkStatus;
  }

  /**
   * Check if device has internet connectivity
   */
  isOnline(): boolean {
    return this.networkStatus.isConnected && this.networkStatus.isInternetReachable !== false;
  }

  /**
   * Check if device is offline
   */
  isOffline(): boolean {
    return !this.isOnline();
  }

  /**
   * Add listener for network status changes
   */
  addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Queue alert for later delivery when network is restored
   */
  async queueAlert(
    type: QueuedAlert['type'],
    data: any
  ): Promise<string> {
    const alert: QueuedAlert = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.alertQueue.push(alert);
    await this.saveQueue();

    console.log(`Alert queued: ${alert.id} (${type})`);
    return alert.id;
  }

  /**
   * Process queued alerts when connection is restored
   */
  private async processQueue(): Promise<void> {
    if (this.alertQueue.length === 0) {
      return;
    }

    console.log(`Processing ${this.alertQueue.length} queued alerts...`);

    const alertsToProcess = [...this.alertQueue];
    
    for (const alert of alertsToProcess) {
      try {
        const success = await this.sendQueuedAlert(alert);
        
        if (success) {
          // Remove from queue
          this.alertQueue = this.alertQueue.filter((a) => a.id !== alert.id);
        } else {
          // Increment retry count
          alert.retryCount++;
          
          // Remove if max retries exceeded
          if (alert.retryCount >= this.MAX_RETRIES) {
            console.warn(`Alert ${alert.id} exceeded max retries, removing from queue`);
            this.alertQueue = this.alertQueue.filter((a) => a.id !== alert.id);
          }
        }
      } catch (error) {
        console.error(`Error processing queued alert ${alert.id}:`, error);
        alert.retryCount++;
      }
    }

    await this.saveQueue();
  }

  /**
   * Send a queued alert
   */
  private async sendQueuedAlert(alert: QueuedAlert): Promise<boolean> {
    try {
      console.log(`Sending queued alert: ${alert.id} (${alert.type})`);
      
      switch (alert.type) {
        case 'SOS':
          // Send emergency SOS alert
          await emergencyService.triggerEmergencyAlert(
            alert.data.contacts || [],
            alert.data.location || null,
            alert.data.silentMode || false,
            alert.data.audioUri
          );
          return true;

        case 'LOCATION':
          // Share location
          if (alert.data.location) {
            const shareMessage = `Current Location: https://maps.google.com/?q=${alert.data.location.latitude},${alert.data.location.longitude}`;
            
            // Send via SMS to contacts
            if (alert.data.contacts && alert.data.contacts.length > 0) {
              for (const contact of alert.data.contacts) {
                await smsService.sendSMS(
                  contact.phone,
                  shareMessage
                );
              }
            }
          }
          return true;

        case 'MESSAGE':
          // Send message via SMS
          if (alert.data.to && alert.data.message) {
            await smsService.sendSMS(
              alert.data.to,
              alert.data.message
            );
          }
          return true;

        default:
          console.warn(`Unknown alert type: ${alert.type}`);
          return false;
      }
    } catch (error) {
      console.error('Error sending queued alert:', error);
      return false;
    }
  }

  /**
   * Get queued alerts count
   */
  getQueuedAlertsCount(): number {
    return this.alertQueue.length;
  }

  /**
   * Get all queued alerts
   */
  getQueuedAlerts(): QueuedAlert[] {
    return [...this.alertQueue];
  }

  /**
   * Clear all queued alerts
   */
  async clearQueue(): Promise<void> {
    this.alertQueue = [];
    await AsyncStorage.removeItem(this.QUEUE_KEY);
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.alertQueue));
    } catch (error) {
      console.error('Error saving alert queue:', error);
    }
  }

  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (queueData) {
        this.alertQueue = JSON.parse(queueData);
        console.log(`Loaded ${this.alertQueue.length} queued alerts`);
      }
    } catch (error) {
      console.error('Error loading alert queue:', error);
    }
  }

  /**
   * Cleanup and stop monitoring
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
  }

  /**
   * Get connection quality indicator
   */
  getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'none' {
    if (!this.networkStatus.isConnected) {
      return 'none';
    }

    const type = this.networkStatus.type;
    
    if (type === 'wifi') {
      return 'excellent';
    } else if (type === 'cellular') {
      const details = this.networkStatus.details as any;
      if (details?.cellularGeneration) {
        switch (details.cellularGeneration) {
          case '5g':
            return 'excellent';
          case '4g':
            return 'good';
          case '3g':
            return 'fair';
          default:
            return 'poor';
        }
      }
      return 'good';
    }

    return 'fair';
  }
}

export default new NetworkService();
