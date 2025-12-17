# SafeGuard - Personal Safety & Emergency Assistance App

A cross-platform React Native mobile application for real-time location monitoring and emergency assistance, designed with a focus on user safety and women's safety.

## 🚨 Features

### Core Features
- **User Authentication**: Secure registration and login using Firebase Authentication
- **Real-Time Location Tracking**: Continuous GPS tracking with battery optimization
- **Emergency SOS Feature**: 
  - Single tap with confirmation
  - Long press (3 seconds) for auto-trigger
  - Optional voice command support (coming soon)
- **Emergency Contacts Management**: Add, verify, and manage trusted emergency contacts
- **Instant Alerts**: 
  - SMS alerts with location
  - Push notifications
  - Optional phone call initiation
- **Map Interface**: Real-time location visualization using React Native Maps
- **Offline Support**: SMS fallback when internet is unavailable
- **Multi-Language Support**: English, Spanish, Hindi (easily extensible)
- **Privacy Controls**: Granular control over location sharing and visibility

### Security Features
- Firebase Authentication with encrypted storage
- Secure data encryption for sensitive information
- Verified emergency contacts only
- Privacy-first design

### Performance Optimizations
- Low battery consumption with optimized tracking intervals
- Minimal data usage
- Reliable background location tracking
- Foreground service for Android

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Firebase account for authentication

## 🚀 Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd Helloworld
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase:**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Copy your Firebase configuration
   - Update `/config/firebase.ts` with your configuration:
   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

5. **Run on device/emulator:**
   - For iOS: `npm run ios`
   - For Android: `npm run android`
   - Or scan the QR code with Expo Go app

## 📱 App Structure

```
Helloworld/
├── App.tsx                           # Main app entry point
├── config/
│   └── firebase.ts                   # Firebase configuration
├── services/
│   ├── authService.ts               # Authentication service
│   ├── locationService.ts           # Location tracking service
│   ├── emergencyService.ts          # Emergency alert service
│   ├── encryptionService.ts         # Data encryption service
│   └── i18n.ts                      # Internationalization
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx          # Login screen
│   │   └── RegisterScreen.tsx       # Registration screen
│   └── main/
│       ├── HomeScreen.tsx           # Home with map and tracking
│       ├── SOSScreen.tsx            # Emergency SOS screen
│       └── ContactsScreen.tsx       # Emergency contacts management
└── package.json
```

## 🔧 Key Technologies

- **React Native**: Cross-platform mobile framework
- **Expo**: Development and build tooling
- **Firebase**: Authentication and database
- **React Navigation**: Navigation library
- **expo-location**: GPS and location tracking
- **expo-sms**: SMS messaging
- **react-native-maps**: Map visualization
- **expo-secure-store**: Encrypted storage
- **i18next**: Internationalization

## 🌍 Supported Languages

- English (en)
- Spanish (es)
- Hindi (hi)

To add more languages, edit `/services/i18n.ts`.

## 📖 Usage Guide

### For Users

1. **Registration/Login:**
   - Register with email and password
   - Create a strong password (minimum 6 characters)

2. **Add Emergency Contacts:**
   - Navigate to the Contacts tab
   - Add trusted contacts with name, phone number, and relationship
   - Verify contacts for added security

3. **Enable Location Tracking:**
   - Go to the Home tab
   - Toggle location tracking ON
   - Grant necessary permissions

4. **Emergency SOS:**
   - Navigate to the Emergency tab
   - Quick tap: Shows confirmation dialog
   - Long press (3 seconds): Auto-sends alert
   - Alert sends SMS to all emergency contacts with your live location

### Permissions Required

#### iOS:
- Location (Always) - For background tracking
- Contacts - To import emergency contacts
- Microphone - For voice commands (optional)

#### Android:
- Fine Location & Background Location
- SMS
- Phone Call
- Contacts
- Vibration

## 🔒 Privacy & Security

- All sensitive data is encrypted using expo-secure-store
- Location data is only shared with verified emergency contacts
- Users have full control over tracking duration and visibility
- Firebase Authentication ensures secure user management
- No location data is stored on external servers without consent

## ⚙️ Configuration Options

### Location Tracking Intervals

Edit `/services/locationService.ts` to adjust:
- **Foreground tracking**: Every 5 seconds / 10 meters
- **Background tracking**: Every 15 seconds / 50 meters (battery optimized)

### Privacy Settings

Users can configure:
- Who can see their location
- Tracking duration (limited or unlimited)
- Background tracking permission

## 🐛 Troubleshooting

### Location not updating:
- Ensure location permissions are granted (Always for background)
- Check GPS is enabled on device
- Verify internet connection for map display

### SMS not sending:
- Verify SMS permissions are granted
- Check phone number format includes country code
- Ensure device has SMS capability

### Firebase errors:
- Verify Firebase configuration in `/config/firebase.ts`
- Check Firebase project settings
- Enable Email/Password authentication in Firebase Console

## 🚀 Building for Production

### Android:
```bash
expo build:android
```

### iOS:
```bash
expo build:ios
```

Or use EAS Build:
```bash
eas build --platform android
eas build --platform ios
```

## ✅ Implemented Features

- [x] **Fake call escape feature** - Schedule fake calls to escape uncomfortable situations
- [x] **Geofencing and safe zones** - Mark safe locations with entry/exit alerts  
- [x] **Enhanced SOS** - Multiple triggers (tap, long-press, shake-to-SOS)
- [x] **Emergency history** - Track all SOS events with exportable reports
- [x] **Location sharing** - Real-time location sharing with trusted contacts
- [x] **Offline support** - SMS fallback when internet is unavailable
- [x] **Multi-language** - English, Spanish, Hindi support

## 📝 Future Enhancements

- [ ] Voice-activated SOS command (framework ready)
- [ ] Integration with emergency services APIs (911, 112)
- [ ] Recording and evidence capture
- [ ] Community safety features
- [ ] Integration with wearable devices
- [ ] Offline maps for better offline support
- [ ] Advanced analytics and safety insights
- [ ] Apple/Google Sign-In (OAuth ready)

## 🤝 Contributing

This is a safety-critical application. If you'd like to contribute:
1. Test thoroughly on both iOS and Android
2. Ensure accessibility compliance
3. Follow security best practices
4. Document all changes

## 📄 License

This project is created for educational and safety purposes.

## ⚠️ Disclaimer

This app is designed to assist in emergency situations but should not be relied upon as the sole means of emergency communication. Always call local emergency services (911, 112, etc.) in life-threatening situations.

## 🆘 Emergency Numbers

- USA: 911
- India: 112, 100 (Police), 108 (Ambulance)
- UK: 999, 112
- Australia: 000
- EU: 112

---

**Built with ❤️ for safety and peace of mind**
