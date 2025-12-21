import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

// Firebase configuration from GoogleService-Info.plist
const firebaseConfig = {
  apiKey: "AIzaSyB17fbEfLxK_TDIu5lKQ9GU_97e4vIxc7M",
  authDomain: "blooddonationapp-83ff8.firebaseapp.com",
  projectId: "blooddonationapp-83ff8",
  storageBucket: "blooddonationapp-83ff8.firebasestorage.app",
  messagingSenderId: "630654135368",
  appId: "1:630654135368:ios:f792e88fb940e4405fbc7d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with proper persistence for React Native
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // For iOS/Android, use AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export { auth };

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Cloud Functions
export const functions = getFunctions(app);

export default app;

