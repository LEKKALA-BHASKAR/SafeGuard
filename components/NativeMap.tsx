import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';

interface NativeMapProps {
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  isTracking: boolean;
}

const NativeMap: React.FC<NativeMapProps> = ({ location, isTracking }) => {
  if (!location) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        region={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={isTracking}
        accessibilityLabel="Map view showing current location"
      >
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="Your Location"
          description={`Accuracy: ${location.accuracy?.toFixed(0) || 'Unknown'}m`}
        >
          <View style={styles.markerContainer}>
            <View style={styles.marker} />
          </View>
        </Marker>

        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={location.accuracy || 50}
          strokeColor="rgba(230, 57, 70, 0.5)"
          fillColor="rgba(230, 57, 70, 0.1)"
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E63946',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default NativeMap;