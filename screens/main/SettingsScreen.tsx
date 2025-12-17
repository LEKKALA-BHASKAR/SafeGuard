import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { saveLanguage } from '../../services/i18n';
import authService from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIVACY_SETTINGS_KEY = 'privacy_settings';

interface PrivacySettings {
  shareWithContacts: boolean;
  trackingDuration: number;
  allowBackgroundTracking: boolean;
  autoCallEnabled: boolean;
  voiceCommandEnabled: boolean;
}

interface SettingsScreenProps {
  onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: SettingsScreenProps) {
  const { t, i18n } = useTranslation();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    shareWithContacts: true,
    trackingDuration: 0,
    allowBackgroundTracking: true,
    autoCallEnabled: false,
    voiceCommandEnabled: false,
  });
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(PRIVACY_SETTINGS_KEY);
      if (stored) {
        setPrivacySettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const savePrivacySettings = async (newSettings: PrivacySettings) => {
    try {
      await AsyncStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(newSettings));
      setPrivacySettings(newSettings);
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      Alert.alert(t('error'), 'Failed to save settings');
    }
  };

  const handleToggle = (key: keyof PrivacySettings) => {
    const newSettings = {
      ...privacySettings,
      [key]: !privacySettings[key],
    };
    savePrivacySettings(newSettings);
  };

  const handleTrackingDurationChange = (duration: number) => {
    const newSettings = {
      ...privacySettings,
      trackingDuration: duration,
    };
    savePrivacySettings(newSettings);
  };

  const handleLanguageChange = async (lang: string) => {
    setSelectedLanguage(lang);
    await saveLanguage(lang);
    Alert.alert(t('success'), 'Language updated successfully');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            onLogout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Account deletion feature coming soon');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings')}</Text>
        <Text style={styles.subtitle}>Configure your preferences</Text>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('privacySettings')}</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>{t('shareWithContacts')}</Text>
            <Text style={styles.settingDescription}>
              Allow emergency contacts to see your location
            </Text>
          </View>
          <Switch
            value={privacySettings.shareWithContacts}
            onValueChange={() => handleToggle('shareWithContacts')}
            trackColor={{ false: '#ccc', true: '#E63946' }}
            thumbColor={privacySettings.shareWithContacts ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>{t('backgroundTracking')}</Text>
            <Text style={styles.settingDescription}>
              Enable location tracking in the background
            </Text>
          </View>
          <Switch
            value={privacySettings.allowBackgroundTracking}
            onValueChange={() => handleToggle('allowBackgroundTracking')}
            trackColor={{ false: '#ccc', true: '#E63946' }}
            thumbColor={privacySettings.allowBackgroundTracking ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Call on SOS</Text>
            <Text style={styles.settingDescription}>
              Automatically call first contact when SOS is triggered
            </Text>
          </View>
          <Switch
            value={privacySettings.autoCallEnabled}
            onValueChange={() => handleToggle('autoCallEnabled')}
            trackColor={{ false: '#ccc', true: '#E63946' }}
            thumbColor={privacySettings.autoCallEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Voice Commands</Text>
            <Text style={styles.settingDescription}>
              Enable voice-activated SOS (Coming Soon)
            </Text>
          </View>
          <Switch
            value={privacySettings.voiceCommandEnabled}
            onValueChange={() => handleToggle('voiceCommandEnabled')}
            trackColor={{ false: '#ccc', true: '#E63946' }}
            thumbColor={privacySettings.voiceCommandEnabled ? '#fff' : '#f4f3f4'}
            disabled
          />
        </View>

        <View style={styles.durationSetting}>
          <Text style={styles.settingLabel}>{t('trackingDuration')}</Text>
          <Text style={styles.settingDescription}>
            How long to share location (0 = unlimited)
          </Text>
          <View style={styles.durationButtons}>
            {[0, 15, 30, 60, 120].map((duration) => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.durationButton,
                  privacySettings.trackingDuration === duration && styles.durationButtonActive,
                ]}
                onPress={() => handleTrackingDurationChange(duration)}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    privacySettings.trackingDuration === duration && styles.durationButtonTextActive,
                  ]}
                >
                  {duration === 0 ? t('unlimited') : `${duration} ${t('minutes')}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Language Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <View style={styles.languageButtons}>
          {[
            { code: 'en', label: 'English' },
            { code: 'es', label: 'Español' },
            { code: 'hi', label: 'हिन्दी' },
          ].map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageButton,
                selectedLanguage === lang.code && styles.languageButtonActive,
              ]}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  selectedLanguage === lang.code && styles.languageButtonTextActive,
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Build</Text>
          <Text style={styles.aboutValue}>SafeGuard 2024</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Logout button"
          accessibilityRole="button"
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          accessibilityLabel="Delete account button"
          accessibilityRole="button"
        >
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          SafeGuard - Your Safety, Our Priority
        </Text>
        <Text style={styles.footerSubtext}>
          Built with ❤️ for safety and peace of mind
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#E63946',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  durationSetting: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  durationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  durationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  durationButtonActive: {
    backgroundColor: '#E63946',
    borderColor: '#E63946',
  },
  durationButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  durationButtonTextActive: {
    color: '#fff',
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8F9FA',
  },
  languageButtonActive: {
    backgroundColor: '#E63946',
    borderColor: '#E63946',
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  languageButtonTextActive: {
    color: '#fff',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  aboutLabel: {
    fontSize: 14,
    color: '#666',
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actions: {
    paddingHorizontal: 20,
    marginTop: 30,
    gap: 10,
  },
  logoutButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E63946',
  },
  deleteButtonText: {
    color: '#E63946',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
  },
});
