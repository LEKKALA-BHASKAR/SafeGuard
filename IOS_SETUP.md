# 📱 iOS Location Setup Guide

## Problem
iOS location features don't work in **Expo Go** because it doesn't support:
- Background location tracking
- Geofencing (TaskManager)
- Custom Info.plist keys

## Solution: Development Build

### Step 1: Add Location Permissions to app.json

Add this to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.safeguard",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "SafeGuard needs your location to keep you safe and provide emergency assistance.",
        "NSLocationAlwaysUsageDescription": "SafeGuard monitors your location in the background to detect emergencies and alert your contacts.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "SafeGuard requires continuous location access to provide 24/7 safety monitoring, geofencing alerts, and emergency response.",
        "NSMicrophoneUsageDescription": "SafeGuard records audio during emergencies to provide evidence and context.",
        "NSCameraUsageDescription": "SafeGuard records video during emergencies to document the situation.",
        "NSPhotoLibraryUsageDescription": "SafeGuard saves emergency recordings to your photo library for safekeeping.",
        "NSPhotoLibraryAddUsageDescription": "SafeGuard needs to save emergency recordings to your photos.",
        "UIBackgroundModes": [
          "location",
          "audio",
          "fetch"
        ]
      }
    }
  }
}
```

### Step 2: Create Development Build

```bash
cd /Users/bhaskarlekkala/React_Native/Helloworld

# Install iOS dependencies
npx expo prebuild

# Build and run on iOS device/simulator
npx expo run:ios
```

### Step 3: Alternative - EAS Build (Recommended for Production)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS
eas build:configure

# Build for iOS simulator (free)
eas build --profile development --platform ios

# Build for iOS device (requires Apple Developer account)
eas build --profile production --platform ios
```

## Features That Work in Expo Go ✅
- Foreground location tracking
- Basic map display
- Emergency contacts
- Firebase authentication
- Firestore database
- UI screens

## Features That Need Development Build ⚠️
- Background location tracking
- Geofencing (safe zones enter/exit)
- TaskManager background tasks
- Audio/video recording during emergency
- Push notifications (local + remote)

## Testing Checklist

After building, test these features:

### 1. Location Permissions
```typescript
import { enhancedLocationService } from './services/enhancedLocationService';

// Request permissions
await enhancedLocationService.initialize();
```

- [ ] "Allow While Using" permission requested
- [ ] "Allow Always" permission requested after first grant
- [ ] Permission status shows "granted" for both

### 2. Foreground Tracking
```typescript
// Start foreground tracking
await enhancedLocationService.startForegroundTracking((location) => {
  console.log('Location:', location);
});
```

- [ ] Receives updates every 3-10 seconds
- [ ] Accuracy within 10-20 meters
- [ ] Works while app is active

### 3. Background Tracking
```typescript
// Start background tracking
await enhancedLocationService.startBackgroundTracking();
```

- [ ] Notification shows "SafeGuard is tracking your location"
- [ ] Updates continue when app is in background
- [ ] Updates continue when screen is locked
- [ ] Battery drain < 5% per hour

### 4. Geofencing
```typescript
// Add safe zone
await enhancedLocationService.addSafeZone({
  id: 'home',
  name: 'Home',
  latitude: 37.7749,
  longitude: -122.4194,
  radius: 100, // meters
});
```

- [ ] Enter notification when arriving at safe zone
- [ ] Exit notification when leaving safe zone
- [ ] Works in background
- [ ] Multiple zones supported

### 5. Emergency Recording
```typescript
import { panicRecordingService } from './services/panicRecordingService';

// Initialize
await panicRecordingService.initialize();

// Start recording
await panicRecordingService.startEmergencyRecording();
```

- [ ] Audio permission requested
- [ ] Camera permission requested
- [ ] Media library permission requested
- [ ] Audio recording starts
- [ ] Video recording starts (if implemented)
- [ ] Uploads to Firebase Storage

## Troubleshooting

### Issue: "Location permission denied"
**Solution**: Go to Settings > Privacy & Security > Location Services > SafeGuard > Always

### Issue: "Background location not working"
**Solution**: Make sure you granted "Always" permission (not just "While Using")

### Issue: "Geofencing not triggering"
**Solution**: 
1. Check that TaskManager is defined:
```typescript
import * as TaskManager from 'expo-task-manager';
console.log(TaskManager.isTaskDefined('BACKGROUND_LOCATION_TASK'));
```
2. Restart the app after adding geofences
3. Test with smaller radius (50-100m) first

### Issue: "Recording permission denied"
**Solution**: Go to Settings > SafeGuard > enable Microphone, Camera, Photos

### Issue: "App crashes on background location"
**Solution**: Make sure UIBackgroundModes includes "location" in app.json

## Production Deployment

### 1. Apple Developer Account Required
- Cost: $99/year
- Sign up at https://developer.apple.com

### 2. Provisioning Profile
```bash
# Generate with EAS
eas build --profile production --platform ios
```

### 3. App Store Submission
```bash
# Create build
eas build --profile production --platform ios --auto-submit

# Or manual submission via Xcode
```

### 4. App Store Review Notes
Include these notes for Apple reviewers:

```
Background Location Justification:
- SafeGuard is a personal safety app that monitors user location 24/7
- Background location is essential for emergency detection and automatic alerts
- Geofencing alerts users when entering/leaving designated safe zones
- Required for check-in timer system to detect if user doesn't reach destination
- Critical for emergency response to track user during crisis situations

We comply with Apple's background location guidelines:
- Clear disclosure to users about always-on tracking
- User controls to enable/disable tracking
- Minimal battery impact (<5% per hour)
- Data used only for stated safety purposes
```

## Additional Resources

- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo TaskManager Documentation](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Apple Background Location Guidelines](https://developer.apple.com/documentation/corelocation/getting_the_user_s_location/handling_location_events_in_the_background)

## Quick Start Commands

```bash
# 1. Install dependencies
cd /Users/bhaskarlekkala/React_Native/Helloworld
npm install

# 2. Create development build
npx expo prebuild

# 3. Run on iOS simulator
npx expo run:ios

# 4. Run on iOS device (connected via USB)
npx expo run:ios --device

# 5. Or use EAS (recommended)
npm install -g eas-cli
eas login
eas build --profile development --platform ios
```

---

**Status**: ✅ Ready to build iOS development build

**Next Steps**: 
1. Run `npx expo prebuild`
2. Run `npx expo run:ios`
3. Test all premium features
4. Submit to App Store when ready
