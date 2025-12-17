/**
 * Emergency History Screen - Track and view all SOS events
 * Features: Event timeline, location trails, downloadable reports
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const HISTORY_KEY = 'emergency_history';

export interface EmergencyEvent {
  id: string;
  type: 'SOS' | 'LOCATION_SHARE' | 'CHECK_IN' | 'SAFE_ZONE_EXIT';
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null;
  contactsNotified: number;
  status: 'sent' | 'delivered' | 'failed' | 'queued';
  networkStatus: 'online' | 'offline';
  silentMode: boolean;
  responseTime?: number;
  notes?: string;
  trail?: Array<{
    latitude: number;
    longitude: number;
    timestamp: number;
  }>;
}

interface EmergencyHistoryScreenProps {
  userId: string;
}

export default function EmergencyHistoryScreen({ userId }: EmergencyHistoryScreenProps) {
  const { t } = useTranslation();
  
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EmergencyEvent | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(HISTORY_KEY);
      
      if (stored) {
        const parsedEvents: EmergencyEvent[] = JSON.parse(stored);
        // Sort by timestamp (newest first)
        parsedEvents.sort((a, b) => b.timestamp - a.timestamp);
        setEvents(parsedEvents);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert(t('error'), 'Failed to load emergency history');
    } finally {
      setLoading(false);
    }
  };

  const saveHistory = async (newEvents: EmergencyEvent[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newEvents));
      setEvents(newEvents);
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  const addEvent = async (event: Omit<EmergencyEvent, 'id'>) => {
    const newEvent: EmergencyEvent = {
      ...event,
      id: Date.now().toString(),
    };

    const updatedEvents = [newEvent, ...events];
    await saveHistory(updatedEvents);
  };

  const deleteEvent = (eventId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this emergency event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedEvents = events.filter(e => e.id !== eventId);
            await saveHistory(updatedEvents);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const clearAllHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Clear All History',
      'This will permanently delete all emergency events. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(HISTORY_KEY);
            setEvents([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'All history cleared');
          },
        },
      ]
    );
  };

  const exportReport = async (event: EmergencyEvent) => {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const report = generateReport(event);
      
      if (Platform.OS === 'web') {
        // For web, use Share API
        await Share.share({
          message: report,
          title: `Emergency Report - ${new Date(event.timestamp).toLocaleDateString()}`,
        });
      } else {
        // For native, create a file and share
        const fileName = `emergency-report-${event.id}.txt`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, report);
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: 'Export Emergency Report',
          });
        } else {
          Alert.alert('Success', `Report saved to ${fileUri}`);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert(t('error'), 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const generateReport = (event: EmergencyEvent): string => {
    const lines = [
      '=================================',
      'EMERGENCY EVENT REPORT',
      '=================================',
      '',
      `Event ID: ${event.id}`,
      `Type: ${event.type}`,
      `Date: ${new Date(event.timestamp).toLocaleString()}`,
      `Status: ${event.status.toUpperCase()}`,
      '',
      '--- LOCATION ---',
      event.location
        ? `Coordinates: ${event.location.latitude.toFixed(6)}, ${event.location.longitude.toFixed(6)}`
        : 'Location unavailable',
      event.location?.accuracy
        ? `Accuracy: ${event.location.accuracy.toFixed(0)} meters`
        : '',
      event.location?.address ? `Address: ${event.location.address}` : '',
      '',
      '--- ALERT DETAILS ---',
      `Contacts Notified: ${event.contactsNotified}`,
      `Network Status: ${event.networkStatus}`,
      `Silent Mode: ${event.silentMode ? 'Yes' : 'No'}`,
      event.responseTime ? `Response Time: ${event.responseTime}ms` : '',
      '',
      event.notes ? `Notes: ${event.notes}` : '',
      '',
      event.trail && event.trail.length > 0 ? '--- LOCATION TRAIL ---' : '',
      ...(event.trail?.map((point, index) =>
        `${index + 1}. ${new Date(point.timestamp).toLocaleTimeString()} - ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
      ) || []),
      '',
      '=================================',
      'Generated by SafeGuard App',
      `Report Date: ${new Date().toLocaleString()}`,
      '=================================',
    ];

    return lines.filter(line => line !== undefined).join('\n');
  };

  const getEventIcon = (type: EmergencyEvent['type']) => {
    switch (type) {
      case 'SOS':
        return '🚨';
      case 'LOCATION_SHARE':
        return '📍';
      case 'CHECK_IN':
        return '✅';
      case 'SAFE_ZONE_EXIT':
        return '⚠️';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status: EmergencyEvent['status']) => {
    switch (status) {
      case 'sent':
        return '#2196F3';
      case 'delivered':
        return '#4CAF50';
      case 'failed':
        return '#E63946';
      case 'queued':
        return '#FF9800';
      default:
        return '#999';
    }
  };

  const renderEvent = ({ item }: { item: EmergencyEvent }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => setSelectedEvent(item)}
      onLongPress={() => deleteEvent(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.eventHeader}>
        <View style={styles.eventIconContainer}>
          <Text style={styles.eventIcon}>{getEventIcon(item.type)}</Text>
        </View>
        
        <View style={styles.eventInfo}>
          <Text style={styles.eventType}>{item.type.replace('_', ' ')}</Text>
          <Text style={styles.eventDate}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.eventDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Contacts:</Text>
          <Text style={styles.detailValue}>{item.contactsNotified}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Network:</Text>
          <Text style={styles.detailValue}>
            {item.networkStatus === 'online' ? '✓ Online' : '📵 Offline'}
          </Text>
        </View>

        {item.location && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.exportButton}
        onPress={() => exportReport(item)}
      >
        <Text style={styles.exportButtonText}>📄 Export Report</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency History</Text>
        <Text style={styles.headerSubtitle}>
          {events.length} {events.length === 1 ? 'event' : 'events'} recorded
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{events.filter(e => e.type === 'SOS').length}</Text>
          <Text style={styles.statLabel}>SOS Alerts</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {events.filter(e => e.status === 'delivered').length}
          </Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {events.filter(e => e.status === 'failed').length}
          </Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>

      {/* Events List */}
      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Emergency Events</Text>
          <Text style={styles.emptyText}>
            Your emergency history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Clear All Button */}
      {events.length > 0 && (
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={clearAllHistory}
        >
          <Text style={styles.clearAllButtonText}>Clear All History</Text>
        </TouchableOpacity>
      )}
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
    backgroundColor: '#E63946',
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E63946',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventIcon: {
    fontSize: 24,
  },
  eventInfo: {
    flex: 1,
  },
  eventType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  eventDate: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  eventDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  exportButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearAllButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#E63946',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  clearAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
