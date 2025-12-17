import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapComponent from '../../components/MapComponent';
import locationService, { LocationData } from '../../services/locationService';

const { width, height } = Dimensions.get('window');

interface HomeScreenProps {
  userName: string;
}

export default function HomeScreen({ userName }: HomeScreenProps) {
  const { t } = useTranslation();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<Location.LocationGeocodedAddress | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

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
        await getAddressFromLocation(currentLocation);
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
      getAddressFromLocation(newLocation);
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

  const getAddressFromLocation = async (loc: LocationData) => {
    try {
      setLoadingAddress(true);
      
      if (Platform.OS === 'web') {
        // For web, use Google Maps Geocoding API as fallback
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'SafeGuard App',
              },
            }
          );
          const data = await response.json();
          
          if (data && data.address) {
            // Map OpenStreetMap format to expo-location format
            const mappedAddress: any = {
              street: data.address.road || data.address.street || null,
              city: data.address.city || data.address.town || data.address.village || null,
              region: data.address.state || data.address.county || null,
              postalCode: data.address.postcode || null,
              country: data.address.country || null,
              name: data.display_name?.split(',')[0] || null,
            };
            setAddress(mappedAddress);
          }
        } catch (webError) {
          console.error('Web geocoding error:', webError);
          // Try expo-location as fallback
          const geocode = await Location.reverseGeocodeAsync({
            latitude: loc.latitude,
            longitude: loc.longitude,
          });
          if (geocode && geocode.length > 0) {
            setAddress(geocode[0]);
          }
        }
      } else {
        // Native platforms use expo-location directly
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
        
        if (geocode && geocode.length > 0) {
          setAddress(geocode[0]);
        }
      }
    } catch (error) {
      console.error('Error getting address:', error);
      // Set null to hide address section gracefully
      setAddress(null);
    } finally {
      setLoadingAddress(false);
    }
  };

  const refreshLocation = async () => {
    setLoading(true);
    const currentLocation = await locationService.getCurrentLocation();
    if (currentLocation) {
      setLocation(currentLocation);
      await getAddressFromLocation(currentLocation);
    }
    setLoading(false);
  };

  const shareLocation = async () => {
    if (!location) {
      Alert.alert('No Location', 'Location data not available');
      return;
    }

    const addressText = address
      ? `${address.street || ''} ${address.name || ''}\n${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}\n${address.country || ''}`
      : 'Address not available';

    const locationText = `📍 Current Location\n\n${addressText}\n\nCoordinates:\nLatitude: ${location.latitude.toFixed(6)}\nLongitude: ${location.longitude.toFixed(6)}\nAccuracy: ${location.accuracy?.toFixed(0) || 'N/A'}m\n\nGoogle Maps: https://maps.google.com/?q=${location.latitude},${location.longitude}\n\nShared via SafeGuard at ${new Date().toLocaleString()}`;

    try {
      if (Platform.OS === 'web') {
        // Web: Use fallback approach that works reliably
        let copySuccess = false;
        
        // Method 1: Try modern clipboard API
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(locationText);
            copySuccess = true;
            console.log('Copied using Clipboard API');
          }
        } catch (clipboardError) {
          console.log('Clipboard API failed:', clipboardError);
        }

        // Method 2: Fallback to textarea method
        if (!copySuccess && typeof document !== 'undefined') {
          try {
            const textarea = document.createElement('textarea');
            textarea.value = locationText;
            textarea.style.position = 'fixed';
            textarea.style.top = '0';
            textarea.style.left = '0';
            textarea.style.width = '2em';
            textarea.style.height = '2em';
            textarea.style.padding = '0';
            textarea.style.border = 'none';
            textarea.style.outline = 'none';
            textarea.style.boxShadow = 'none';
            textarea.style.background = 'transparent';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (successful) {
              copySuccess = true;
              console.log('Copied using execCommand');
            }
          } catch (execError) {
            console.log('execCommand failed:', execError);
          }
        }

        // Show result
        if (copySuccess) {
          Alert.alert('✅ Copied!', 'Location details copied to clipboard. You can paste it anywhere.');
        } else {
          // Last resort: Show location in alert
          Alert.alert(
            '📍 Location Details',
            'Copy the location details below:\n\n' + locationText,
            [{ text: 'OK', style: 'default' }]
          );
        }
      } else {
        // Mobile: Use native share
        try {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync('data:text/plain;base64,' + btoa(locationText), {
              mimeType: 'text/plain',
              dialogTitle: 'Share Location',
            });
          } else {
            Alert.alert('Share Location', locationText);
          }
        } catch (shareError) {
          Alert.alert('Share Location', locationText);
        }
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('📍 Location Details', locationText);
    }
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

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
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
            
            {/* Address Information */}
            {loadingAddress ? (
              <View style={styles.addressLoading}>
                <ActivityIndicator size="small" color="#E63946" />
                <Text style={styles.addressLoadingText}>Loading address...</Text>
              </View>
            ) : address ? (
              <View style={styles.addressContainer}>
                <Text style={styles.addressTitle}>📍 Address</Text>
                {address.name && (
                  <Text style={styles.addressText}>{address.name}</Text>
                )}
                {address.street && (
                  <Text style={styles.addressText}>{address.street}</Text>
                )}
                <Text style={styles.addressText}>
                  {[address.city, address.region].filter(Boolean).join(', ')}
                </Text>
                {address.postalCode && (
                  <Text style={styles.addressText}>PIN: {address.postalCode}</Text>
                )}
                {address.country && (
                  <Text style={styles.addressText}>{address.country}</Text>
                )}
              </View>
            ) : null}
            
            {/* Coordinates */}
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
            onPress={shareLocation}
            accessibilityLabel="Share location"
            accessibilityRole="button"
            disabled={!location}
          >
            <Text style={styles.actionButtonText}>📍 Share</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    padding: 20,
    paddingBottom: Platform.OS === 'web' ? 40 : 20,
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
  addressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  addressLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  addressContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#E63946',
  },
  addressTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E63946',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
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
