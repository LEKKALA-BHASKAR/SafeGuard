/**
 * Enhanced SOS Screen - Premium emergency alert system
 * Features: Shake-to-SOS, Silent mode, Multiple triggers, Real-time status
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Vibration,
  Dimensions,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import locationService, { LocationData } from '../../services/locationService';
import emergencyService from '../../services/emergencyService';
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
  
  // Network status
  const [isOnline, setIsOnline] = useState(true);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeSubscription = useRef<any>(null);

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
    // Shake detection
    if (shakeEnabled && !sosActivated) {
      startShakeDetection();
    } else {
      stopShakeDetection();
    }

    return () => stopShakeDetection();
  }, [shakeEnabled, sosActivated]);

  const startShakeDetection = () => {
    Accelerometer.setUpdateInterval(100);
    
    shakeSubscription.current = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      
      if (acceleration > SHAKE_THRESHOLD) {
        triggerShakeSOS();
      }
    });
  };

  const stopShakeDetection = () => {
    if (shakeSubscription.current) {
      shakeSubscription.current.remove();
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

  const handlePressIn = () => {
    setIsPressed(true);
    
    if (!silentMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        if (!silentMode) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        clearInterval(countdownInterval);
        setCountdown(null);
      }
    }, 1000);

    longPressTimer.current = setTimeout(() => {
      clearInterval(countdownInterval);
      setCountdown(null);
      triggerSOS();
    }, LONG_PRESS_DURATION);
  };

  const handlePressOut = () => {
    setIsPressed(false);
    setCountdown(null);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
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
    if (userContacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add emergency contacts before using SOS.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    setSosActivated(true);
    
    // Vibration pattern (unless silent)
    if (!silentMode) {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

      // Check network status
      if (!isOnline) {
        Alert.alert(
          'Offline Mode',
          'No internet connection. Alerts will be queued and sent when connection is restored.',
          [{ text: 'OK' }]
        );
        
        // Queue alert for later
        await networkService.queueAlert('SOS', {
          contacts: userContacts,
          location,
          userName,
          timestamp: Date.now(),
        });
      } else {
        // Send emergency alerts
        const verifiedContacts = userContacts.filter(c => c.verified);
        const allContacts = verifiedContacts.length > 0 ? verifiedContacts : userContacts;
        
        if (location) {
          await emergencyService.sendEmergencyAlert(
            allContacts,
            location,
            userName
          );
        }

        // Auto call primary contact if enabled
        if (autoCall) {
          const primaryContact = userContacts.find(c => c.role === 'primary');
          if (primaryContact) {
            await emergencyService.makeEmergencyCall(primaryContact.phoneNumber);
          }
        }
      }

      // Log SOS event
      await logSOSEvent(location);

      if (!silentMode) {
        Alert.alert(
          'SOS Sent!',
          `Emergency alerts sent to ${userContacts.length} contact(s). Help is on the way.`,
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

  const logSOSEvent = async (location: LocationData | null) => {
    try {
      const event = {
        userId,
        type: 'SOS',
        timestamp: Date.now(),
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        } : null,
        contactsNotified: userContacts.length,
        silentMode,
        networkStatus: isOnline ? 'online' : 'offline',
      };

      // Save to AsyncStorage for local history
      // TODO: Also sync to Firebase for cloud backup
      console.log('SOS Event Logged:', event);
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

      {/* Settings */}
      <View style={styles.settingsContainer}>
        <Text style={styles.settingsTitle}>SOS Settings</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Silent Mode</Text>
            <Text style={styles.settingDescription}>
              No sound or vibration
            </Text>
          </View>
          <Switch
            value={silentMode}
            onValueChange={setSilentMode}
            trackColor={{ false: '#ccc', true: '#E63946' }}
            thumbColor="#fff"
          />
        </View>

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
      </View>

      {/* Contacts Summary */}
      <View style={styles.contactsSummary}>
        <Text style={styles.contactsTitle}>Emergency Contacts</Text>
        <Text style={styles.contactsCount}>
          {userContacts.length} contact(s) will be notified
        </Text>
        <Text style={styles.contactsVerified}>
          {userContacts.filter(c => c.verified).length} verified
        </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
    borderRadius: (width * 0.7 + 24) / 2,
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
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
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
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
  },
  sosSubtext: {
    fontSize: 20,
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
});
