import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { FamilyMember } from '../services/familyService';

interface FamilyMapProps {
  members: FamilyMember[];
  currentUserLocation: any;
}

const FamilyMap = forwardRef<MapView, FamilyMapProps>(function FamilyMap({ members, currentUserLocation }, ref) {
  return (
    <MapView
      ref={ref}
      style={styles.map}
      initialRegion={{
        latitude: currentUserLocation?.latitude || 37.78825,
        longitude: currentUserLocation?.longitude || -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      showsUserLocation={true}
    >
      {members.map((member) => (
        member.location && (
          <Marker
            key={member.uid}
            coordinate={{
              latitude: member.location.latitude,
              longitude: member.location.longitude,
            }}
            title={member.displayName}
            description={`Last seen: ${new Date(member.lastUpdated || 0).toLocaleTimeString()}`}
          >
            <View style={styles.markerContainer}>
              {member.photoURL ? (
                <Image source={{ uri: member.photoURL }} style={styles.markerImage} />
              ) : (
                <View style={[styles.markerImage, { backgroundColor: '#E63946', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{member.displayName.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.markerArrow} />
            </View>
          </Marker>
        )
      ))}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    marginTop: -2,
  },
});

export default FamilyMap;
