# Firebase & SMS Integration Guide

## Overview
This document explains the Firebase and SMS integration for the SafeGuard emergency app.

## Components Implemented

### 1. SMS Service (`services/smsService.ts`)
**Status**: ✅ Implemented - Waiting for Firebase Cloud Functions

**Purpose**: Sends SMS messages through Firebase Cloud Functions backed by Twilio

**Key Methods**:
- `sendSMS(to, message, type)` - Send generic SMS
- `sendOTP(phoneNumber, code)` - Send OTP verification code
- `sendEmergencyAlert(phoneNumber, userName, lat, lng)` - Send emergency alert
- `sendBulkSMS(phoneNumbers, message)` - Send to multiple recipients
- `formatPhoneNumber(phone)` - Normalize phone numbers
- `maskPhoneNumber(phone)` - Hide phone number digits for display

**Dependencies**:
- Firebase Cloud Functions: `httpsCallable(functions, 'sendSMS')`
- Requires backend implementation

### 2. OTP Service (`services/otpService.ts`) - Updated
**Status**: ✅ Implemented - Integrated with SMS Service

**Changes**:
- Now uses `smsService.sendOTP()` for actual SMS delivery
- Stores OTP codes in Firebase Firestore (collection: `otp_verifications`)
- Falls back to AsyncStorage for offline scenarios
- Validates phone numbers in international format (+1234567890)
- Implements cooldown (5 minutes between requests)
- Max 3 verification attempts per OTP
- 10-minute OTP expiration

**Workflow**:
1. User requests OTP → Generate 6-digit code
2. Save to Firebase + AsyncStorage
3. Call `smsService.sendOTP()` → Firebase Cloud Function → Twilio → SMS
4. User enters code → Verify against Firebase
5. Mark phone as verified
6. Log: `[OTP Service] OTP sent to *****6789`

### 3. Firebase Contacts Service (`services/firebaseContactsService.ts`)
**Status**: ✅ Created - Ready for Integration

**Purpose**: Replaces AsyncStorage with persistent Firestore storage for emergency contacts

**Key Methods**:
- `initialize()` - Migrate local contacts to Firebase on first run
- `getUserContacts()` - Get all contacts for current user (with local cache)
- `addContact()` - Add new emergency contact
- `updateContact()` - Modify contact details
- `deleteContact()` - Remove contact
- `toggleFavorite()` - Mark/unmark as favorite
- `markContactAsVerified()` - After OTP verification
- `getFavoriteContacts()` - Get favorite contacts only
- `getPrimaryContact()` - Get primary contact
- `batchUpdateContacts()` - Sync multiple contacts at once

**Firestore Structure**:
```
emergency_contacts/ (collection)
├── <contactId>
│   ├── id: string
│   ├── userId: string (user's UID)
│   ├── name: string
│   ├── phoneNumber: string
│   ├── relationship: string
│   ├── role: 'primary' | 'secondary' | 'tertiary'
│   ├── verified: boolean
│   ├── favorite: boolean
│   ├── email?: string
│   ├── notes?: string
│   ├── addedAt: number (timestamp)
│   ├── verifiedAt?: number
│   ├── lastContactedAt?: number
│   ├── syncedAt: number
│   └── lastModified: number
```

**Caching**:
- Local cache key: `contacts_cache`
- Synced to localStorage for offline access
- Automatically clears when updated

### 4. Firebase Config (`config/firebase.ts`) - Updated
**Status**: ✅ Updated

**Changes**:
- Added Cloud Functions initialization: `export const functions = getFunctions(app)`
- Now supports callable functions for SMS sending

## What's Missing - Implementation Requirements

### A. Firebase Cloud Function for SMS Sending

**Function Name**: `sendSMS`

**Location**: Firebase Console → Cloud Functions (or `functions/` directory)

**Implementation**:
```typescript
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User not authenticated"
    );
  }

  const { to, message, type, userId } = data;

  try {
    // Send via Twilio
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    // Log to Firestore for audit trail
    await admin.firestore().collection("sms_logs").add({
      userId,
      to,
      type,
      messageId: result.sid,
      status: "sent",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error("Twilio error:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send SMS"
    );
  }
});
```

