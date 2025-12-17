# SafeGuard App - Quick Start Guide

## 🚀 You're Ready to Get Started!

All core features have been implemented. Follow these steps to run your SafeGuard app.

## ✅ What's Already Done

1. ✅ **Project Structure** - Complete folder structure with all necessary files
2. ✅ **Dependencies** - All packages installed successfully
3. ✅ **Authentication System** - Login/Register with Firebase
4. ✅ **Location Tracking** - Real-time GPS with background support
5. ✅ **SOS Feature** - Multi-trigger emergency alert system
6. ✅ **Emergency Contacts** - Full contact management
7. ✅ **Map Integration** - Real-time location visualization
8. ✅ **SMS Alerts** - Emergency messaging system
9. ✅ **Privacy Controls** - Complete privacy settings
10. ✅ **Multi-Language** - English, Spanish, Hindi support
11. ✅ **Settings Screen** - User preferences and logout

## 📝 Next Steps

### 1. Configure Firebase (REQUIRED)

Before running the app, you must set up Firebase:

1. Go to https://console.firebase.google.com
2. Create a new project (or use existing)
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database**
5. For iOS: Add iOS app in project settings
6. For Android: Add Android app in project settings
7. Copy your configuration

**Update `/config/firebase.ts`:**

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Run the App

```bash
# Start the development server
npm start

# Then choose:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go app on your phone
```

### 3. Test the Features

#### Test Authentication:
1. Launch the app
2. Register a new account (use any email format)
3. Login with your credentials

#### Test Location Tracking:
1. Go to Home tab
2. Grant location permissions when prompted
3. Toggle location tracking ON
4. Watch your location update on the map

#### Test Emergency Contacts:
1. Go to Contacts tab
2. Add at least 2-3 emergency contacts
3. Include valid phone numbers with country code (e.g., +1234567890)

#### Test SOS Feature:
1. Go to Emergency tab
2. Try quick tap (shows confirmation)
3. Try long press (3 seconds - auto sends)
4. Verify SMS alert is sent (you'll see confirmation)

#### Test Settings:
1. Go to Settings tab
2. Try different languages
3. Adjust privacy settings
4. Test logout functionality

## 🔍 Important Notes

### Permissions
When you first run the app, grant these permissions:
- **Location (Always)** - Required for tracking
- **Contacts** - Optional, for importing contacts
- **SMS** - Required for emergency alerts

### Testing SMS
- SMS functionality works on real devices only
- Simulators/emulators cannot send actual SMS
- Use a real phone for full testing

### Firebase Setup
- The app won't work properly without Firebase configuration
- Make sure Authentication and Firestore are enabled
- Check Firebase Console for any errors

## 📱 Running on Physical Device

### For iOS (requires Mac):
```bash
npm run ios
```

### For Android:
```bash
npm run android
```

### Using Expo Go:
1. Install Expo Go from App Store/Play Store
2. Run `npm start`
3. Scan the QR code with Expo Go

## 🐛 Common Issues

### Issue: "Firebase not configured"
**Solution:** Update `/config/firebase.ts` with your actual Firebase config

### Issue: "Location permission denied"
**Solution:** 
- iOS: Settings → Privacy → Location Services → Enable for SafeGuard
- Android: Settings → Apps → SafeGuard → Permissions → Location → Allow all the time

### Issue: "SMS not sending"
**Solution:** 
- Test on real device (not simulator)
- Check phone number format includes country code
- Verify SMS permissions are granted

### Issue: "Map not loading"
**Solution:**
- Check internet connection
- Grant location permissions
- Wait a few seconds for GPS to initialize

## 🎨 Customization

### Change App Colors
Edit the color codes in each screen's StyleSheet:
- Primary color: `#E63946` (red)
- Success: `#4CAF50` (green)
- Background: `#F8F9FA` (light gray)

### Add More Languages
Edit `/services/i18n.ts` and add translations for your language.

### Adjust Tracking Intervals
Edit `/services/locationService.ts`:
- `timeInterval`: How often to update (milliseconds)
- `distanceInterval`: Update after moving X meters

## 📊 App Architecture

```
App.tsx (Main Entry)
├── Auth Flow (if not logged in)
│   ├── LoginScreen
│   └── RegisterScreen
│
└── Main App (if logged in)
    ├── HomeScreen (GPS tracking + Map)
    ├── SOSScreen (Emergency alerts)
    ├── ContactsScreen (Emergency contacts)
    └── SettingsScreen (Preferences)

Services (Backend Logic)
├── authService (Firebase auth)
├── locationService (GPS tracking)
├── emergencyService (SMS + alerts)
├── encryptionService (Data security)
└── i18n (Multi-language)
```

## 🚀 Production Deployment

### For App Stores:

1. **Update app.json:**
   - Change `name` and `slug`
   - Update `ios.bundleIdentifier`
   - Update `android.package`
   - Add your EAS project ID

2. **Build with EAS:**
```bash
npm install -g eas-cli
eas login
eas build --platform ios
eas build --platform android
```

3. **Submit to Stores:**
```bash
eas submit --platform ios
eas submit --platform android
```

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [React Navigation](https://reactnavigation.org)

## 💡 Tips for Best Performance

1. **Battery Optimization:**
   - Adjust tracking intervals in production
   - Use balanced accuracy instead of high
   - Implement smart tracking (only when moving)

2. **Data Usage:**
   - Cache map tiles for offline use
   - Compress location data before sending
   - Use SMS as primary alert method

3. **User Experience:**
   - Test on low-end devices
   - Optimize for slow networks
   - Add loading states everywhere

## 🆘 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify Firebase is properly configured
3. Ensure all permissions are granted
4. Test on a real device for full functionality

---

**Your SafeGuard app is ready! Start the server and begin testing.** 🎉

For the complete README with full documentation, see `README_SAFEGUARD.md`.
