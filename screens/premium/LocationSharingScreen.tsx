import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { getTheme } from '../../constants/theme';
import locationSharingService, { LocationShare } from '../../services/locationSharingService';

const LocationSharingScreen: React.FC = () => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark');
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeShares, setActiveShares] = useState<LocationShare[]>([]);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [duration, setDuration] = useState('60');
  const [maxViews, setMaxViews] = useState('');
  const [limitViews, setLimitViews] = useState(false);

  useEffect(() => {
    loadActiveShares();
    const interval = setInterval(loadActiveShares, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveShares = () => {
    setActiveShares(locationSharingService.getActiveShares());
  };

  const handleCreateShare = async () => {
    if (!recipientName.trim()) {
      Alert.alert('Error', 'Please enter recipient name');
      return;
    }

    try {
      const durationMinutes = parseInt(duration) || 60;
      const maxViewsNum = limitViews && maxViews ? parseInt(maxViews) : undefined;

      const { shareUrl, shareCode } = await locationSharingService.createShare(
        durationMinutes,
        recipientName,
        recipientPhone || undefined,
        maxViewsNum
      );

      Alert.alert(
        '✅ Location Sharing Created',
        `Share Code: ${shareCode}\n\nWould you like to send this via SMS?`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Send SMS',
            onPress: () => handleSendSMS(shareUrl, shareCode),
          },
          {
            text: 'Copy Link',
            onPress: () => handleCopyLink(shareUrl),
          },
        ]
      );

      // Reset form
      setRecipientName('');
      setRecipientPhone('');
      setDuration('60');
      setMaxViews('');
      setLimitViews(false);

      loadActiveShares();
    } catch (error) {
      Alert.alert('Error', 'Failed to create location share');
      console.error(error);
    }
  };

  const handleSendSMS = async (shareUrl: string, shareCode: string) => {
    if (!recipientPhone) {
      Alert.alert('Error', 'Phone number required to send SMS');
      return;
    }

    const success = await locationSharingService.sendShareViaSMS(
      activeShares[0]?.id,
      recipientPhone,
      `Hi ${recipientName}, I'm sharing my live location with you. Track me at: ${shareUrl}\n\nCode: ${shareCode}`
    );

    if (success) {
      Alert.alert('Success', 'SMS sent successfully');
    }
  };

  const handleCopyLink = async (url: string) => {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(url);
      Alert.alert('Copied', 'Share link copied to clipboard');
    } else {
      await Share.share({ message: url });
    }
  };

  const handleStopShare = async (shareId: string) => {
    Alert.alert(
      'Stop Sharing?',
      'This will end location sharing for this link',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            await locationSharingService.stopShare(shareId);
            loadActiveShares();
          },
        },
      ]
    );
  };

  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 Live Location Sharing</Text>
        <Text style={styles.subtitle}>
          Share your real-time location with trusted contacts
        </Text>
      </View>

      {/* Create New Share */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create New Share</Text>

        <TextInput
          style={styles.input}
          placeholder="Recipient Name *"
          value={recipientName}
          onChangeText={setRecipientName}
          placeholderTextColor={theme.colors.textTertiary}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number (optional)"
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          keyboardType="phone-pad"
          placeholderTextColor={theme.colors.textTertiary}
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <View style={styles.halfInput}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Limit Views</Text>
              <Switch
                value={limitViews}
                onValueChange={setLimitViews}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>
            {limitViews && (
              <TextInput
                style={styles.input}
                placeholder="Max views"
                value={maxViews}
                onChangeText={setMaxViews}
                keyboardType="number-pad"
                placeholderTextColor={theme.colors.textTertiary}
              />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateShare}
        >
          <Text style={styles.createButtonText}>Create Share Link</Text>
        </TouchableOpacity>
      </View>

      {/* Active Shares */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active Shares ({activeShares.length})</Text>

        {activeShares.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active location shares</Text>
            <Text style={styles.emptySubtext}>
              Create a share link to let others track your location
            </Text>
          </View>
        ) : (
          activeShares.map((share) => {
            const timeRemaining = locationSharingService.getTimeRemaining(share.id);
            
            return (
              <View key={share.id} style={styles.shareItem}>
                <View style={styles.shareHeader}>
                  <Text style={styles.shareName}>
                    {share.recipientName || 'Unknown'}
                  </Text>
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Active</Text>
                  </View>
                </View>

                <View style={styles.shareDetails}>
                  <Text style={styles.shareCode}>Code: {share.shareCode}</Text>
                  <Text style={styles.shareTime}>
                    ⏱ {formatTimeRemaining(timeRemaining)} remaining
                  </Text>
                  <Text style={styles.shareViews}>
                    👁 {share.viewCount} views
                    {share.maxViews ? ` (max ${share.maxViews})` : ''}
                  </Text>
                </View>

                {share.lastLocation && (
                  <Text style={styles.shareLocation}>
                    📍 {share.lastLocation.latitude.toFixed(4)}, {share.lastLocation.longitude.toFixed(4)}
                  </Text>
                )}

                <View style={styles.shareActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.extendButton]}
                    onPress={() => locationSharingService.extendShare(share.id, 30)}
                  >
                    <Text style={styles.actionButtonText}>+30 min</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.stopButton]}
                    onPress={() => handleStopShare(share.id)}
                  >
                    <Text style={styles.actionButtonText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Features Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>✨ Features</Text>
        <Text style={styles.infoItem}>• Real-time location updates every 10 seconds</Text>
        <Text style={styles.infoItem}>• Secure shareable links with unique codes</Text>
        <Text style={styles.infoItem}>• Automatic expiration after set duration</Text>
        <Text style={styles.infoItem}>• View count tracking and limits</Text>
        <Text style={styles.infoItem}>• SMS sharing for easy distribution</Text>
      </View>
    </ScrollView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textInverse,
    opacity: 0.9,
  },
  card: {
    backgroundColor: theme.colors.card,
    margin: 15,
    padding: 20,
    borderRadius: 12,
    ...theme.shadows.small,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 15,
  },
  input: {
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 5,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  shareItem: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 15,
    marginTop: 15,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shareName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.semantic.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.semantic.success,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.semantic.success,
    fontWeight: '500',
  },
  shareDetails: {
    marginBottom: 10,
  },
  shareCode: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  shareTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  shareViews: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  shareLocation: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  shareActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  extendButton: {
    backgroundColor: theme.colors.semantic.success,
  },
  stopButton: {
    backgroundColor: theme.colors.semantic.error,
  },
  actionButtonText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: theme.colors.semantic.warning + '20',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.semantic.warning,
    marginBottom: 10,
  },
  infoItem: {
    fontSize: 14,
    color: theme.colors.semantic.warning,
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default LocationSharingScreen;
