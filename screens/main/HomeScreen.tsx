import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import locationService, { LocationData } from '../../services/locationService';
import MapComponent from '../../components/MapComponent';

const { width, height } = Dimensions.get('window');

interface HomeScreenProps {
  userName: string;
}

export default function HomeScreen({ userName }: HomeScreenProps) {
  const { t } = useTranslation();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeLocation();
  }, []);

  useEffect(() => {
    if (trackingEnabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      locationService.stopTracking();
    };
  }, [trackingEnabled]);

  const initializeLocation = async () => {
    try {
      const currentLocation = await locationService.getCurrentLocation();
      if (currentLocation) {
        setLocation(currentLocation);
      }
      
      const isTracking = await locationService.isTrackingEnabled();
      setTrackingEnabled(isTracking);
    } catch (error) {
      console.error('Error initializing location:', error);
      Alert.alert(t('error'), t('locationPermissionDenied'));
    } finally {
      setLoading(false);
    }
  };

  const startTracking = async () => {
    const success = await locationService.startForegroundTracking((newLocation) => {
      setLocation(newLocation);
    });

    if (!success) {
      Alert.alert(t('error'), t('locationPermissionDenied'));
      setTrackingEnabled(false);
    }
  };

  const stopTracking = async () => {
    await locationService.stopTracking();
  };

  const toggleTracking = async () => {
    setTrackingEnabled(!trackingEnabled);
  };

  const refreshLocation = async () => {
    setLoading(true);
    const currentLocation = await locationService.getCurrentLocation();
    if (currentLocation) {
      setLocation(currentLocation);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {userName}</Text>
        <Text style={styles.subtitle}>Stay Safe, Stay Connected</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapComponent location={location} isTracking={trackingEnabled} />
      </View>

      <View style={styles.controls}>
        <View style={styles.trackingCard}>
          <View style={styles.trackingInfo}>
            <Text style={styles.trackingLabel}>
              {trackingEnabled ? t('trackingEnabled') : t('trackingDisabled')}
            </Text>
            <Text style={styles.trackingSubtext}>
              {trackingEnabled
                ? 'Your location is being tracked'
                : 'Enable to start tracking'}
            </Text>
          </View>
          <Switch
            value={trackingEnabled}
            onValueChange={toggleTracking}
            trackColor={{ false: '#ccc', true: '#E63946' }}
            thumbColor={trackingEnabled ? '#fff' : '#f4f3f4'}
            accessibilityLabel="Toggle location tracking"
            accessibilityRole="switch"
          />
        </View>

        {location && (
          <View style={styles.locationCard}>
            <Text style={styles.locationCardTitle}>{t('currentLocation')}</Text>
            <View style={styles.locationDetails}>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Latitude:</Text>
                <Text style={styles.locationValue}>
                  {location.latitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Longitude:</Text>
                <Text style={styles.locationValue}>
                  {location.longitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Accuracy:</Text>
                <Text style={styles.locationValue}>
                  {location.accuracy?.toFixed(0) || 'N/A'}m
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Updated:</Text>
                <Text style={styles.locationValue}>
                  {new Date(location.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={refreshLocation}
            accessibilityLabel="Refresh location"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => {
              Alert.alert(
                t('shareLocation'),
                'Location sharing feature coming soon'
              );
            }}
            accessibilityLabel="Share location"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>📍 Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#E63946',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  mapContainer: {
    height: height * 0.35,
    backgroundColor: '#f0f0f0',
  },
  controls: {
    flex: 1,
    padding: 20,
  },
  trackingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  trackingInfo: {
    flex: 1,
  },
  trackingLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  trackingSubtext: {
    fontSize: 12,
    color: '#666',
  },
  locationCard: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  locationDetails: {
    gap: 10,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 14,
    color: '#666',
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#E63946',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
