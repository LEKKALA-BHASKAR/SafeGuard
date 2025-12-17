import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface MapComponentProps {
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null;
  isTracking: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

const MapComponent: React.FC<MapComponentProps> = ({ location, isTracking }) => {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const mapContainerId = 'leaflet-map-container';
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useEffect(() => {
    // Load Leaflet CSS and JS from CDN
    const loadLeaflet = async () => {
      if (window.L) {
        setScriptsLoaded(true);
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setScriptsLoaded(true);
      document.body.appendChild(script);
    };

    loadLeaflet();
  }, []);

  useEffect(() => {
    if (!scriptsLoaded || !location) return;

    const L = window.L;

    if (!mapRef.current) {
      // Initialize Map
      const mapContainer = document.getElementById(mapContainerId);
      if (mapContainer) {
        mapRef.current = L.map(mapContainerId).setView(
          [location.latitude, location.longitude],
          15
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapRef.current);

        // Custom Icon
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: "<div style='background-color:#E63946; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 0 4px rgba(230, 57, 70, 0.3);'></div>",
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        markerRef.current = L.marker(
          [location.latitude, location.longitude],
          { icon }
        ).addTo(mapRef.current);

        if (location.accuracy) {
          circleRef.current = L.circle(
            [location.latitude, location.longitude],
            {
              color: '#E63946',
              fillColor: '#E63946',
              fillOpacity: 0.1,
              radius: location.accuracy
            }
          ).addTo(mapRef.current);
        }
      }
    } else {
      // Update Map
      const latLng = [location.latitude, location.longitude];
      
      if (isTracking) {
        mapRef.current.setView(latLng);
      }
      
      markerRef.current.setLatLng(latLng);
      
      if (circleRef.current && location.accuracy) {
        circleRef.current.setLatLng(latLng);
        circleRef.current.setRadius(location.accuracy);
      }
    }
  }, [scriptsLoaded, location, isTracking]);

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
      {/* @ts-ignore - React Native Web supports id prop on View but types might complain */}
      <div 
        id={mapContainerId} 
        style={{ 
          width: '100%', 
          height: '100%', 
          zIndex: 0 
        }} 
      />
      {!scriptsLoaded && (
        <View style={styles.loadingOverlay}>
          <Text>Loading Map...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default MapComponent;
