/**
 * Safe Zones Screen - Manage geofenced safe zones
 * Features: Home/work zones, enter/exit alerts, destination tracking
 * Storage: Firebase Firestore with offline caching
 */

import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import { getTheme } from '../../constants/theme';
import firebaseSafeZonesService, { SafeZone } from '../../services/firebaseSafeZonesService';

interface SafeZonesScreenProps {
  userId: string;
  currentLocation?: { latitude: number; longitude: number } | null;
}

export default function SafeZonesScreen({ userId, currentLocation }: SafeZonesScreenProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark');
  const styles = useMemo(() => createStyles(theme), [theme]);
  
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
    initializeZones();
    startGeofenceMonitoring();

    return () => {
      stopGeofenceMonitoring();
      firebaseSafeZonesService.unsubscribeFromZones();
    };
  }, []);

  const initializeZones = async () => {
    try {
      setLoading(true);
      await firebaseSafeZonesService.initialize();
      await loadZones();
    } catch (error) {
      console.error('Error initializing safe zones:', error);
      Alert.alert(t('error'), 'Failed to initialize safe zones');
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async () => {
    try {
      const fetchedZones = await firebaseSafeZonesService.getUserZones();
      setZones(fetchedZones);
    } catch (error) {
      console.error('Error loading safe zones:', error);
      // Try to use cached zones
      const cachedZones = firebaseSafeZonesService.getCachedZones();
      if (cachedZones.length > 0) {
        setZones(cachedZones);
      } else {
        Alert.alert(t('error'), 'Failed to load safe zones');
      }
    }
  };

  const startGeofenceMonitoring = async () => {
    if (Platform.OS === 'web') return;

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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

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

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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

    handleSaveZoneToFirebase(lat, lng, rad);
  };

  const handleSaveZoneToFirebase = async (lat: number, lng: number, rad: number) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (editingZone) {
        // Update existing zone
        await firebaseSafeZonesService.updateZone(editingZone.id, {
          name,
          type,
          location: { latitude: lat, longitude: lng },
          radius: rad,
          alertOnExit,
          alertOnEnter,
        });
      } else {
        // Add new zone
        const newZone: Omit<SafeZone, 'id' | 'userId'> = {
          name,
          type,
          location: { latitude: lat, longitude: lng },
          radius: rad,
          enabled: true,
          alertOnExit,
          alertOnEnter,
        };
        await firebaseSafeZonesService.addZone(newZone);
      }

      await loadZones();
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving zone:', error);
      Alert.alert(t('error'), 'Failed to save safe zone');
    }
  };

  const handleDeleteZone = (zone: SafeZone) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      'Delete Safe Zone',
      `Are you sure you want to delete "${zone.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseSafeZonesService.deleteZone(zone.id);
              await loadZones();
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              console.error('Error deleting zone:', error);
              Alert.alert(t('error'), 'Failed to delete safe zone');
            }
          },
        },
      ]
    );
  };

  const handleToggleZone = async (zone: SafeZone) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      await firebaseSafeZonesService.toggleZone(zone.id, !zone.enabled);
      await loadZones();
    } catch (error) {
      console.error('Error toggling zone:', error);
      Alert.alert(t('error'), 'Failed to update safe zone');
    }
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
          trackColor={{ false: theme.colors.border, true: theme.colors.success }}
          thumbColor={theme.colors.textInverse}
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
          scrollEnabled={true}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
          style={styles.flatList}
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
                placeholderTextColor={theme.colors.textTertiary}
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
                  placeholderTextColor={theme.colors.textTertiary}
                />
                <TextInput
                  style={[styles.input, styles.locationInput]}
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="Longitude"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
              
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={handleUseCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
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
                placeholderTextColor={theme.colors.textTertiary}
              />
              <Text style={styles.helperText}>
                Recommended: 50-200 meters
              </Text>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Alert when leaving zone</Text>
                <Switch
                  value={alertOnExit}
                  onValueChange={setAlertOnExit}
                  trackColor={{ false: theme.colors.border, true: theme.colors.error }}
                  thumbColor={theme.colors.textInverse}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Alert when entering zone</Text>
                <Switch
                  value={alertOnEnter}
                  onValueChange={setAlertOnEnter}
                  trackColor={{ false: theme.colors.border, true: theme.colors.success }}
                  thumbColor={theme.colors.textInverse}
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

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flatList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    backgroundColor: theme.colors.success,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textInverse,
    opacity: 0.9,
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
    color: theme.colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  zoneCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    marginBottom: 12,
    ...theme.shadows.small,
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
    backgroundColor: theme.colors.success + '20', // 20% opacity
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
    color: theme.colors.text,
    marginBottom: 4,
  },
  zoneType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  zoneRadius: {
    fontSize: 14,
    color: theme.colors.textTertiary,
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
    backgroundColor: theme.colors.error + '20',
  },
  enterBadge: {
    backgroundColor: theme.colors.success + '20',
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  addButtonIcon: {
    fontSize: 24,
    color: theme.colors.textInverse,
    fontWeight: 'bold',
  },
  addButtonText: {
    color: theme.colors.textInverse,
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    borderColor: theme.colors.border,
    gap: 8,
  },
  typeOptionSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '20',
  },
  typeIcon: {
    fontSize: 20,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  typeOptionTextSelected: {
    color: theme.colors.semantic.success,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  currentLocationButton: {
    backgroundColor: theme.colors.primary + '20',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  currentLocationButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: theme.colors.text,
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
    backgroundColor: theme.colors.background,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: theme.colors.success,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});
