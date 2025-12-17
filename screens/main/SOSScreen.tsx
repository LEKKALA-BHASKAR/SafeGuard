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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import locationService, { LocationData } from '../../services/locationService';
import emergencyService, { EmergencyContact } from '../../services/emergencyService';

interface SOSScreenProps {
  userContacts: EmergencyContact[];
  userName: string;
}

const { width } = Dimensions.get('window');
const LONG_PRESS_DURATION = 3000; // 3 seconds

export default function SOSScreen({ userContacts, userName }: SOSScreenProps) {
  const { t } = useTranslation();
  const [isPressed, setIsPressed] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Start pulse animation when SOS is activated
    if (sosActivated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [sosActivated]);

  const handlePressIn = () => {
    setIsPressed(true);
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // Animate button scale
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();

    // Start progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: LONG_PRESS_DURATION,
      useNativeDriver: false,
    }).start();

    // Set timer for long press
    longPressTimer.current = setTimeout(() => {
      triggerSOS();
    }, LONG_PRESS_DURATION);
  };

  const handlePressOut = () => {
    setIsPressed(false);

    // Clear timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Reset animations
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    progressAnim.setValue(0);
  };

  const handlePress = () => {
    // Quick tap - show confirmation
    Alert.alert(
      t('sosConfirm'),
      'This will send emergency alerts to all your contacts.',
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('confirm'),
          onPress: triggerSOS,
          style: 'destructive',
        },
      ]
    );
  };

  const triggerSOS = async () => {
    if (userContacts.length === 0) {
      Alert.alert(
        t('error'),
        'No emergency contacts found. Please add contacts first.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSosActivated(true);
    
    // Vibration pattern
    Vibration.vibrate([0, 500, 200, 500]);
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Get current location
    const location = await locationService.getCurrentLocation();
    
    if (!location) {
      Alert.alert(
        t('error'),
        'Unable to get your location. Please check permissions.',
        [{ text: 'OK', onPress: () => setSosActivated(false) }]
      );
      return;
    }

    setCurrentLocation(location);

    // Send emergency alert
    await emergencyService.triggerEmergencyAlert(
      userContacts,
      location,
      userName,
      false // Don't auto-call, let user decide
    );

    // Show options
    Alert.alert(
      t('sosActivated'),
      'Emergency alerts sent to your contacts. Do you want to call emergency services?',
      [
        {
          text: t('cancel'),
          style: 'cancel',
          onPress: () => setSosActivated(false),
        },
        {
          text: t('sosCallPolice'),
          onPress: () => {
            // Call emergency services (911, 112, etc.)
            emergencyService.makeEmergencyCall('911');
            setSosActivated(false);
          },
        },
      ]
    );
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('emergency')}</Text>
        <Text style={styles.subtitle}>
          {sosActivated ? t('sosActivated') : t('sosLongPress')}
        </Text>
      </View>

      <View style={styles.sosContainer}>
        <Animated.View
          style={[
            styles.sosButtonContainer,
            { transform: [{ scale: sosActivated ? pulseAnim : scaleAnim }] },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.sosButton,
              sosActivated && styles.sosButtonActivated,
            ]}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
            accessibilityLabel="SOS emergency button"
            accessibilityRole="button"
            accessibilityHint="Press to trigger emergency alert"
          >
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.sosSubtext}>
              {sosActivated ? t('sosActivated').toUpperCase() : t('sosButton')}
            </Text>
          </TouchableOpacity>

          {isPressed && !sosActivated && (
            <Animated.View
              style={[
                styles.progressBar,
                { width: progressWidth },
              ]}
            />
          )}
        </Animated.View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            • Quick tap: Confirm before sending alert
          </Text>
          <Text style={styles.instructionText}>
            • Hold for 3 seconds: Auto-send alert
          </Text>
        </View>
      </View>

      {currentLocation && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationTitle}>Last Known Location:</Text>
          <Text style={styles.locationText}>
            Lat: {currentLocation.latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Lng: {currentLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {userContacts.length > 0 && (
        <View style={styles.contactsInfo}>
          <Text style={styles.contactsTitle}>
            Emergency Contacts: {userContacts.length}
          </Text>
          {userContacts.slice(0, 3).map((contact, index) => (
            <Text key={contact.id} style={styles.contactText}>
              {index + 1}. {contact.name} - {contact.phoneNumber}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  sosContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  sosButtonContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  sosButton: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  sosButtonActivated: {
    backgroundColor: '#DC143C',
  },
  sosText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
  },
  sosSubtext: {
    fontSize: 12,
    color: '#fff',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 6,
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  instructions: {
    paddingHorizontal: 40,
    alignItems: 'flex-start',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  locationInfo: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  contactsInfo: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  contactsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});
