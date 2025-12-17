import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

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

// Initialize Firebase Auth (persistence will default to memory on web, AsyncStorage on native)
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Cloud Functions
export const functions = getFunctions(app);

export default app;

