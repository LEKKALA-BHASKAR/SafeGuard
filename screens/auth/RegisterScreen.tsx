import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({ onRegisterSuccess, onNavigateToLogin }: RegisterScreenProps) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName || !email || !password || !confirmPassword) {
      Alert.alert(t('error'), 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('error'), 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('error'), 'Password should be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await authService.register(email, password, displayName);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        t('success'),
        'Account created successfully!',
        [{ text: 'OK', onPress: onRegisterSuccess }]
      );
    } else {
      Alert.alert(t('error'), result.error || t('genericError'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('register')}</Text>
          <Text style={styles.subtitle}>Create your SafeGuard account</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t('displayName')}
              placeholderTextColor="#999"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              accessibilityLabel="Full name input"
            />

            <TextInput
              style={styles.input}
              placeholder={t('email')}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Email input"
            />

            <TextInput
              style={styles.input}
              placeholder={t('password')}
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Password input"
            />

            <TextInput
              style={styles.input}
              placeholder={t('confirmPassword')}
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Confirm password input"
            />

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
              accessibilityLabel="Register button"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>{t('register')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={onNavigateToLogin}
              accessibilityLabel="Navigate to login"
              accessibilityRole="button"
            >
              <Text style={styles.loginLinkText}>
                Already have an account? {t('login')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#E63946',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 18,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  registerButton: {
    backgroundColor: '#E63946',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#E63946',
    fontSize: 14,
  },
});
