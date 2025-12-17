import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  StatusBar,
  Text,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { I18nextProvider } from 'react-i18next';
import i18n, { loadSavedLanguage } from './services/i18n';
import authService from './services/authService';
import networkService from './services/networkService';

// Auth Screens
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';

// Main Screens
import HomeScreen from './screens/main/HomeScreen';
import ProfileScreen from './screens/main/ProfileScreen';
import EnhancedContactsScreen from './screens/main/EnhancedContactsScreen';
import EnhancedSOSScreen from './screens/main/EnhancedSOSScreen';
import EmergencyHistoryScreen from './screens/main/EmergencyHistoryScreen';
import SafeZonesScreen from './screens/main/SafeZonesScreen';
import FakeCallScreen from './screens/main/FakeCallScreen';
import SettingsScreen from './screens/main/SettingsScreen';

// Premium Screens
import LocationSharingScreen from './screens/premium/LocationSharingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userId, setUserId] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Initialize network service
    await networkService.initialize();
    
    // Load saved language
    await loadSavedLanguage();

    // Check authentication status
    const unsubscribe = authService.initAuthListener(async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserName(user.displayName || 'User');
        setUserId(user.uid);

        // Load user profile
        const profile = await authService.getUserProfile(user.uid);
        if (profile) {
          // Profile loaded
        }
      } else {
        setIsAuthenticated(false);
        setUserId('');
      }
      setLoading(false);
    });

    return unsubscribe;
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowRegister(false);
  };

  const handleRegisterSuccess = () => {
    setIsAuthenticated(true);
    setShowRegister(false);
  };

  const handleContactsChange = (contacts: EmergencyContact[]) => {
    setEmergencyContacts(contacts);
  };

  if (loading) {
    return <View style={styles.container} />;
  }

  if (!isAuthenticated) {
    return (
      <I18nextProvider i18n={i18n}>
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#E63946" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#E63946',
            tabBarInactiveTintColor: '#999',
            tabBarStyle: {
              height: Platform.OS === 'ios' ? 90 : 70,
              paddingBottom: Platform.OS === 'ios' ? 30 : 10,
              paddingTop: 10,
              elevation: 8,
              shadowColor: '#000',
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
            {() => <EnhancedSOSScreen userId={userId} />}
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
            {() => <EnhancedContactsScreen userId={userId} />}
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
            {() => <EmergencyHistoryScreen userId={userId} />}
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
            name="FakeCall"
            options={{
              tabBarLabel: 'Escape',
              tabBarIcon: ({ color }) => (
                <Ionicons name="call" size={24} color={color} />
              ),
            }}
          >
            {() => <FakeCallScreen userId={userId} />}
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
            name="Sharing"
            options={{
              tabBarLabel: 'Premium',
              tabBarIcon: ({ color }) => (
                <Ionicons name="star" size={24} color={color} />
              ),
            }}
          >
            {() => <LocationSharingScreen userId={userId} />}
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
    backgroundColor: '#E63946',
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
