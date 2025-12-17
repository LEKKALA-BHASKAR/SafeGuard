import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';

interface MapComponentProps {
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null;
  isTracking: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({ location, isTracking }) => {
  const openInGoogleMaps = () => {
    if (location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>📍 Your Location</Text>
        {location ? (
          <>
            <Text style={styles.coords}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
            <TouchableOpacity style={styles.button} onPress={openInGoogleMaps}>
              <Text style={styles.buttonText}>Open in Google Maps</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.loading}>Getting your location...</Text>
        )}
        <Text style={styles.note}>
          {isTracking ? 'Location tracking is active' : 'Location tracking is paused'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  coords: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#E63946',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loading: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  note: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default MapComponent;