**Environment Variables Required**:
- `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number for sending SMS

**Setup Steps**:
1. Create Twilio account at https://www.twilio.com
2. Get Account SID, Auth Token, and Phone Number
3. Set environment variables in Firebase Console
4. Deploy Cloud Function

### B. Firestore Security Rules

**For OTP Collection**:
```javascript
match /otp_verifications/{phoneNumber} {
  allow read, write: if request.auth != null;
}
```

**For Emergency Contacts Collection**:
```javascript
match /emergency_contacts/{contactId} {
  allow read, write: if request.auth.uid == resource.data.userId;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
}
```

**For SMS Logs Collection** (audit trail):
```javascript
match /sms_logs/{logId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow write: if false;  // Only Cloud Functions can write
}
```

### C. Update Screens to Use Firebase Services

**Files to Update**:
1. `screens/main/EnhancedContactsScreen.tsx` - Use `firebaseContactsService`
2. `screens/main/EmergencyHistoryScreen.tsx` - Create Firebase history service
3. `screens/main/SafeZonesScreen.tsx` - Create Firebase safe zones service

**Pattern**:
```typescript
// Old (AsyncStorage)
const loadContacts = async () => {
  const stored = await AsyncStorage.getItem(CONTACTS_KEY);
  setContacts(JSON.parse(stored));
};

// New (Firebase)
const loadContacts = async () => {
  const contacts = await firebaseContactsService.getUserContacts();
  setContacts(contacts);
};
```

## Current Data Flow

### OTP Verification Flow
```
User Request OTP
    ↓
otpService.sendOTP()
    ↓
Generate 6-digit code
    ↓
Save to Firebase + AsyncStorage
    ↓
smsService.sendOTP() - HTTP Call to Cloud Function
    ↓
Firebase Cloud Function (sendSMS)
    ↓
Twilio API
    ↓
SMS Sent to User's Phone
    ↓
Log sent to Firebase
```

### Emergency Contact Flow
```
User Adds Contact
    ↓
firebaseContactsService.addContact()
    ↓
Save to Firestore
    ↓
Update local cache
    ↓
Sync with other devices (auto when user logs in)

SOS Triggered
    ↓
Get favorite contacts from Firebase
    ↓
Send SMS via smsService.sendEmergencyAlert()
    ↓
Update lastContactedAt timestamp
```

## Testing Guide

### 1. Test OTP Sending (Development)
```typescript
// In console
await otpService.sendOTP("+1234567890", "registration");
// Should log: "[OTP Service] OTP sent to ****7890"
// Check Firebase Console → Firestore → otp_verifications collection
```

### 2. Test Without Cloud Functions (Development)
- SMS service falls back gracefully if Cloud Function not available
- OTP is still stored locally/Firebase
- User can manually enter code during testing
- Console logs will show what SMS would be sent

### 3. Production Checklist
- [ ] Twilio account created and tested
- [ ] Cloud Function deployed
- [ ] Environment variables set in Firebase
- [ ] Security Rules updated
- [ ] Firebase Collection indexes created (if needed)
- [ ] Error handling tested
- [ ] SMS delivery tested with real phone
- [ ] Rate limiting implemented

## Troubleshooting

### OTP Not Sending
1. Check Cloud Function logs in Firebase Console
2. Verify Twilio credentials are correct
3. Check phone number format (+1234567890)
4. Verify Firebase Auth user exists

### SMS Delivery Issues
1. Check Twilio trial account SMS limits
2. Verify recipient phone number format
3. Check Twilio logs: https://www.twilio.com/console/sms/logs
4. Ensure Cloud Function is deployed

### Contacts Not Syncing
1. Verify user is authenticated
2. Check Firestore read/write permissions
3. Check local cache: `AsyncStorage.getItem('contacts_cache')`
4. Check browser console for errors

## Next Steps
1. Set up Twilio account
2. Deploy Cloud Function `sendSMS`
3. Update screens to use Firebase services
4. Create Firebase history and safe zones services
5. Test end-to-end OTP and SMS delivery
6. Deploy to production
