# 🛡️ SafeGuard - Personal Safety & Emergency Assistance App

<div align="center">

![SafeGuard Logo](assets/icon.png)

**A premium, cross-platform, real-time safety & emergency assistance system**

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Enabled-orange.svg)](https://firebase.google.com/)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Web-lightgrey.svg)]()

*Your Safety, Our Priority* 🚨

</div>

---

## 📱 Overview

SafeGuard is a **production-ready**, cross-platform safety and emergency assistance application built with React Native and Expo. Designed with a focus on **women's safety**, personal emergencies, and real-world usability, SafeGuard provides comprehensive emergency response capabilities that work seamlessly on iOS, Android, and Web.

### ✨ Key Highlights

- 🚨 **Multiple SOS Triggers** - One-tap, long-press, shake-to-SOS
- 📍 **Real-Time GPS Tracking** - High-accuracy, battery-optimized location services
- 📱 **Cross-Platform** - iOS, Android, and Web with consistent UX
- 🔒 **Security-First** - AES-256 encryption, secure authentication
- 🌐 **Offline Support** - SMS fallback when internet is unavailable
- 🎨 **Premium UI/UX** - Modern, emergency-first design with haptic feedback

---

## 🚀 Features

### 🔐 Authentication & Identity
- Secure email/password authentication via Firebase
- OTP verification for phone numbers
- Session persistence with encrypted storage
- Strong password validation
- Biometric support ready (Face ID / Fingerprint)

### 👥 Emergency Contacts
- Add unlimited emergency contacts
- **OTP verification** for each contact
- Contact roles: Primary, Secondary, Tertiary
- Import from device contacts
- Only verified contacts receive SOS alerts

### 🚨 SOS Emergency System
**Multiple trigger methods:**
- **One-tap SOS** with confirmation dialog
- **Long-press (3 seconds)** with visual countdown
- **Shake-to-SOS** using accelerometer
- **Silent mode** for discreet alerts

**When triggered:**
- ✅ Instantly fetches GPS location
- ✅ Sends SMS alerts to all verified contacts
- ✅ Optional auto-call to primary contact
- ✅ Visual feedback with haptics and animations
- ✅ Works offline via SMS fallback

### 📍 Real-Time Location
- High-accuracy GPS tracking
- Foreground & background tracking
- Battery-optimized intervals:
  - Foreground: 5s / 10m
  - Background: 15s / 50m
- Interactive map with native maps (iOS/Android) and Google Maps (Web)

### 🏠 Safe Zones
- Mark safe locations (Home, Work, School, etc.)
- Geofencing with entry/exit alerts
- Custom radius configuration
- Visual safe zone indicators on map

### 📞 Fake Call Escape
- Schedule fake incoming calls
- Quick escape call (2 seconds)
- Custom caller names and numbers
- Realistic call interface
- Perfect for uncomfortable situations

### 📊 Emergency History
- Complete SOS event timeline
- Location trail during emergencies
- Contact response status
- **Export reports** (PDF/TXT)
- Clear history with confirmation

### ⚙️ Settings & Privacy
- Granular privacy controls
- Language selection (English, Spanish, Hindi)
- Background tracking toggle
- Auto-call configuration
- Theme support (Light/Dark ready)

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.81.5 |
| Platform | Expo SDK 54 |
| Language | TypeScript 5.9 |
| Navigation | React Navigation 7 |
| Backend | Firebase (Auth, Firestore) |
| Maps | react-native-maps, Google Maps |
| Location | expo-location |
| SMS | expo-sms |
| Storage | AsyncStorage, SecureStore |
| Encryption | expo-crypto (AES-256) |
| i18n | i18next, react-i18next |
| Haptics | expo-haptics |

---

## 📂 Project Structure

```
SafeGuard/
├── App.tsx                    # Main entry point
├── config/
│   └── firebase.ts           # Firebase configuration
├── constants/
│   └── theme.ts              # Theme configuration
├── services/
│   ├── authService.ts        # Authentication
│   ├── locationService.ts    # Location tracking
│   ├── emergencyService.ts   # Emergency alerts
│   ├── encryptionService.ts  # Data encryption
│   ├── networkService.ts     # Network monitoring
│   ├── otpService.ts         # OTP verification
│   ├── fakeCallService.ts    # Fake call feature
│   ├── checkInService.ts     # Check-in system
│   └── i18n.ts               # Internationalization
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── main/
│   │   ├── HomeScreen.tsx
│   │   ├── EnhancedSOSScreen.tsx
│   │   ├── EnhancedContactsScreen.tsx
│   │   ├── SafeZonesScreen.tsx
│   │   ├── FakeCallScreen.tsx
│   │   ├── EmergencyHistoryScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── premium/
│   │   └── LocationSharingScreen.tsx
│   └── admin/
│       └── AdminDashboardScreen.tsx
├── components/
│   ├── MapComponent.tsx
│   ├── NativeMap.tsx
│   └── WebMap.tsx
└── hooks/
    ├── use-color-scheme.ts
    └── use-theme-color.ts
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Firebase account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/LEKKALA-BHASKAR/SafeGuard.git
   cd SafeGuard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase:**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Email/Password Authentication
   - Enable Firestore Database
   - Update `config/firebase.ts` with your credentials

4. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Update with your API keys

5. **Start the development server:**
   ```bash
   npm start
   ```

6. **Run on platform:**
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android

   # Web
   npm run web
   ```

---

## 📱 Usage Guide

### 1. Registration & Login
- Register with email and password
- Verify your phone number with OTP
- Complete your profile with emergency details

### 2. Add Emergency Contacts
- Navigate to the **Contacts** tab
- Add trusted contacts with phone numbers
- **Verify each contact** via OTP
- Set contact roles (Primary, Secondary)

### 3. Configure Safe Zones
- Go to **Safe Zones** tab
- Add locations like Home, Work, School
- Enable entry/exit alerts

### 4. Using SOS
- **Quick tap**: Shows confirmation, then sends
- **Long press (3s)**: Auto-sends with countdown
- **Shake**: Triggers with confirmation
- **Silent mode**: Discreet alerts without sound

### 5. Fake Call Feature
- Navigate to **Escape** tab
- Select caller and delay time
- Use quick call for immediate fake call

---

## 🔒 Security & Privacy

- **AES-256 Encryption** for sensitive data
- **Firebase Authentication** for secure login
- **Secure Storage** for credentials
- **No location sharing** without explicit consent
- **Verified contacts only** receive alerts
- **Zero vulnerabilities** (CodeQL verified)

---

## 🌍 Supported Languages

- 🇺🇸 English
- 🇪🇸 Spanish (Español)
- 🇮🇳 Hindi (हिन्दी)

Add more languages in `services/i18n.ts`

---

## 📦 Building for Production

### Using EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Local Build

```bash
# Android APK
expo build:android

# iOS IPA
expo build:ios
```

---

## 🧪 Testing

```bash
# Run linting
npm run lint

# Type check
npx tsc --noEmit
```

---

## 📄 Documentation

| Document | Description |
|----------|-------------|
| [QUICK_START.md](QUICK_START.md) | Quick setup guide |
| [FIREBASE_SETUP.md](FIREBASE_SETUP.md) | Firebase configuration |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | QA procedures |
| [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) | Deployment guide |
| [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md) | Feature summary |

---

## 🔮 Roadmap

- [ ] Voice-activated SOS commands
- [ ] Apple/Google Sign-In
- [ ] Wearable device integration
- [ ] Integration with emergency services (911, 112)
- [ ] AI threat detection
- [ ] Community safety features

---

## ⚠️ Disclaimer

SafeGuard is designed to assist in emergency situations but should **not be relied upon as the sole means of emergency communication**. Always call local emergency services in life-threatening situations:

| Country | Emergency Number |
|---------|-----------------|
| 🇺🇸 USA | 911 |
| 🇮🇳 India | 112 |
| 🇬🇧 UK | 999 |
| 🇦🇺 Australia | 000 |
| 🇪🇺 EU | 112 |

---

## 📜 License

This project is created for educational and safety purposes.

---

## 🙏 Acknowledgments

Built with modern technologies and best practices for maximum reliability and user safety.

---

<div align="center">

**Built with ❤️ for safety and peace of mind**

*SafeGuard - Because Your Safety Matters*

</div>
