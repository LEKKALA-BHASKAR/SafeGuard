/**
 * ProfileScreen - Comprehensive user profile management
 * Handles personal info, medical details, emergency preferences, and permissions
 */

import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import { getTheme } from '../../constants/theme';
import authService, { UserProfile } from '../../services/authService';
import otpService from '../../services/otpService';

interface ProfileScreenProps {
  userId: string;
  onProfileUpdated?: () => void;
}

export default function ProfileScreen({ userId, onProfileUpdated }: ProfileScreenProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark');
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  
  // OTP verification
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await authService.getUserProfile(userId);
      
      if (userProfile) {
        setProfile(userProfile);
        setDisplayName(userProfile.displayName || '');
        setPhoneNumber(userProfile.phoneNumber || '');
        setBloodGroup(userProfile.bloodGroup || '');
        setAllergies(userProfile.allergies?.join(', ') || '');
        setMedicalConditions(userProfile.medicalConditions?.join(', ') || '');
        setEmergencyNotes(userProfile.emergencyNotes || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert(t('error'), 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSaving(true);

      const updates: Partial<UserProfile> = {
        displayName,
        phoneNumber,
        bloodGroup,
        allergies: allergies ? allergies.split(',').map(a => a.trim()) : [],
        medicalConditions: medicalConditions ? medicalConditions.split(',').map(m => m.trim()) : [],
        emergencyNotes,
        updatedAt: Date.now(),
      };

      // Check if phone number changed
      if (phoneNumber !== profile?.phoneNumber) {
        updates.phoneVerified = false;
      }

      const success = await authService.updateUserProfile(userId, updates);

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('success'), 'Profile updated successfully');
        onProfileUpdated?.();
        loadProfile();
      } else {
        Alert.alert(t('error'), 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert(t('error'), 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      Alert.alert(t('error'), 'Please enter a phone number');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await otpService.sendOTP(phoneNumber, 'verification');
      
      if (result.success) {
        setOtpSent(true);
        setShowOTPInput(true);
        Alert.alert(t('success'), result.message);
      } else {
        Alert.alert(t('error'), result.message);
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      Alert.alert(t('error'), 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert(t('error'), 'Please enter a 6-digit OTP');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await otpService.verifyOTP(phoneNumber, otpCode);
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Update profile with verified phone
        await authService.verifyPhoneNumber(userId, phoneNumber);
        
        setShowOTPInput(false);
        setOtpCode('');
        setOtpSent(false);
        
        Alert.alert(t('success'), result.message, [
          { text: 'OK', onPress: () => handleSaveProfile() }
        ]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('error'), result.message);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      Alert.alert(t('error'), 'Failed to verify OTP');
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(t('error'), 'Permission to access gallery is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        // Note: Profile image upload requires Firebase Storage configuration
        // This would be implemented via Firebase Storage SDK and authService.updateProfile()
        console.log('Image selected for upload:', result.assets[0].uri);
        Alert.alert('Feature Coming Soon', 'Profile image upload will be available with Firebase Storage setup');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('error'), 'Failed to select image');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your personal information</Text>
      </View>

      {/* Profile Photo */}
      <View style={styles.photoSection}>
        <TouchableOpacity style={styles.photoContainer} onPress={handlePickImage}>
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Text style={styles.photoEditText}>✏️</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your full name"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={profile?.email}
            editable={false}
            placeholderTextColor={theme.colors.textTertiary}
          />
          <Text style={styles.helperText}>Email cannot be changed</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <View style={styles.phoneInputContainer}>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+1234567890"
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors.textTertiary}
            />
            {profile?.phoneVerified && phoneNumber === profile?.phoneNumber ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleSendOTP}
              >
                <Text style={styles.verifyButtonText}>Verify</Text>
              </TouchableOpacity>
            )}
          </View>
          {(!profile?.phoneVerified || phoneNumber !== profile?.phoneNumber) && (
            <Text style={styles.helperText}>Phone verification required for emergency features</Text>
          )}
        </View>

        {/* OTP Input */}
        {showOTPInput && (
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Enter OTP sent to {phoneNumber}</Text>
            <TextInput
              style={styles.otpInput}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor={theme.colors.textTertiary}
            />
            <TouchableOpacity
              style={styles.verifyOtpButton}
              onPress={handleVerifyOTP}
            >
              <Text style={styles.verifyOtpButtonText}>Verify OTP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendOTP}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Medical Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical Information</Text>
        <Text style={styles.sectionSubtitle}>
          This information will be shared with emergency contacts during SOS
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Blood Group</Text>
          <TextInput
            style={styles.input}
            value={bloodGroup}
            onChangeText={setBloodGroup}
            placeholder="e.g., O+, A-, AB+"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Allergies</Text>
          <TextInput
            style={styles.input}
            value={allergies}
            onChangeText={setAllergies}
            placeholder="e.g., Penicillin, Peanuts (comma separated)"
            multiline
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medical Conditions</Text>
          <TextInput
            style={styles.input}
            value={medicalConditions}
            onChangeText={setMedicalConditions}
            placeholder="e.g., Diabetes, Asthma (comma separated)"
            multiline
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Emergency Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={emergencyNotes}
            onChangeText={setEmergencyNotes}
            placeholder="Additional information for emergency responders..."
            multiline
            numberOfLines={4}
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSaveProfile}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Profile</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  photoSection: {
    alignItems: 'center',
    marginTop: -50,
    marginBottom: 24,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: theme.colors.surface,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.surface,
  },
  photoInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.semantic.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  photoEditText: {
    fontSize: 14,
  },
  section: {
    backgroundColor: theme.colors.card,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    ...theme.shadows.small,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
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
  inputDisabled: {
    backgroundColor: theme.colors.neutral[100],
    color: theme.colors.textTertiary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneInput: {
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: theme.colors.semantic.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifiedText: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  otpContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: theme.colors.semantic.warning + '20', // 20% opacity
    borderRadius: 12,
  },
  otpLabel: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 12,
    fontWeight: '500',
  },
  otpInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: theme.colors.semantic.warning,
    marginBottom: 12,
    color: theme.colors.text,
  },
  verifyOtpButton: {
    backgroundColor: theme.colors.semantic.warning,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  verifyOtpButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  resendText: {
    fontSize: 14,
    color: theme.colors.semantic.warning,
    textAlign: 'center',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.colors.textInverse,
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
