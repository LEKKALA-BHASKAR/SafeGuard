/**
 * WebMap Component - Interactive map for web platform
 * Features: Real-time location display, OpenStreetMap tiles, location markers
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, Animated, Dimensions } from 'react-native';

interface WebMapProps {
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  isTracking: boolean;
  safeZones?: Array<{
    latitude: number;
    longitude: number;
    radius: number;
    name: string;
  }>;
  showAccuracyCircle?: boolean;
}

const { width } = Dimensions.get('window');

const WebMap: React.FC<WebMapProps> = ({ 
  location, 
  isTracking, 
  safeZones = [],
  showAccuracyCircle = true 
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Pulsing animation for location marker
    if (isTracking && location) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isTracking, location]);

  const openInGoogleMaps = () => {
    if (location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
      Linking.openURL(url);
    }
  };

  const openInAppleMaps = () => {
    if (location) {
      const url = `https://maps.apple.com/?ll=${location.latitude},${location.longitude}&q=My%20Location`;
      Linking.openURL(url);
    }
  };

  const shareLocation = () => {
    if (location) {
      const message = `📍 My current location: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
        alert('Location copied to clipboard!');
      }
    }
  };

  // Generate OpenStreetMap iframe URL
  const getMapUrl = () => {
    if (!location) return '';
    const zoom = 15;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.01},${location.latitude - 0.01},${location.longitude + 0.01},${location.latitude + 0.01}&layer=mapnik&marker=${location.latitude},${location.longitude}`;
  };

  return (
    <View style={styles.container}>
      {/* Map Container */}
      <View style={styles.mapContainer}>
        {location ? (
          <View style={styles.mapWrapper}>
            {/* OpenStreetMap iframe */}
            <iframe
              src={getMapUrl()}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 12,
              }}
              onLoad={() => setMapLoaded(true)}
              title="Location Map"
            />
            
            {/* Loading overlay */}
            {!mapLoaded && (
              <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>Loading map...</Text>
              </View>
            )}

            {/* Location Marker Overlay */}
            <View style={styles.markerOverlay}>
              <Animated.View 
                style={[
                  styles.locationMarker,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <View style={styles.markerInner}>
                  <View style={styles.markerDot} />
                </View>
              </Animated.View>
              {showAccuracyCircle && location.accuracy && (
                <View 
                  style={[
                    styles.accuracyCircle,
                    { 
                      width: Math.min(location.accuracy, 100),
                      height: Math.min(location.accuracy, 100),
                      borderRadius: Math.min(location.accuracy, 100) / 2,
                    }
                  ]} 
                />
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noLocationContainer}>
            <Text style={styles.noLocationIcon}>📍</Text>
            <Text style={styles.noLocationTitle}>Getting Your Location</Text>
            <Text style={styles.noLocationText}>
              Please enable location services to see your position on the map.
            </Text>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        )}
      </View>

      {/* Location Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: isTracking ? '#4CAF50' : '#FF9800' }
            ]} />
            <Text style={styles.statusText}>
              {isTracking ? 'Live Tracking Active' : 'Tracking Paused'}
            </Text>
          </View>
        </View>

        {location && (
          <>
            <View style={styles.coordinatesContainer}>
              <View style={styles.coordinateRow}>
                <Text style={styles.coordinateLabel}>Latitude</Text>
                <Text style={styles.coordinateValue}>{location.latitude.toFixed(6)}°</Text>
              </View>
              <View style={styles.coordinateRow}>
                <Text style={styles.coordinateLabel}>Longitude</Text>
                <Text style={styles.coordinateValue}>{location.longitude.toFixed(6)}°</Text>
              </View>
              {location.accuracy && (
                <View style={styles.coordinateRow}>
                  <Text style={styles.coordinateLabel}>Accuracy</Text>
                  <Text style={styles.coordinateValue}>±{location.accuracy.toFixed(0)}m</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.primaryButton]} 
                onPress={openInGoogleMaps}
              >
                <Text style={styles.buttonIcon}>🗺️</Text>
                <Text style={styles.primaryButtonText}>Google Maps</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryButton]} 
                onPress={openInAppleMaps}
              >
                <Text style={styles.buttonIcon}>🍎</Text>
                <Text style={styles.secondaryButtonText}>Apple Maps</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.tertiaryButton]} 
                onPress={shareLocation}
              >
                <Text style={styles.buttonIcon}>📤</Text>
                <Text style={styles.tertiaryButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Safe Zones Indicator */}
      {safeZones.length > 0 && (
        <View style={styles.safeZonesCard}>
          <Text style={styles.safeZonesTitle}>🛡️ Safe Zones</Text>
          {safeZones.map((zone, index) => (
            <View key={index} style={styles.safeZoneItem}>
              <View style={styles.safeZoneDot} />
              <Text style={styles.safeZoneName}>{zone.name}</Text>
              <Text style={styles.safeZoneRadius}>{zone.radius}m</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 0,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  markerOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  locationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(230, 57, 70, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  accuracyCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.3)',
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  noLocationIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  noLocationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  noLocationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E63946',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoHeader: {
    marginBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  coordinatesContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  coordinateLabel: {
    fontSize: 14,
    color: '#666',
  },
  coordinateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#E63946',
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  tertiaryButton: {
    backgroundColor: '#2196F3',
  },
  buttonIcon: {
    fontSize: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tertiaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  safeZonesCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  safeZonesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
  },
  safeZoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  safeZoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 12,
  },
  safeZoneName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  safeZoneRadius: {
    fontSize: 12,
    color: '#666',
  },
});

export default WebMap;