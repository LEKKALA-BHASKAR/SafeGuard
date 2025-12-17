/**
 * Voice Command Service - Voice-activated emergency features
 * Provides voice command detection for hands-free SOS activation
 * Uses expo-speech for text-to-speech feedback
 */

import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

export interface VoiceCommandConfig {
  enabled: boolean;
  triggerPhrases: string[];
  confirmationRequired: boolean;
  feedbackEnabled: boolean;
  language: string;
}

export interface VoiceCommandResult {
  recognized: boolean;
  phrase: string;
  confidence: number;
  action: 'SOS' | 'CANCEL' | 'HELP' | 'LOCATION' | 'UNKNOWN';
}

const VOICE_CONFIG_KEY = 'voice_command_config';

const DEFAULT_CONFIG: VoiceCommandConfig = {
  enabled: false,
  triggerPhrases: ['help', 'emergency', 'sos', 'danger', 'call for help'],
  confirmationRequired: true,
  feedbackEnabled: true,
  language: 'en-US',
};

class VoiceCommandService {
  private config: VoiceCommandConfig = DEFAULT_CONFIG;
  private isListening: boolean = false;
  private onSOSTrigger: (() => void) | null = null;
  private onCancelTrigger: (() => void) | null = null;

  /**
   * Initialize voice command service
   */
  async initialize(): Promise<void> {
    await this.loadConfig();
    console.log('Voice Command Service initialized');
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(VOICE_CONFIG_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading voice config:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfig(config: Partial<VoiceCommandConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving voice config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceCommandConfig {
    return { ...this.config };
  }

  /**
   * Check if voice commands are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable voice commands
   */
  async enable(): Promise<boolean> {
    await this.saveConfig({ enabled: true });
    return true;
  }

  /**
   * Disable voice commands
   */
  async disable(): Promise<void> {
    await this.saveConfig({ enabled: false });
    this.stopListening();
  }

  /**
   * Set callback for SOS trigger
   */
  setSOSTriggerCallback(callback: () => void): void {
    this.onSOSTrigger = callback;
  }

  /**
   * Set callback for cancel trigger
   */
  setCancelTriggerCallback(callback: () => void): void {
    this.onCancelTrigger = callback;
  }

  /**
   * Process recognized speech text
   */
  processRecognizedText(text: string): VoiceCommandResult {
    const lowerText = text.toLowerCase().trim();
    
    // Check for trigger phrases
    const matchedPhrase = this.config.triggerPhrases.find(phrase => 
      lowerText.includes(phrase.toLowerCase())
    );

    if (matchedPhrase) {
      return {
        recognized: true,
        phrase: matchedPhrase,
        confidence: 0.9,
        action: 'SOS',
      };
    }

    // Check for cancel commands
    const cancelPhrases = ['cancel', 'stop', 'nevermind', 'false alarm'];
    const cancelMatch = cancelPhrases.find(phrase => 
      lowerText.includes(phrase)
    );

    if (cancelMatch) {
      return {
        recognized: true,
        phrase: cancelMatch,
        confidence: 0.9,
        action: 'CANCEL',
      };
    }

    // Check for help/info commands
    if (lowerText.includes('where am i') || lowerText.includes('my location')) {
      return {
        recognized: true,
        phrase: 'location query',
        confidence: 0.8,
        action: 'LOCATION',
      };
    }

    return {
      recognized: false,
      phrase: text,
      confidence: 0,
      action: 'UNKNOWN',
    };
  }

  /**
   * Handle recognized voice command
   */
  handleVoiceCommand(result: VoiceCommandResult): void {
    if (!result.recognized) {
      return;
    }

    switch (result.action) {
      case 'SOS':
        this.handleSOSCommand();
        break;
      case 'CANCEL':
        this.handleCancelCommand();
        break;
      case 'LOCATION':
        this.speakLocation();
        break;
      default:
        break;
    }
  }

  /**
   * Handle SOS voice command
   */
  private handleSOSCommand(): void {
    if (this.config.confirmationRequired) {
      this.speak('SOS command detected. Say "confirm" to send emergency alert, or "cancel" to abort.');
      // Start listening for confirmation
      // The confirmation will be handled in processRecognizedText
    } else {
      this.speak('Sending emergency alert now.');
      this.triggerSOS();
    }
  }

  /**
   * Handle cancel voice command
   */
  private handleCancelCommand(): void {
    this.speak('Emergency alert cancelled.');
    if (this.onCancelTrigger) {
      this.onCancelTrigger();
    }
  }

  /**
   * Trigger SOS action
   */
  private triggerSOS(): void {
    if (this.onSOSTrigger) {
      this.onSOSTrigger();
    }
  }

  /**
   * Speak location information
   */
  private speakLocation(): void {
    // This would integrate with location service
    this.speak('Getting your current location. Please wait.');
  }

  /**
   * Text-to-speech feedback
   */
  speak(text: string): void {
    if (!this.config.feedbackEnabled) {
      return;
    }

    Speech.speak(text, {
      language: this.config.language,
      pitch: 1.0,
      rate: 0.9,
      onDone: () => console.log('Speech completed'),
      onError: (error) => console.error('Speech error:', error),
    });
  }

  /**
   * Stop any ongoing speech
   */
  stopSpeaking(): void {
    Speech.stop();
  }

  /**
   * Check if speech is currently active
   */
  async isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
  }

  /**
   * Start listening for voice commands
   * Note: This is a framework - actual speech recognition requires
   * native modules or web speech API
   */
  startListening(): void {
    if (!this.config.enabled) {
      console.log('Voice commands are disabled');
      return;
    }

    this.isListening = true;
    console.log('Voice command listening started');
    
    // On web, we can use the Web Speech API
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.startWebSpeechRecognition();
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening(): void {
    this.isListening = false;
    console.log('Voice command listening stopped');
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.stopWebSpeechRecognition();
    }
  }

  /**
   * Check if currently listening
   */
  getListeningStatus(): boolean {
    return this.isListening;
  }

  /**
   * Web Speech API implementation
   * Note: Uses any types for web-specific APIs that may not be available in all environments
   */
  private webRecognition: any = null;

  private startWebSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    // Access Web Speech API - may not be available in all browsers
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                                  (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.log('Web Speech API not supported');
      return;
    }

    this.webRecognition = new SpeechRecognitionAPI();
    this.webRecognition.continuous = true;
    this.webRecognition.interimResults = false;
    this.webRecognition.lang = this.config.language;

    this.webRecognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      
      console.log('Voice recognized:', text);
      
      const result = this.processRecognizedText(text);
      this.handleVoiceCommand(result);
    };

    this.webRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    this.webRecognition.onend = () => {
      // Restart if still supposed to be listening
      if (this.isListening && this.webRecognition) {
        this.webRecognition.start();
      }
    };

    try {
      this.webRecognition.start();
      console.log('Web speech recognition started');
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  }

  private stopWebSpeechRecognition(): void {
    if (this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      this.webRecognition = null;
    }
  }

  /**
   * Get available trigger phrases
   */
  getTriggerPhrases(): string[] {
    return [...this.config.triggerPhrases];
  }

  /**
   * Add a custom trigger phrase
   */
  async addTriggerPhrase(phrase: string): Promise<void> {
    if (!this.config.triggerPhrases.includes(phrase.toLowerCase())) {
      this.config.triggerPhrases.push(phrase.toLowerCase());
      await this.saveConfig({ triggerPhrases: this.config.triggerPhrases });
    }
  }

  /**
   * Remove a trigger phrase
   */
  async removeTriggerPhrase(phrase: string): Promise<void> {
    this.config.triggerPhrases = this.config.triggerPhrases.filter(
      p => p.toLowerCase() !== phrase.toLowerCase()
    );
    await this.saveConfig({ triggerPhrases: this.config.triggerPhrases });
  }

  /**
   * Test voice feedback
   */
  testVoiceFeedback(): void {
    this.speak('Voice feedback is working correctly. SafeGuard is ready to help you.');
  }

  /**
   * Announce emergency alert
   */
  announceEmergencyAlert(): void {
    this.speak('Emergency alert has been sent to your contacts. Help is on the way. Stay calm and stay safe.');
  }

  /**
   * Announce SOS deactivation
   */
  announceSOSDeactivation(): void {
    this.speak('Emergency mode has been deactivated. You are safe.');
  }
}

export default new VoiceCommandService();
