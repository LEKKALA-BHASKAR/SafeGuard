import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import {
    Platform,
    StatusBar,
    StyleSheet,
    View,
    useColorScheme
} from 'react-native';
import { getTheme } from './constants/theme';
import { EnhancedEmergencyContact } from './screens/main/EnhancedContactsScreen';
import authService from './services/authService';
import i18n, { loadSavedLanguage } from './services/i18n';
import networkService from './services/networkService';

// Auth Screens
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';

// Main Screens
import EmergencyHistoryScreen from './screens/main/EmergencyHistoryScreen';
import EnhancedContactsScreen from './screens/main/EnhancedContactsScreen';
import EnhancedSOSScreen from './screens/main/EnhancedSOSScreen';
import HomeScreen from './screens/main/HomeScreen';
import ProfileScreen from './screens/main/ProfileScreen';
import SafeZonesScreen from './screens/main/SafeZonesScreen';
import SettingsScreen from './screens/main/SettingsScreen';

// Premium Screens
import FindMyFamilyScreen from './screens/main/FindMyFamilyScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function App() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userId, setUserId] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState<EnhancedEmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeApp = async () => {
      try {
        // Initialize network service
        await networkService.initialize();
        
        // Load saved language
        await loadSavedLanguage();

        // Check authentication status
        unsubscribe = authService.initAuthListener(async (user) => {
          console.log('[iOS Auth] Auth state changed:', user ? `User logged in: ${user.uid}` : 'User logged out');
          
          if (user) {
            console.log('[iOS Auth] Setting authenticated state for user:', user.displayName);
            setIsAuthenticated(true);
            setUserName(user.displayName || 'User');
            setUserId(user.uid);

            // Load user profile
            const profile = await authService.getUserProfile(user.uid);
            if (profile) {
              console.log('[iOS Auth] Profile loaded successfully');
            }
          } else {
            console.log('[iOS Auth] Clearing authenticated state');
            setIsAuthenticated(false);
            setUserName('User');
            setUserId('');
          }
          setLoading(false);
        });
      } catch (error) {
        console.error('[iOS Auth] Initialization error:', error);
        setLoading(false);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        console.log('[iOS Auth] Cleaning up auth listener');
        unsubscribe();
      }
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowRegister(false);
  };

  const handleRegisterSuccess = () => {
    setIsAuthenticated(true);
    setShowRegister(false);
  };

  const handleContactsChange = (contacts: EnhancedEmergencyContact[]) => {
    setEmergencyContacts(contacts);
  };

  if (loading) {
    return <View style={styles.container} />;
  }

  if (!isAuthenticated) {
    return (
      <I18nextProvider i18n={i18n}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <StatusBar 
            barStyle={colorScheme === 'dark' ? "light-content" : "dark-content"} 
            backgroundColor={theme.colors.background} 
          />
          {showRegister ? (
            <RegisterScreen
              onRegisterSuccess={handleRegisterSuccess}
              onNavigateToLogin={() => setShowRegister(false)}
            />
          ) : (
            <LoginScreen
              onLoginSuccess={handleLoginSuccess}
              onNavigateToRegister={() => setShowRegister(true)}
            />
          )}
        </View>
      </I18nextProvider>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <NavigationContainer theme={theme}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              height: Platform.OS === 'ios' ? 90 : 70,
              paddingBottom: Platform.OS === 'ios' ? 30 : 10,
              paddingTop: 10,
              elevation: 8,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
          }}
        >
          <Tab.Screen
            name="Home"
            options={{
              tabBarLabel: 'Map',
              tabBarIcon: ({ color }) => (
                <Ionicons name="location" size={24} color={color} />
              ),
            }}
          >
            {() => <HomeScreen userName={userName} />}
          </Tab.Screen>

          <Tab.Screen
            name="SOS"
            options={{
              tabBarLabel: 'Emergency',
              tabBarIcon: ({ color }) => (
                <Ionicons name="alert-circle" size={28} color={color} />
              ),
            }}
          >
            {() => <EnhancedSOSScreen userId={userId} userContacts={emergencyContacts} userName={userName} />}
          </Tab.Screen>

          <Tab.Screen
            name="Contacts"
            options={{
              tabBarLabel: 'Contacts',
              tabBarIcon: ({ color }) => (
                <Ionicons name="people" size={24} color={color} />
              ),
            }}
          >
            {() => <EnhancedContactsScreen onContactsChange={handleContactsChange} />}
          </Tab.Screen>

          <Tab.Screen
            name="History"
            options={{
              tabBarLabel: 'History',
              tabBarIcon: ({ color }) => (
                <Ionicons name="time" size={24} color={color} />
              ),
            }}
          >
            {() => <EmergencyHistoryScreen />}
          </Tab.Screen>

          <Tab.Screen
            name="SafeZones"
            options={{
              tabBarLabel: 'Safe Zones',
              tabBarIcon: ({ color }) => (
                <Ionicons name="shield-checkmark" size={24} color={color} />
              ),
            }}
          >
            {() => <SafeZonesScreen userId={userId} />}
          </Tab.Screen>

          <Tab.Screen
            name="Profile"
            options={{
              tabBarLabel: 'Profile',
              tabBarIcon: ({ color }) => (
                <Ionicons name="person" size={24} color={color} />
              ),
            }}
          >
            {() => <ProfileScreen userId={userId} />}
          </Tab.Screen>

          <Tab.Screen
            name="Family"
            options={{
              tabBarLabel: 'Family',
              tabBarIcon: ({ color }) => (
                <Ionicons name="people-circle" size={24} color={color} />
              ),
            }}
          >
            {() => <FindMyFamilyScreen />}
          </Tab.Screen>

          <Tab.Screen
            name="Settings"
            options={{
              tabBarLabel: 'Settings',
              tabBarIcon: ({ color }) => (
                <Ionicons name="settings" size={24} color={color} />
              ),
            }}
          >
            {() => <SettingsScreen onLogout={() => setIsAuthenticated(false)} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTabIcon: {
    backgroundColor: '#4fddefff',
    transform: [{ scale: 1.2 }],
  },
  icon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sosIcon: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
