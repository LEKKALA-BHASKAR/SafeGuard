# 🚀 SafeGuard - Quick Start Guide

## Overview
This guide will get SafeGuard running in 5 minutes for demonstration purposes.

## Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Xcode (for iOS) or web browser
- [ ] Internet connection

## Installation Steps

### 1. Install Dependencies (2 minutes)
```bash
cd /Users/bhaskarlekkala/React_Native/Helloworld
npm install --legacy-peer-deps
```

**Note**: The `--legacy-peer-deps` flag resolves peer dependency conflicts with React 19.

### 2. Start Development Server (30 seconds)
```bash
npm start
```

This will:
- Start Metro bundler
- Open Expo DevTools in browser
- Show QR code for device testing

### 3. Run on Platform

#### **Option A: iOS Simulator (Recommended)**
```bash
# In new terminal
npm run ios
```

**First-time setup**: iOS Simulator will take 2-3 minutes to boot.

#### **Option B: Web Browser (Fastest)**
```bash
# In new terminal  
npm run web
```

Browser will open at `http://localhost:8081`

#### **Option C: Physical Device**
1. Install **Expo Go** app from App Store
2. Scan QR code from terminal
3. App will load on device

### 4. Test Login (30 seconds)

**Option 1: Register New Account**
- Tap "Register" button
- Enter email, password, name
- Tap "Register"

**Option 2: Demo Credentials**
```
Email: demo@safeguard.com
Password: Demo123!
```

*(Note: Create this account first if using demo credentials)*

## Quick Feature Test

### Test Flow (5 minutes)

**1. Profile Setup (1 min)**
- Navigate to "Profile" tab
- Add medical information
- Upload profile photo (optional)

**2. Add Emergency Contact (1 min)**
- Go to "Contacts" tab
- Tap "Add Contact"
- Enter name and phone number
- Mark as "Primary" contact

**3. Test SOS Alert (1 min)**
- Navigate to "Emergency" tab
- Press and hold SOS button (3 seconds)
- Confirm alert sent
- Check "History" tab for event

**4. Create Safe Zone (1 min)**
- Go to "Safe Zones" tab
- Tap "Add Zone"
- Select "Home" type
- Use current location
- Set radius to 500m
- Save zone

**5. Schedule Fake Call (1 min)**
- Navigate to "Escape" tab
- Select "Mom" caller
- Set delay to 2 minutes
- Tap "Schedule Fake Call"
- Wait for fake call notification

## Troubleshooting

### Issue: Metro bundler won't start
**Solution**:
```bash
# Clear cache
npm start -- --reset-cache
```

### Issue: iOS build fails
**Solution**:
```bash
# Install pods
cd ios
pod install
cd ..
npm run ios
```

### Issue: Dependencies not installing
**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Issue: TypeScript errors in editor
**Solution**:
```bash
# Restart TypeScript server
CMD+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: Location permissions not working
**Solution**:
- iOS: Settings → Privacy → Location Services → Expo Go → Always
- Simulator: Features → Location → Custom Location

## Demo Tips

### For 1-Hour Presentation:

**Preparation (Before Demo)**
1. Start app and ensure it's running
2. Pre-register demo account
3. Add 2-3 emergency contacts
4. Create one emergency event (for history)
5. Set up one safe zone
6. Have screen recording ready

**During Demo**
- Use iOS Simulator for best experience
- Have backup device for real alerts
- Show offline mode by disabling WiFi
- Demonstrate shake detection
- Show admin dashboard on web

### Screen Recording (Optional)
```bash
# iOS Simulator
CMD+R to start/stop recording
# Saved to Desktop
```

## Quick Command Reference

```bash
# Development
npm start              # Start Metro bundler
npm run ios            # Run iOS simulator
npm run web            # Run in browser
npm run android        # Run Android (if setup)

# Maintenance
npm install --legacy-peer-deps  # Install dependencies
npm start -- --reset-cache      # Clear cache
npm run lint                    # Check code quality

# Build (Production)
expo build:ios         # Build iOS app
expo build:web         # Build web app
```

## Firebase Configuration

### Quick Setup (Optional - for full functionality)

1. **Create Firebase Project**
   - Go to [firebase.google.com](https://firebase.google.com)
   - Click "Add project"
   - Name it "SafeGuard"

2. **Add iOS App**
   - Click iOS icon
   - Bundle ID: `com.safeguard.app`
   - Download `GoogleService-Info.plist`
   - Place in `/ios/SafeGuard/`

3. **Enable Authentication**
   - Authentication → Sign-in method
   - Enable "Email/Password"

4. **Create Firestore Database**
   - Firestore Database → Create database
   - Start in test mode (for demo)

5. **Update Config**
   Edit `config/firebase.ts`:
   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "safeguard-xxx.firebaseapp.com",
     projectId: "safeguard-xxx",
     storageBucket: "safeguard-xxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:ios:abcdef123456"
   };
   ```

**Note**: App works without Firebase - uses AsyncStorage for demo mode.

## Keyboard Shortcuts (Web)

- `Ctrl/Cmd + S` - Quick SOS (future feature)
- `Ctrl/Cmd + H` - View History
- `Ctrl/Cmd + K` - Search

## Performance Tips

### Speed Up Development
1. Use web for rapid testing
2. Use iOS Simulator for full features
3. Enable Fast Refresh (on by default)

### Optimize Loading
1. Pre-load images in assets
2. Keep Metro bundler running
3. Use production builds for demos

## Next Steps

After getting app running:

1. ✅ Explore all 8 main tabs
2. ✅ Test each feature thoroughly
3. ✅ Review `COMPLETE_FEATURE_GUIDE.md`
4. ✅ Check `TESTING_GUIDE.md` for test scenarios
5. ✅ Read `PRODUCTION_DEPLOYMENT.md` for deployment

## Support

**Documentation**:
- `README.md` - Project overview
- `COMPLETE_FEATURE_GUIDE.md` - All features
- `FEATURE_CHECKLIST.md` - Feature status
- `TESTING_GUIDE.md` - Testing instructions

**Quick Help**:
```bash
# Check app logs
npm start
# Look for errors in terminal

# Check TypeScript issues
npx tsc --noEmit
```

## Status Check

Run this to verify everything is ready:

```bash
# Check Node version (should be 18+)
node --version

# Check npm version
npm --version

# Check Expo CLI
npx expo --version

# Test build
npm run web
```

If all commands run successfully, you're ready to demo! 🎉

---

**Time to First Run**: ~3-5 minutes
**Time to Full Demo**: ~10 minutes (with Firebase)
**Recommended Demo Platform**: iOS Simulator or Web

**Good luck with your presentation! 🚀**
