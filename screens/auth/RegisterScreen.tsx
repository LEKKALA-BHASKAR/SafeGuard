import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { getTheme } from '../../constants/theme';
import authService from '../../services/authService';

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({ onRegisterSuccess, onNavigateToLogin }: RegisterScreenProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark');
  const styles = useMemo(() => createStyles(theme), [theme]);

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
              placeholderTextColor={theme.colors.textTertiary}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              accessibilityLabel="Full name input"
            />

            <TextInput
              style={styles.input}
              placeholder={t('email')}
              placeholderTextColor={theme.colors.textTertiary}
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
              placeholderTextColor={theme.colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Password input"
            />

            <TextInput
              style={styles.input}
              placeholder={t('confirmPassword')}
              placeholderTextColor={theme.colors.textTertiary}
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
                <ActivityIndicator color={theme.colors.textInverse} />
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

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 18,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  },
  registerButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    ...theme.shadows.small,
  },
  registerButtonText: {
    color: theme.colors.textInverse,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
});
