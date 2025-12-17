# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select existing project
3. Enter project name (e.g., "SafeGuard")
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. Save changes

## Step 3: Enable Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select a location closest to your users
5. Click "Enable"

### Firestore Security Rules (For Production)

Replace test mode rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Allow users to read and write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Emergency contacts (sub-collection)
    match /users/{userId}/emergencyContacts/{contactId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Location sharing (for verified contacts)
    match /locationSharing/{sharingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Step 4: Register Your App

### For iOS:

1. In Firebase Console, click iOS icon (⊕ iOS app)
2. Enter iOS bundle ID: `com.safeguard.app` (or your custom ID)
3. Download `GoogleService-Info.plist`
4. Add to your Xcode project
5. Copy the configuration values

### For Android:

1. Click Android icon (⊕ Android app)
2. Enter Android package name: `com.safeguard.app` (or your custom ID)
3. Download `google-services.json`
4. Place in `android/app/` directory
5. Copy the configuration values

### For Web (optional):

1. Click Web icon (⊕ Web app)
2. Register app name
3. Copy the configuration objectnpx expo prebuild
npx expo run:ios

## Step 5: Get Your Configuration

After registering your app, go to:
**Project Settings** → **General** → **Your apps**

You'll find your Firebase config that looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

## Step 6: Update Your App

1. Open `/config/firebase.ts` in your project
2. Replace the placeholder config with your actual values:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
```

3. Save the file

## Step 7: Test Your Setup

1. Run your app: `npm start`
2. Try to register a new user
3. Check Firebase Console → Authentication → Users
4. You should see the new user listed

## Optional: Enable Cloud Messaging (for Push Notifications)

1. Go to **Build** → **Cloud Messaging**
2. Enable Cloud Messaging API
3. Generate server key
4. Add to your backend if needed

## Database Structure

The app will automatically create this structure in Firestore:

```
users/
  ├── {userId}/
      ├── uid: string
      ├── email: string
      ├── displayName: string
      ├── phoneNumber: string (optional)
      ├── emergencyContacts: array
      ├── profileComplete: boolean
      ├── createdAt: timestamp
      ├── locationSharingEnabled: boolean
      └── privacySettings: object
          ├── shareWithContacts: boolean
          ├── trackingDuration: number
          └── allowBackgroundTracking: boolean
```

## Security Best Practices

1. **Never commit Firebase config to public repos**
   - Add to `.gitignore` if needed
   - Use environment variables in production

2. **Update Firestore Rules**
   - Switch from test mode to production rules
   - Restrict access to authenticated users only

3. **Enable App Check** (for production)
   - Protects your backend from abuse
   - Verifies requests come from your app

4. **Set up billing alerts**
   - Monitor usage in Firebase Console
   - Set quotas to prevent unexpected charges

## Troubleshooting

### Error: "Firebase not initialized"
- Check if you've updated the config in `/config/firebase.ts`
- Verify all fields are filled with actual values (no "YOUR_")

### Error: "Permission denied"
- Check Firestore security rules
- Ensure user is authenticated
- Verify test mode is enabled during development

### Error: "Network request failed"
- Check internet connection
- Verify Firebase project is active
- Check if billing is enabled (required for some features)

### Authentication not working
- Verify Email/Password provider is enabled
- Check Firebase Console for error logs
- Ensure apiKey and authDomain are correct

## Useful Firebase Console Links

- **Authentication**: Check registered users and sign-in methods
- **Firestore**: View and edit database documents
- **Usage**: Monitor API calls and storage
- **Project Settings**: Update configuration and manage APIs

## Cost Considerations

Firebase Free Tier (Spark Plan) includes:
- 50,000 Authentication users
- 1 GB Firestore storage
- 50,000 document reads/day
- 20,000 document writes/day

This is usually sufficient for development and small-scale apps.

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)
- [Firebase Community](https://firebase.google.com/community)

---

Once Firebase is configured, your SafeGuard app will have:
- ✅ Secure user authentication
- ✅ Cloud database for user profiles
- ✅ Real-time data synchronization
- ✅ Scalable backend infrastructure
