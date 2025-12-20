

import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { getTheme } from '../../constants/theme';
import firebaseHistoryService, { EmergencyEvent } from '../../services/firebaseHistoryService';

export default function EmergencyHistoryScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark');
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EmergencyEvent | null>(null);

  useEffect(() => {
    initializeHistory();
  }, []);

  const initializeHistory = async () => {
    try {
      setLoading(true);
      await firebaseHistoryService.initialize();
      await loadHistory();
    } catch (error) {
      console.error('Error initializing history:', error);
      Alert.alert(t('error'), 'Failed to initialize emergency history');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const fetchedEvents = await firebaseHistoryService.getUserEvents();
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error loading history:', error);
      // Try to use cached events
      const cachedEvents = firebaseHistoryService.getCachedEvents();
      if (cachedEvents.length > 0) {
        setEvents(cachedEvents);
      } else {
        Alert.alert(t('error'), 'Failed to load emergency history');
      }
    }
  };

  const addEvent = async (event: Omit<EmergencyEvent, 'id' | 'userId'>) => {
    try {
      await firebaseHistoryService.addEvent(event);
      await loadHistory();
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert(t('error'), 'Failed to add emergency event');
    }
  };

  const deleteEvent = (eventId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this emergency event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseHistoryService.deleteEvent(eventId);
              await loadHistory();
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert(t('error'), 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const clearAllHistory = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      'Clear All History',
      'This will permanently delete all emergency events. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseHistoryService.clearHistory();
              setEvents([]);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert('Success', 'All history cleared');
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert(t('error'), 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  const exportReport = async (event: EmergencyEvent) => {
    try {
      setExporting(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const report = generateReport(event);
      
      if (Platform.OS === 'web') {
        // For web, use Share API
        await Share.share({
          message: report,
          title: `Emergency Report - ${new Date(event.timestamp).toLocaleDateString()}`,
        });
      } else {
        // For native, create a file and share
        const FileSystem = require('expo-file-system');
        const fileName = `emergency-report-${event.id}.txt`;
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(filePath, report);
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'text/plain',
            dialogTitle: 'Export Emergency Report',
          });
        } else {
          Alert.alert('Success', `Report saved to ${filePath}`);
        }
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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
        return theme.colors.info;
      case 'delivered':
        return theme.colors.success;
      case 'failed':
        return theme.colors.error;
      case 'queued':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
          scrollEnabled={true}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
          style={styles.flatList}
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
    backgroundColor: theme.colors.primary,
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
    color: theme.colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.small,
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
    backgroundColor: theme.colors.primary + '20', // 20% opacity
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
    color: theme.colors.text,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  eventDate: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textInverse,
    textTransform: 'uppercase',
  },
  eventDetails: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  exportButton: {
    backgroundColor: theme.colors.info,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  clearAllButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.error,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: theme.colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  clearAllButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
