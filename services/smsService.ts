/**
 * SMS Service - Send SMS through Firebase Cloud Functions
 * Integrates with Twilio for reliable SMS delivery
 */

import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../config/firebase';

export interface SMSRequest {
  to: string;
  message: string;
  type: 'otp' | 'emergency' | 'notification' | 'verification';
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSService {
  private sendSMSFunction: any = null;

  constructor() {
    // Initialize Callable Cloud Function
    try {
      this.sendSMSFunction = httpsCallable(functions, 'sendSMS');
    } catch (error) {
      console.warn('SMS Cloud Function not initialized:', error);
    }
  }

  /**
   * Send SMS via Firebase Cloud Function
   */
  async sendSMS(to: string, message: string, type: string = 'notification'): Promise<SMSResponse> {
    try {
      if (!this.sendSMSFunction) {
        throw new Error('SMS service not initialized');
      }

      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      if (!this.isValidPhoneNumber(to)) {
        throw new Error('Invalid phone number format');
      }

      const response = await this.sendSMSFunction({
        to,
        message,
        type,
        userId: auth.currentUser.uid,
      });

      return {
        success: true,
        messageId: response.data.messageId,
      };
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Send OTP SMS
   */
  async sendOTP(phoneNumber: string, code: string): Promise<SMSResponse> {
    const message = `Your SafeGuard verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
    return this.sendSMS(phoneNumber, message, 'otp');
  }

  /**
   * Send emergency alert SMS
   */
  async sendEmergencyAlert(
    phoneNumber: string,
    userName: string,
    latitude: number,
    longitude: number,
    address?: string
  ): Promise<SMSResponse> {
    const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    const message = `🚨 EMERGENCY ALERT 🚨\n\n${userName} needs help!\n\nLocation: ${address || `${latitude}, ${longitude}`}\n\nGoogle Maps: ${locationUrl}\n\nTime: ${new Date().toLocaleString()}\n\nThis is an automated emergency message from SafeGuard app.`;

    return this.sendSMS(phoneNumber, message, 'emergency');
  }

  /**
   * Send verification SMS
   */
  async sendVerificationSMS(phoneNumber: string, code: string): Promise<SMSResponse> {
    const message = `Your SafeGuard account verification code is: ${code}. Do not share this code with anyone.`;
    return this.sendSMS(phoneNumber, message, 'verification');
  }

  /**
   * Send notification SMS
   */
  async sendNotificationSMS(
    phoneNumber: string,
    title: string,
    message: string
  ): Promise<SMSResponse> {
    const fullMessage = `${title}\n\n${message}`;
    return this.sendSMS(phoneNumber, fullMessage, 'notification');
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSMS(
    phoneNumbers: string[],
    message: string,
    type: string = 'notification'
  ): Promise<SMSResponse[]> {
    try {
      const results = await Promise.all(
        phoneNumbers.map((phone) => this.sendSMS(phone, message, type))
      );
      return results;
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      return phoneNumbers.map((phone) => ({
        success: false,
        error: 'Bulk SMS failed',
      }));
    }
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation - must start with + and have 10-15 digits
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to international format
   */
  formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');

    // Add + prefix if not present
    if (!phone.startsWith('+')) {
      return '+' + cleaned;
    }
    return phone;
  }

  /**
   * Mask phone number for display
   */
  maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 6) return phoneNumber;
    const lastFour = phoneNumber.slice(-4);
    return '*'.repeat(phoneNumber.length - 4) + lastFour;
  }
}

export default new SMSService();
