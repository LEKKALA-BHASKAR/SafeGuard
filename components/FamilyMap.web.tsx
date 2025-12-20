import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FamilyMember } from '../services/familyService';

interface FamilyMapProps {
  members: FamilyMember[];
  currentUserLocation: any;
}

declare global {
  interface Window {
    L: any;
  }
}

const FamilyMap = forwardRef<any, FamilyMapProps>(function FamilyMap({ members, currentUserLocation }, ref) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const mapContainerId = 'family-leaflet-map-container';
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any) => {
      if (mapRef.current && window.L) {
        mapRef.current.setView([region.latitude, region.longitude], 13);
      }
    }
  }));

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
    if (!scriptsLoaded || !currentUserLocation) return;

    if (!mapRef.current && window.L) {
      const mapContainer = document.getElementById(mapContainerId);
      if (mapContainer) {
        mapRef.current = window.L.map(mapContainerId).setView(
          [currentUserLocation.latitude, currentUserLocation.longitude],
          13
        );

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapRef.current);
      }
    }
  }, [scriptsLoaded, currentUserLocation]);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add member markers
    members.forEach(member => {
      if (member.location) {
        const iconHtml = `
          <div style="
            width: 40px; 
            height: 40px; 
            border-radius: 20px; 
            background-color: ${member.photoURL ? 'transparent' : '#E63946'};
            background-image: url(${member.photoURL || ''});
            background-size: cover;
            border: 2px solid white;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-weight: bold;
          ">
            ${!member.photoURL ? member.displayName.charAt(0) : ''}
          </div>
        `;

        const icon = window.L.divIcon({
          html: iconHtml,
          className: 'custom-div-icon',
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });

        const marker = window.L.marker(
          [member.location.latitude, member.location.longitude],
          { icon }
        )
        .bindPopup(`<b>${member.displayName}</b><br>Last seen: ${new Date(member.lastUpdated || 0).toLocaleTimeString()}`)
        .addTo(mapRef.current);

        markersRef.current.push(marker);
      }
    });
  }, [members, scriptsLoaded]);

  return (
    <View style={styles.container}>
      {/* @ts-ignore */}
      <div id={mapContainerId} style={{ height: '100%', width: '100%' }} />
      {!scriptsLoaded && (
        <View style={styles.loadingContainer}>
          <Text>Loading Map...</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 1,
  },
});

export default FamilyMap;
