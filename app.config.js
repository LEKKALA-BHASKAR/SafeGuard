export default {
  expo: {
    name: "SafeGuard",
    slug: "safeguard",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "safeguard",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.safeguard.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "SafeGuard needs your location to share it with emergency contacts during emergencies.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "SafeGuard needs continuous access to your location to provide real-time tracking for your safety.",
        NSLocationAlwaysUsageDescription:
          "SafeGuard needs background location access to track your location even when the app is not active.",
        NSContactsUsageDescription: "SafeGuard needs access to your contacts to add emergency contacts.",
        NSMicrophoneUsageDescription:
          "SafeGuard records audio during emergencies to provide evidence and context.",
        NSCameraUsageDescription: "SafeGuard records video during emergencies to document the situation.",
        NSPhotoLibraryUsageDescription: "SafeGuard saves emergency recordings to your photo library for safekeeping.",
        NSPhotoLibraryAddUsageDescription: "SafeGuard needs to save emergency recordings to your photos.",
        NSSpeechRecognitionUsageDescription:
          "SafeGuard needs speech recognition for voice-activated emergency features.",
        UIBackgroundModes: ["location", "fetch", "remote-notification", "audio"]
      }
    },
    android: {
      package: "com.safeguard.app",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "READ_CONTACTS",
        "SEND_SMS",
        "CALL_PHONE",
        "VIBRATE",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
      ],
      adaptiveIcon: {
        backgroundColor: "#E63946",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow SafeGuard to use your location for emergency tracking.",
          locationAlwaysPermission: "Allow SafeGuard to track your location in the background for your safety.",
          locationWhenInUsePermission: "Allow SafeGuard to use your location when you're using the app.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#E63946",
          sounds: ["./assets/sounds/emergency-alert.wav"]
        }
      ],
      [
        "expo-contacts",
        {
          contactsPermission: "Allow SafeGuard to access your contacts to add emergency contacts."
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#E63946",
          dark: {
            backgroundColor: "#8B1E29"
          }
        }
      ]
    ],
    experiments: {
      reactCompiler: true
    },
    extra: {
      eas: {
        "projectId": "your-project-id-here"
      }
    }
  }
};
