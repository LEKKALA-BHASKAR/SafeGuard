/**
 * Enhanced SOS Screen - Premium emergency alert system
 * Features: Shake-to-SOS, Silent mode, Multiple triggers, Real-time status
 */

import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';
import emergencyService from '../../services/emergencyService';
import locationService, { LocationData } from '../../services/locationService';
import networkService from '../../services/networkService';
import { EnhancedEmergencyContact } from './EnhancedContactsScreen';

interface EnhancedSOSScreenProps {
  userContacts: EnhancedEmergencyContact[];
  userName: string;
  userId: string;
}

const { width } = Dimensions.get('window');
const LONG_PRESS_DURATION = 3000;
const SHAKE_THRESHOLD = 2.5;

// SOS Button sizing - smaller on web
const SOS_BUTTON_SIZE = Platform.OS === 'web' 
  ? Math.min(width * 0.4, 280)  // 40% of width, max 280px on web
  : width * 0.7;                 // 70% of width on mobile

export default function EnhancedSOSScreen({
  userContacts,
  userName,
  userId,
}: EnhancedSOSScreenProps) {
  const { t } = useTranslation();
  
  const [isPressed, setIsPressed] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Settings
  const [silentMode, setSilentMode] = useState(false);
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [autoCall, setAutoCall] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Voice recording & message
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [showMessageInput, setShowMessageInput] = useState(false);
  
  // Network status
  const [isOnline, setIsOnline] = useState(true);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeSubscription = useRef<any>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Initialize network monitoring
    networkService.initialize();
    const unsubscribe = networkService.addListener((status) => {
      setIsOnline(status.isConnected);
    });

    return () => {
      unsubscribe();
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Pulse animation when SOS is activated
    if (sosActivated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [sosActivated]);

  useEffect(() => {
    // Shake detection - only on mobile
    if (Platform.OS !== 'web' && shakeEnabled && !sosActivated) {
      startShakeDetection();
    } else {
      stopShakeDetection();
    }

    return () => stopShakeDetection();
  }, [shakeEnabled, sosActivated]);

  const startShakeDetection = () => {
    if (Platform.OS === 'web') {
      console.log('Shake detection not available on web');
      return;
    }
    
    try {
      Accelerometer.setUpdateInterval(100);
      
      shakeSubscription.current = Accelerometer.addListener((data) => {
        const { x, y, z } = data;
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        
        if (acceleration > SHAKE_THRESHOLD) {
          triggerShakeSOS();
        }
      });
    } catch (error) {
      console.error('Error starting shake detection:', error);
    }
  };

  const stopShakeDetection = () => {
    if (shakeSubscription.current) {
      try {
        shakeSubscription.current.remove();
      } catch (error) {
        console.error('Error stopping shake detection:', error);
      }
      shakeSubscription.current = null;
    }
  };

  const triggerShakeSOS = () => {
    // Animate shake feedback
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    if (!silentMode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    Alert.alert(
      'Shake Detected!',
      'SOS triggered by shake. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send SOS', onPress: () => triggerSOS(), style: 'destructive' },
      ]
    );
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const handlePressIn = () => {
    setIsPressed(true);
    setShowMessageInput(true);
    
    // Start voice recording automatically (only on mobile)
    if (Platform.OS !== 'web') {
      startRecording();
    }
    
    if (!silentMode && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.error('Haptics error:', error);
      }
    }

    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: LONG_PRESS_DURATION,
      useNativeDriver: false,
    }).start();

    // Start countdown
    let count = 3;
    setCountdown(count);
    countdownIntervalRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        if (!silentMode && Platform.OS !== 'web') {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (error) {
            console.error('Haptics error:', error);
          }
        }
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        setCountdown(null);
      }
    }, 1000);

    longPressTimer.current = setTimeout(async () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      setCountdown(null);
      await stopRecording();
      triggerSOS();
    }, LONG_PRESS_DURATION);
  };

  const handlePressOut = async () => {
    setIsPressed(false);
    setCountdown(null);
    setShowMessageInput(false);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Stop recording if user releases early
    if (isRecording) {
      await stopRecording();
    }

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    progressAnim.setValue(0);
  };

  const handlePress = () => {
    if (!silentMode) {
      Alert.alert(
        'Emergency SOS',
        'This will immediately alert all your emergency contacts with your location.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send SOS', onPress: triggerSOS, style: 'destructive' },
        ]
      );
    } else {
      triggerSOS();
    }
  };

  const triggerSOS = async () => {
    // 1. Determine target contacts (Priority: Favorites -> Verified -> All)
    let targetContacts = userContacts.filter(c => c.favorite);
    
    if (targetContacts.length === 0) {
      targetContacts = userContacts.filter(c => c.verified);
    }
    
    if (targetContacts.length === 0) {
      targetContacts = userContacts;
    }

    if (targetContacts.length === 0) {
      Alert.alert(
        'No Contacts',
        'Please add emergency contacts before using SOS.',
        [{ text: 'Add Contacts', onPress: () => {} }] // Navigation would go here
      );
      return;
    }

    setLoading(true);
    setSosActivated(true);
    setShowMessageInput(false);
    
    // Vibration pattern (unless silent) - mobile only
    if (!silentMode && Platform.OS !== 'web') {
      try {
        Vibration.vibrate([0, 500, 200, 500, 200, 500]);
      } catch (error) {
        console.error('Vibration error:', error);
      }
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (error) {
        console.error('Haptics error:', error);
      }
    }

    try {
      // Get current location
      const location = await locationService.getCurrentLocation();
      
      if (!location) {
        Alert.alert(
          'Location Error',
          'Unable to get your location. SOS will still be sent.',
          [{ text: 'OK' }]
        );
      } else {
        setCurrentLocation(location);
      }

      // Prepare SOS data with message and recording
      const sosData = {
        userName,
        userId,
        location,
        timestamp: Date.now(),
        message: emergencyMessage || 'Emergency! I need help!',
        voiceRecording: recordingUri,
        trackingLink: location ? `https://maps.google.com/?q=${location.latitude},${location.longitude}` : null,
      };

      // Check network status
      if (!isOnline) {
        Alert.alert(
          'Offline Mode',
          'No internet connection. Attempting to send via SMS fallback.',
          [{ text: 'OK' }]
        );
      }

      if (location) {
        // Send Emergency Alert (Handles Cloud SMS -> Native SMS fallback)
        await emergencyService.triggerEmergencyAlert(
          targetContacts,
          location,
          `${userName}${sosData.message ? ': ' + sosData.message : ''}${recordingUri ? ' [Voice note recorded]' : ''}`
        );
      }

      // Auto call primary contact if enabled (only on mobile)
      if (Platform.OS !== 'web' && autoCall) {
        // Find primary contact, or first favorite, or first available
        const primaryContact = targetContacts.find(c => c.role === 'primary') || targetContacts[0];
        
        if (primaryContact) {
          try {
            await emergencyService.makeEmergencyCall(primaryContact.phoneNumber);
          } catch (error) {
            console.error('Error making emergency call:', error);
          }
        }
      }

      // Log SOS event with message and recording
      await logSOSEvent(location, sosData.message, recordingUri);

      // Clear message and recording for next use
      setEmergencyMessage('');
      setRecordingUri(null);

      if (!silentMode) {
        Alert.alert(
          'SOS Sent!',
          `Emergency alerts sent to ${favoriteContacts.length} favorite contact(s) with your location, message${recordingUri ? ', and voice note' : ''}. They can track you in real-time.`,
          [
            {
              text: 'Deactivate',
              onPress: deactivateSOS,
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error triggering SOS:', error);
      Alert.alert(
        'Error',
        'Failed to send SOS. Please try again or call emergency services directly.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

import firebaseHistoryService from '../../services/firebaseHistoryService';

// ... existing imports ...

// ... inside EnhancedSOSScreen ...

  const logSOSEvent = async (location: LocationData | null, message?: string, voiceUri?: string | null) => {
    try {
      const event = {
        type: 'SOS' as const,
        timestamp: Date.now(),
        message: message || 'Emergency!',
        hasVoiceNote: !!voiceUri,
        voiceRecordingUri: voiceUri,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 0,
        } : null,
        contactsNotified: userContacts.length,
        status: 'sent' as const,
        silentMode,
        networkStatus: isOnline ? 'online' as const : 'offline' as const,
      };

      await firebaseHistoryService.addEvent(event);
      console.log('SOS Event logged to Firebase');
    } catch (error) {
      console.error('Error logging SOS event:', error);
    }
  };

  const deactivateSOS = () => {
    setSosActivated(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('SOS Deactivated', 'Emergency mode turned off.');
  };

  const cleanup = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    stopShakeDetection();
  };

  const progressPercentage = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency SOS</Text>
        <Text style={styles.headerSubtitle}>
          {sosActivated ? '🚨 SOS ACTIVE' : 'Tap or hold for 3 seconds'}
        </Text>
      </View>

      {/* Network Status */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📵 Offline - Alerts will be queued
          </Text>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {/* SOS Button */}
        <View style={styles.sosContainer}>
        <Animated.View
          style={[
            styles.sosButtonWrapper,
            {
              transform: [
                { scale: pulseAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          {/* Progress Ring */}
          {isPressed && (
            <View style={styles.progressRing}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progressPercentage },
                ]}
              />
            </View>
          )}

          {/* Countdown */}
          {countdown !== null && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.sosButton,
              sosActivated && styles.sosButtonActive,
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            activeOpacity={0.9}
            disabled={loading}
          >
            <Animated.View
              style={[
                styles.sosButtonInner,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <Text style={styles.sosText}>SOS</Text>
                  <Text style={styles.sosSubtext}>
                    {sosActivated ? 'ACTIVE' : 'EMERGENCY'}
                  </Text>
                </>
              )}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.instruction}>
          {sosActivated
            ? '✓ Emergency alerts sent'
            : 'Hold for 3 seconds to activate'}
        </Text>
      </View>

      {/* Message Input During Countdown */}
      {showMessageInput && countdown !== null && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.messageInputContainer}
        >
          <View style={styles.messageCard}>
            <Text style={styles.messageCardTitle}>
              {isRecording ? '🎙️ Recording...' : '💬 Quick Message'}
            </Text>
            <Text style={styles.messageCardSubtitle}>
              {isRecording ? 'Voice note recording in progress' : 'Type an emergency message (optional)'}
            </Text>
            <TextInput
              style={styles.messageInput}
              placeholder="e.g., 'At home, need help immediately'"
              placeholderTextColor="#999"
              value={emergencyMessage}
              onChangeText={setEmergencyMessage}
              multiline
              maxLength={200}
              autoFocus={false}
            />
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording voice note...</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          📱 Hold button for 3 seconds → Auto-record voice note + optional text message → Send to favorite contacts with real-time location tracking
        </Text>
      </View>

      {/* Settings */}
      <View style={styles.settingsContainer}>
        <Text style={styles.settingsTitle}>SOS Settings</Text>

        {Platform.OS === 'web' && (
          <View style={styles.webWarningBanner}>
            <Text style={styles.webWarningText}>
              ℹ️ Some features below are mobile-only. Use on mobile for full functionality.
            </Text>
          </View>
        )}

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Silent Mode</Text>
            <Text style={styles.settingDescription}>
              {Platform.OS === 'web' ? 'No notifications' : 'No sound or vibration'}
            </Text>
          </View>
          <Switch
            value={silentMode}
            onValueChange={setSilentMode}
            trackColor={{ false: '#ccc', true: '#E63946' }}
            thumbColor="#fff"
          />
        </View>

        {Platform.OS !== 'web' && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Shake to SOS</Text>
              <Text style={styles.settingDescription}>
                Shake phone to trigger alert
              </Text>
            </View>
            <Switch
              value={shakeEnabled}
              onValueChange={setShakeEnabled}
              trackColor={{ false: '#ccc', true: '#E63946' }}
              thumbColor="#fff"
            />
          </View>
        )}

        {Platform.OS !== 'web' && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto Call</Text>
              <Text style={styles.settingDescription}>
                Call primary contact automatically
              </Text>
            </View>
            <Switch
              value={autoCall}
              onValueChange={setAutoCall}
              trackColor={{ false: '#ccc', true: '#E63946' }}
              thumbColor="#fff"
            />
          </View>
        )}

        {Platform.OS === 'web' && (
          <View style={styles.webFeaturesBanner}>
            <Text style={styles.webFeaturesTitle}>📱 Mobile-Only Features:</Text>
            <Text style={styles.webFeatureText}>• Shake to SOS - Trigger alert by shaking phone</Text>
            <Text style={styles.webFeatureText}>• Auto Call - Automatically call primary contact</Text>
            <Text style={styles.webFeatureText}>• Vibration Feedback - Get haptic feedback on trigger</Text>
          </View>
        )}
      </View>

      {/* Contacts Summary */}
      <View style={styles.contactsSummary}>
        <Text style={styles.contactsTitle}>Favorite Contacts (SOS Recipients)</Text>
        <Text style={styles.contactsCount}>
          ⭐ {userContacts.filter(c => c.favorite).length} favorite(s)
        </Text>
        <Text style={styles.contactsVerified}>
          {userContacts.filter(c => c.verified).length} verified • {userContacts.length} total contacts
        </Text>
        {userContacts.filter(c => c.favorite).length === 0 && (
          <Text style={styles.noFavoritesWarning}>
            ⚠️ Mark contacts as favorites in Contacts screen to use SOS
          </Text>
        )}
      </View>

        {/* Emergency Deactivate Button */}
        {sosActivated && (
          <TouchableOpacity
            style={styles.deactivateButton}
            onPress={deactivateSOS}
          >
            <Text style={styles.deactivateButtonText}>
              Deactivate SOS
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 40 : 20,
  },
  header: {
    backgroundColor: '#E63946',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  offlineBanner: {
    backgroundColor: '#FF9800',
    padding: 12,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sosContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: Platform.OS === 'web' ? 400 : undefined,
  },
  sosButtonWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  progressRing: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: (SOS_BUTTON_SIZE + 24) / 2,
    borderWidth: 8,
    borderColor: 'rgba(230, 57, 70, 0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#E63946',
  },
  countdownContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -60,
    marginTop: -100,
    zIndex: 10,
  },
  countdownText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#E63946',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sosButton: {
    width: SOS_BUTTON_SIZE,
    height: SOS_BUTTON_SIZE,
    borderRadius: SOS_BUTTON_SIZE / 2,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  sosButtonActive: {
    backgroundColor: '#FF1744',
  },
  sosButtonInner: {
    alignItems: 'center',
  },
  sosText: {
    fontSize: Platform.OS === 'web' ? 48 : 72,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
  },
  sosSubtext: {
    fontSize: Platform.OS === 'web' ? 14 : 20,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginTop: 8,
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
  },
  contactsSummary: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contactsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contactsCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E63946',
    marginBottom: 4,
  },
  contactsVerified: {
    fontSize: 14,
    color: '#4CAF50',
  },
  noFavoritesWarning: {
    fontSize: 13,
    color: '#FF9800',
    marginTop: 8,
    fontWeight: '600',
  },
  deactivateButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  deactivateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  messageInputContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  messageCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFC107',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  messageCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  messageCardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  messageInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E63946',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E63946',
  },
  infoBanner: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoBannerText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  webWarningBanner: {
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E63946',
  },
  webWarningText: {
    fontSize: 14,
    color: '#C62828',
    lineHeight: 20,
    fontWeight: '500',
  },
  webFeaturesBanner: {
    backgroundColor: '#F3E5F5',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  webFeaturesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6A1B9A',
    marginBottom: 12,
  },
  webFeatureText: {
    fontSize: 13,
    color: '#7B1FA2',
    marginVertical: 6,
    lineHeight: 18,
  },
});
