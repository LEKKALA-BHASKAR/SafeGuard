import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { getTheme } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface FeatureCard {
  id: string;
  title: string;
  icon: string;
  description: string;
  premium: boolean;
  screen?: string;
  color: string;
}

const PremiumFeaturesScreen: React.FC = () => {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark');
  const styles = useMemo(() => createStyles(theme), [theme]);

  const features: FeatureCard[] = [
    {
      id: 'location-sharing',
      title: 'Live Location Sharing',
      icon: '📍',
      description: 'Share your real-time location with trusted contacts via secure links',
      premium: true,
      screen: 'LocationSharing',
      color: theme.colors.primary,
    },
    {
      id: 'check-in',
      title: 'Check-In Timer',
      icon: '⏰',
      description: 'Set timers and auto-alert contacts if you don\'t check in',
      premium: true,
      screen: 'CheckIn',
      color: theme.colors.success,
    },
    {
      id: 'fake-call',
      title: 'Fake Call Escape',
      icon: '📞',
      description: 'Simulate incoming calls to escape uncomfortable situations',
      premium: true,
      screen: 'FakeCall',
      color: theme.colors.warning,
    },
    {
      id: 'safe-zones',
      title: 'Safe Zones (Geofencing)',
      icon: '🏠',
      description: 'Set up safe zones and get alerts when entering/leaving',
      premium: true,
      screen: 'SafeZones',
      color: '#9C27B0',
    },
    {
      id: 'panic-recording',
      title: 'Emergency Recording',
      icon: '🎙️',
      description: 'Auto-record audio/video during emergencies, uploaded to cloud',
      premium: true,
      screen: 'PanicRecording',
      color: theme.colors.error,
    },
    {
      id: 'journey-tracking',
      title: 'Journey Tracking',
      icon: '🗺️',
      description: 'Track your route with breadcrumbs and share ETA with contacts',
      premium: true,
      screen: 'JourneyTracking',
      color: theme.colors.info,
    },
    {
      id: 'ai-threat',
      title: 'AI Threat Detection',
      icon: '🤖',
      description: 'ML-powered detection of unusual patterns and potential threats',
      premium: true,
      screen: 'ThreatDetection',
      color: '#673AB7',
    },
    {
      id: 'offline-mode',
      title: 'Offline Mode',
      icon: '📴',
      description: 'Queue alerts when offline, auto-sync when connected',
      premium: true,
      screen: 'OfflineMode',
      color: '#607D8B',
    },
    {
      id: 'voice-commands',
      title: 'Voice Commands',
      icon: '🗣️',
      description: 'Hands-free SOS activation with voice recognition',
      premium: true,
      screen: 'VoiceCommands',
      color: '#00BCD4',
    },
    {
      id: 'group-safety',
      title: 'Group Safety',
      icon: '👥',
      description: 'Create safety groups and monitor multiple people simultaneously',
      premium: true,
      screen: 'GroupSafety',
      color: '#8BC34A',
    },
    {
      id: 'analytics',
      title: 'Safety Analytics',
      icon: '📊',
      description: 'View your safety patterns, location history, and insights',
      premium: true,
      screen: 'Analytics',
      color: '#FFC107',
    },
    {
      id: 'wearable',
      title: 'Wearable Integration',
      icon: '⌚',
      description: 'Connect to Apple Watch or Android Wear for quick SOS',
      premium: true,
      screen: 'Wearable',
      color: '#FF5722',
    },
  ];

  const handleFeatureTap = (feature: FeatureCard) => {
    if (feature.screen) {
      // navigation.navigate(feature.screen as never);
      console.log(`Navigate to ${feature.screen}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✨ Premium Features</Text>
        <Text style={styles.headerSubtitle}>
          Advanced safety features for maximum protection
        </Text>
        <View style={styles.pricingBadge}>
          <Text style={styles.pricingText}>Enterprise Edition</Text>
          <Text style={styles.pricingAmount}>$70,000 Value</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Stats Overview */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12+</Text>
            <Text style={styles.statLabel}>Premium Features</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>24/7</Text>
            <Text style={styles.statLabel}>Monitoring</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>99.9%</Text>
            <Text style={styles.statLabel}>Uptime</Text>
          </View>
        </View>

        {/* Feature Cards */}
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.featureCard}
              onPress={() => handleFeatureTap(feature)}
              activeOpacity={0.7}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: feature.color }]}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
              </View>
              
              <View style={styles.featureContent}>
                <View style={styles.featureHeader}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  {feature.premium && (
                    <View style={styles.premiumBadge}>
                      <Text style={styles.premiumText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>

              <View style={styles.featureArrow}>
                <Text style={styles.arrowIcon}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Value Proposition */}
        <View style={styles.valueCard}>
          <Text style={styles.valueTitle}>💎 Enterprise-Grade Security</Text>
          <View style={styles.valueList}>
            <Text style={styles.valueItem}>✓ Military-grade encryption (AES-256)</Text>
            <Text style={styles.valueItem}>✓ Cloud backup with 99.999% durability</Text>
            <Text style={styles.valueItem}>✓ Machine learning threat detection</Text>
            <Text style={styles.valueItem}>✓ Real-time location tracking (10s updates)</Text>
            <Text style={styles.valueItem}>✓ Multi-platform support (iOS, Android, Web)</Text>
            <Text style={styles.valueItem}>✓ Priority emergency response integration</Text>
            <Text style={styles.valueItem}>✓ Custom white-label deployment available</Text>
            <Text style={styles.valueItem}>✓ 24/7 enterprise support</Text>
          </View>
        </View>

        {/* Technical Specs */}
        <View style={styles.techCard}>
          <Text style={styles.techTitle}>⚙️ Technical Specifications</Text>
          <View style={styles.techGrid}>
            <View style={styles.techItem}>
              <Text style={styles.techLabel}>Location Accuracy</Text>
              <Text style={styles.techValue}>±10 meters</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techLabel}>Update Frequency</Text>
              <Text style={styles.techValue}>3-10 seconds</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techLabel}>Battery Impact</Text>
              <Text style={styles.techValue}>5% per hour</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techLabel}>Data Encryption</Text>
              <Text style={styles.techValue}>AES-256</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techLabel}>Cloud Storage</Text>
              <Text style={styles.techValue}>Firebase</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techLabel}>Offline Support</Text>
              <Text style={styles.techValue}>Full Queue</Text>
            </View>
          </View>
        </View>

        {/* Use Cases */}
        <View style={styles.useCaseCard}>
          <Text style={styles.useCaseTitle}>🎯 Perfect For</Text>
          <View style={styles.useCaseList}>
            {[
              'Personal Safety & Security',
              'Elderly Care & Monitoring',
              'Lone Worker Protection',
              'Child Safety Tracking',
              'Fleet Management',
              'Emergency Response Teams',
              'High-Risk Professions',
              'Travel Safety',
            ].map((useCase, index) => (
              <View key={index} style={styles.useCaseItem}>
                <Text style={styles.useCaseBullet}>•</Text>
                <Text style={styles.useCaseText}>{useCase}</Text>
              </View>
            ))}
          </View>
        </View>
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
    backgroundColor: theme.colors.primary,
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textInverse,
    opacity: 0.9,
    marginBottom: 15,
  },
  pricingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  pricingAmount: {
    color: theme.colors.textInverse,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
  },
  statsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    marginBottom: 15,
    ...theme.shadows.small,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 10,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    ...theme.shadows.small,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 8,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  featureDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  featureArrow: {
    marginLeft: 10,
  },
  arrowIcon: {
    fontSize: 24,
    color: theme.colors.textTertiary,
  },
  valueCard: {
    backgroundColor: theme.colors.neutral[900],
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
    marginBottom: 15,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    marginBottom: 15,
  },
  valueList: {
    gap: 10,
  },
  valueItem: {
    fontSize: 14,
    color: theme.colors.textInverse,
    lineHeight: 20,
  },
  techCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    ...theme.shadows.small,
  },
  techTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 15,
  },
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  techItem: {
    width: (width - 70) / 2,
  },
  techLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  techValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  useCaseCard: {
    backgroundColor: theme.colors.blue[50],
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  useCaseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.blue[700],
    marginBottom: 15,
  },
  useCaseList: {
    gap: 10,
  },
  useCaseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  useCaseBullet: {
    fontSize: 20,
    color: theme.colors.blue[700],
    marginRight: 10,
  },
  useCaseText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.blue[900],
    lineHeight: 20,
  },
});

export default PremiumFeaturesScreen;
