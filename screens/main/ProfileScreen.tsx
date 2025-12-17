/**
 * ProfileScreen - Comprehensive user profile management
 * Handles personal info, medical details, emergency preferences, and permissions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import authService, { UserProfile } from '../../services/authService';
import otpService from '../../services/otpService';
import * as Haptics from 'expo-haptics';

interface ProfileScreenProps {
  userId: string;
  onProfileUpdated?: () => void;
}

export default function ProfileScreen({ userId, onProfileUpdated }: ProfileScreenProps) {
  const { t } = useTranslation();
  
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
        bloodGroup,
        allergies: allergies ? allergies.split(',').map(a => a.trim()) : [],
        medicalConditions: medicalConditions ? medicalConditions.split(',').map(m => m.trim()) : [],
        emergencyNotes,
        updatedAt: Date.now(),
      };

      // Check if phone number changed and needs verification
      if (phoneNumber !== profile?.phoneNumber) {
        if (!profile?.phoneVerified) {
          setShowOTPInput(true);
          return;
        }
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // TODO: Upload to Firebase Storage and update profile
        console.log('Image selected:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('error'), 'Failed to select image');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E63946" />
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
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={profile?.email}
            editable={false}
            placeholderTextColor="#999"
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
              placeholderTextColor="#999"
            />
            {profile?.phoneVerified ? (
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
          {!profile?.phoneVerified && (
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
              placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
    borderColor: '#fff',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  photoInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  photoEditText: {
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  inputDisabled: {
    backgroundColor: '#F0F0F0',
    color: '#999',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#E63946',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  otpContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
  },
  otpLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  otpInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
    marginBottom: 12,
  },
  verifyOtpButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  verifyOtpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendText: {
    fontSize: 14,
    color: '#FF9800',
    textAlign: 'center',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#E63946',
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
