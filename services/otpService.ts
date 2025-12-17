/**
 * OTP Verification Service - Handles OTP generation and verification
 * Used for phone number verification and emergency contact validation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { collection, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface OTPData {
  code: string;
  phoneNumber: string;
  expiresAt: number;
  verified: boolean;
  attempts: number;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  data?: any;
}

class OTPService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;
  private readonly COOLDOWN_MINUTES = 5;

  /**
   * Generate a secure 6-digit OTP
   */
  private async generateOTP(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(3);
    const number = parseInt(
      Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
      16
    );
    return (number % 1000000).toString().padStart(6, '0');
  }

  /**
   * Send OTP to phone number
   * In production, integrate with Twilio, AWS SNS, or similar service
   */
  async sendOTP(phoneNumber: string, purpose: 'registration' | 'verification' | 'login'): Promise<VerificationResult> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(phoneNumber)) {
        return {
          success: false,
          message: 'Invalid phone number format. Use international format (e.g., +1234567890)',
        };
      }

      // Check cooldown
      const cooldownCheck = await this.checkCooldown(phoneNumber);
      if (!cooldownCheck.allowed) {
        return {
          success: false,
          message: `Please wait ${cooldownCheck.remainingMinutes} minutes before requesting another OTP`,
        };
      }

      // Generate OTP
      const code = await this.generateOTP();
      const expiresAt = Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000;

      // Store OTP data
      const otpData: OTPData = {
        code,
        phoneNumber,
        expiresAt,
        verified: false,
        attempts: 0,
      };

      // Save to Firebase (in production, use a more secure method)
      const otpRef = doc(db, 'otp_verifications', phoneNumber);
      await setDoc(otpRef, otpData);

      // Also save locally as backup
      await AsyncStorage.setItem(`otp_${phoneNumber}`, JSON.stringify(otpData));

      // In production, send SMS via Twilio/AWS SNS
      // For development/testing, log the OTP
      console.log(`[OTP Service] Code for ${phoneNumber}: ${code}`);
      console.log(`[OTP Service] Expires in ${this.OTP_EXPIRY_MINUTES} minutes`);

      // TODO: Integrate with SMS gateway
      // await this.sendSMS(phoneNumber, code, purpose);

      return {
        success: true,
        message: `OTP sent to ${this.maskPhoneNumber(phoneNumber)}`,
        data: { expiresAt },
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(phoneNumber: string, code: string): Promise<VerificationResult> {
    try {
      // Get OTP data from Firebase
      const otpRef = doc(db, 'otp_verifications', phoneNumber);
      const otpDoc = await getDoc(otpRef);

      if (!otpDoc.exists()) {
        // Try local storage as fallback
        const localData = await AsyncStorage.getItem(`otp_${phoneNumber}`);
        if (!localData) {
          return {
            success: false,
            message: 'No OTP found. Please request a new one.',
          };
        }
      }

      const otpData: OTPData = otpDoc.exists() 
        ? (otpDoc.data() as OTPData)
        : JSON.parse((await AsyncStorage.getItem(`otp_${phoneNumber}`))!);

      // Check if OTP is expired
      if (Date.now() > otpData.expiresAt) {
        await this.cleanup(phoneNumber);
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.',
        };
      }

      // Check attempts
      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        await this.cleanup(phoneNumber);
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.',
        };
      }

      // Verify code
      if (code !== otpData.code) {
        otpData.attempts++;
        await setDoc(otpRef, otpData);
        await AsyncStorage.setItem(`otp_${phoneNumber}`, JSON.stringify(otpData));

        return {
          success: false,
          message: `Invalid OTP. ${this.MAX_ATTEMPTS - otpData.attempts} attempts remaining.`,
        };
      }

      // Success - mark as verified
      otpData.verified = true;
      await setDoc(otpRef, otpData);
      await AsyncStorage.setItem(`otp_${phoneNumber}`, JSON.stringify(otpData));

      // Store verification status
      await AsyncStorage.setItem(`verified_${phoneNumber}`, 'true');

      // Cleanup after successful verification
      setTimeout(() => this.cleanup(phoneNumber), 5000);

      return {
        success: true,
        message: 'Phone number verified successfully!',
        data: { phoneNumber, verifiedAt: Date.now() },
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Verification failed. Please try again.',
      };
    }
  }

  /**
   * Check if phone number is already verified
   */
  async isVerified(phoneNumber: string): Promise<boolean> {
    try {
      const verified = await AsyncStorage.getItem(`verified_${phoneNumber}`);
      return verified === 'true';
    } catch (error) {
      console.error('Error checking verification status:', error);
      return false;
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(phoneNumber: string, purpose: 'registration' | 'verification' | 'login'): Promise<VerificationResult> {
    // Cleanup existing OTP
    await this.cleanup(phoneNumber);
    
    // Send new OTP
    return this.sendOTP(phoneNumber, purpose);
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
   * Mask phone number for display
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 6) return phoneNumber;
    const lastFour = phoneNumber.slice(-4);
    const masked = '*'.repeat(phoneNumber.length - 4) + lastFour;
    return masked;
  }

  /**
   * Check cooldown period
   */
  private async checkCooldown(phoneNumber: string): Promise<{ allowed: boolean; remainingMinutes?: number }> {
    try {
      const lastRequestTime = await AsyncStorage.getItem(`otp_cooldown_${phoneNumber}`);
      
      if (lastRequestTime) {
        const timeSinceRequest = Date.now() - parseInt(lastRequestTime);
        const cooldownMs = this.COOLDOWN_MINUTES * 60 * 1000;
        
        if (timeSinceRequest < cooldownMs) {
          const remainingMs = cooldownMs - timeSinceRequest;
          const remainingMinutes = Math.ceil(remainingMs / 60000);
          
          return {
            allowed: false,
            remainingMinutes,
          };
        }
      }

      // Set new cooldown
      await AsyncStorage.setItem(`otp_cooldown_${phoneNumber}`, Date.now().toString());
      
      return { allowed: true };
    } catch (error) {
      console.error('Error checking cooldown:', error);
      return { allowed: true }; // Allow on error
    }
  }

  /**
   * Cleanup OTP data
   */
  private async cleanup(phoneNumber: string): Promise<void> {
    try {
      // Remove from Firebase
      const otpRef = doc(db, 'otp_verifications', phoneNumber);
      await deleteDoc(otpRef);

      // Remove from local storage
      await AsyncStorage.removeItem(`otp_${phoneNumber}`);
    } catch (error) {
      console.error('Error cleaning up OTP data:', error);
    }
  }

  /**
   * Send SMS (placeholder - integrate with real SMS service)
   */
  private async sendSMS(phoneNumber: string, code: string, purpose: string): Promise<void> {
    // TODO: Integrate with Twilio, AWS SNS, or other SMS gateway
    
    const message = `Your SafeGuard ${purpose} code is: ${code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
    
    console.log(`[SMS] To: ${phoneNumber}`);
    console.log(`[SMS] Message: ${message}`);
    
    // Example Twilio integration:
    // const twilioClient = require('twilio')(accountSid, authToken);
    // await twilioClient.messages.create({
    //   body: message,
    //   from: twilioPhoneNumber,
    //   to: phoneNumber
    // });
  }

  /**
   * Clear all verification data for a phone number
   */
  async clearVerification(phoneNumber: string): Promise<void> {
    await AsyncStorage.removeItem(`verified_${phoneNumber}`);
    await this.cleanup(phoneNumber);
  }
}

export default new OTPService();
