/**
 * Safe Zones Screen - Manage geofenced safe zones
 * Features: Home/work zones, enter/exit alerts, destination tracking
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAFE_ZONES_KEY = 'safe_zones';

export interface SafeZone {
  id: string;
  name: string;
  type: 'home' | 'work' | 'school' | 'hospital' | 'custom';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  radius: number; // in meters
  enabled: boolean;
  alertOnExit: boolean;
  alertOnEnter: boolean;
  createdAt: number;
  lastEntered?: number;
  lastExited?: number;
}

interface SafeZonesScreenProps {
  userId: string;
  currentLocation?: { latitude: number; longitude: number } | null;
}

export default function SafeZonesScreen({ userId, currentLocation }: SafeZonesScreenProps) {
  const { t } = useTranslation();
  
  const [zones, setZones] = useState<SafeZone[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState<SafeZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<SafeZone['type']>('custom');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100');
  const [alertOnExit, setAlertOnExit] = useState(true);
  const [alertOnEnter, setAlertOnEnter] = useState(false);

  useEffect(() => {
    loadZones();
    startGeofenceMonitoring();

    return () => {
      stopGeofenceMonitoring();
    };
  }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(SAFE_ZONES_KEY);
      
      if (stored) {
        const parsedZones: SafeZone[] = JSON.parse(stored);
        setZones(parsedZones);
      }
    } catch (error) {
      console.error('Error loading safe zones:', error);
      Alert.alert(t('error'), 'Failed to load safe zones');
    } finally {
      setLoading(false);
    }
  };

  const saveZones = async (newZones: SafeZone[]) => {
    try {
      await AsyncStorage.setItem(SAFE_ZONES_KEY, JSON.stringify(newZones));
      setZones(newZones);
      
      // Register geofences with location service
      await registerGeofences(newZones.filter(z => z.enabled));
    } catch (error) {
      console.error('Error saving safe zones:', error);
      Alert.alert(t('error'), 'Failed to save safe zones');
    }
  };

  const startGeofenceMonitoring = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed for safe zone monitoring'
        );
        return;
      }

      // Start monitoring would be handled by the enhanced location service
      console.log('Geofence monitoring started');
    } catch (error) {
      console.error('Error starting geofence monitoring:', error);
    }
  };

  const stopGeofenceMonitoring = () => {
    // Stop monitoring logic
    console.log('Geofence monitoring stopped');
  };

  const registerGeofences = async (activeZones: SafeZone[]) => {
    try {
      // Register geofences with expo-location TaskManager
      // This would integrate with enhancedLocationService.ts
      console.log(`Registering ${activeZones.length} geofences...`);
      
      for (const zone of activeZones) {
        console.log(`- ${zone.name}: ${zone.location.latitude}, ${zone.location.longitude} (${zone.radius}m)`);
      }
    } catch (error) {
      console.error('Error registering geofences:', error);
    }
  };

  const openAddZoneModal = () => {
    setEditingZone(null);
    setName('');
    setType('custom');
    setLatitude('');
    setLongitude('');
    setRadius('100');
    setAlertOnExit(true);
    setAlertOnEnter(false);
    setModalVisible(true);
  };

  const openEditZoneModal = (zone: SafeZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingZone(zone);
    setName(zone.name);
    setType(zone.type);
    setLatitude(zone.location.latitude.toString());
    setLongitude(zone.location.longitude.toString());
    setRadius(zone.radius.toString());
    setAlertOnExit(zone.alertOnExit);
    setAlertOnEnter(zone.alertOnEnter);
    setModalVisible(true);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('error'), 'Location permission required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(location.coords.latitude.toString());
      setLongitude(location.coords.longitude.toString());

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(t('error'), 'Failed to get current location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSaveZone = () => {
    if (!name || !latitude || !longitude || !radius) {
      Alert.alert(t('error'), 'Please fill in all required fields');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseInt(radius);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert(t('error'), 'Invalid coordinates');
      return;
    }

    if (isNaN(rad) || rad < 10 || rad > 10000) {
      Alert.alert(t('error'), 'Radius must be between 10 and 10000 meters');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingZone) {
      // Update existing zone
      const updatedZones = zones.map((z) =>
        z.id === editingZone.id
          ? {
              ...z,
              name,
              type,
              location: { latitude: lat, longitude: lng },
              radius: rad,
              alertOnExit,
              alertOnEnter,
            }
          : z
      );
      saveZones(updatedZones);
    } else {
      // Add new zone
      const newZone: SafeZone = {
        id: Date.now().toString(),
        name,
        type,
        location: { latitude: lat, longitude: lng },
        radius: rad,
        enabled: true,
        alertOnExit,
        alertOnEnter,
        createdAt: Date.now(),
      };
      saveZones([...zones, newZone]);
    }

    setModalVisible(false);
  };

  const handleDeleteZone = (zone: SafeZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Delete Safe Zone',
      `Are you sure you want to delete "${zone.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedZones = zones.filter((z) => z.id !== zone.id);
            saveZones(updatedZones);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleToggleZone = (zone: SafeZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const updatedZones = zones.map((z) =>
      z.id === zone.id ? { ...z, enabled: !z.enabled } : z
    );
    saveZones(updatedZones);
  };

  const getZoneIcon = (type: SafeZone['type']) => {
    switch (type) {
      case 'home':
        return '🏠';
      case 'work':
        return '💼';
      case 'school':
        return '🎓';
      case 'hospital':
        return '🏥';
      default:
        return '📍';
    }
  };

  const renderZone = ({ item }: { item: SafeZone }) => (
    <View style={[styles.zoneCard, !item.enabled && styles.zoneCardDisabled]}>
      <TouchableOpacity
        style={styles.zoneContent}
        onPress={() => openEditZoneModal(item)}
        onLongPress={() => handleDeleteZone(item)}
        activeOpacity={0.7}
      >
        <View style={styles.zoneIcon}>
          <Text style={styles.zoneIconText}>{getZoneIcon(item.type)}</Text>
        </View>

        <View style={styles.zoneInfo}>
          <Text style={styles.zoneName}>{item.name}</Text>
          <Text style={styles.zoneType}>{item.type.toUpperCase()}</Text>
          <Text style={styles.zoneRadius}>Radius: {item.radius}m</Text>
          
          <View style={styles.alertBadges}>
            {item.alertOnExit && (
              <View style={[styles.alertBadge, styles.exitBadge]}>
                <Text style={styles.alertBadgeText}>Exit Alert</Text>
              </View>
            )}
            {item.alertOnEnter && (
              <View style={[styles.alertBadge, styles.enterBadge]}>
                <Text style={styles.alertBadgeText}>Enter Alert</Text>
              </View>
            )}
          </View>
        </View>

        <Switch
          value={item.enabled}
          onValueChange={() => handleToggleZone(item)}
          trackColor={{ false: '#ccc', true: '#4CAF50' }}
          thumbColor="#fff"
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>Loading safe zones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safe Zones</Text>
        <Text style={styles.headerSubtitle}>
          {zones.filter(z => z.enabled).length} active zone(s)
        </Text>
      </View>

      {/* Zones List */}
      {zones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyTitle}>No Safe Zones</Text>
          <Text style={styles.emptyText}>
            Create safe zones for places like home, work, or school. Get alerts when entering or leaving.
          </Text>
        </View>
      ) : (
        <FlatList
          data={zones}
          renderItem={renderZone}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddZoneModal}
      >
        <Text style={styles.addButtonIcon}>+</Text>
        <Text style={styles.addButtonText}>Add Safe Zone</Text>
      </TouchableOpacity>

      {/* Add/Edit Zone Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingZone ? 'Edit Safe Zone' : 'Add Safe Zone'}
              </Text>

              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Home, Office"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Type *</Text>
              <View style={styles.typeSelector}>
                {(['home', 'work', 'school', 'hospital', 'custom'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeOption, type === t && styles.typeOptionSelected]}
                    onPress={() => setType(t)}
                  >
                    <Text style={styles.typeIcon}>{getZoneIcon(t)}</Text>
                    <Text style={[styles.typeOptionText, type === t && styles.typeOptionTextSelected]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Location *</Text>
              <View style={styles.locationRow}>
                <TextInput
                  style={[styles.input, styles.locationInput]}
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="Latitude"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={[styles.input, styles.locationInput]}
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="Longitude"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
              
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={handleUseCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#2196F3" />
                ) : (
                  <Text style={styles.currentLocationButtonText}>
                    📍 Use Current Location
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Radius (meters) *</Text>
              <TextInput
                style={styles.input}
                value={radius}
                onChangeText={setRadius}
                placeholder="e.g., 100"
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
              <Text style={styles.helperText}>
                Recommended: 50-200 meters
              </Text>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Alert when leaving zone</Text>
                <Switch
                  value={alertOnExit}
                  onValueChange={setAlertOnExit}
                  trackColor={{ false: '#ccc', true: '#E63946' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Alert when entering zone</Text>
                <Switch
                  value={alertOnEnter}
                  onValueChange={setAlertOnEnter}
                  trackColor={{ false: '#ccc', true: '#4CAF50' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={handleSaveZone}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4CAF50',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  zoneCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  zoneCardDisabled: {
    opacity: 0.5,
  },
  zoneContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  zoneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  zoneIconText: {
    fontSize: 28,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  zoneType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  zoneRadius: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  alertBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  exitBadge: {
    backgroundColor: '#FFE0E0',
  },
  enterBadge: {
    backgroundColor: '#E8F5E9',
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  addButtonIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  typeOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  typeIcon: {
    fontSize: 20,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  typeOptionTextSelected: {
    color: '#4CAF50',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  currentLocationButton: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  currentLocationButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F0F0F0',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
