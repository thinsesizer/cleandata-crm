# CleanData CRM - Mobile App

React Native mobile application for iOS and Android.

## Features

- 📱 Cross-platform (iOS & Android)
- 🔐 Biometric authentication
- 📊 Real-time dashboard
- 🔔 Push notifications
- 📶 Offline support
- 🎨 Native UI components

## Tech Stack

- React Native 0.73+
- TypeScript
- Expo SDK 50
- Supabase (Auth & Real-time)
- React Navigation 6
- React Native Paper (UI)
- React Query (Data fetching)

## Getting Started

```bash
# Install dependencies
npm install

# Start Metro bundler
npx expo start

# Run on iOS simulator
i

# Run on Android emulator
a

# Build for production
npx eas build --platform all
```

## Project Structure

```
mobile/
├── src/
│   ├── api/           # API clients
│   ├── components/    # Reusable UI components
│   ├── screens/       # Screen components
│   ├── hooks/         # Custom React hooks
│   ├── store/         # State management
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript types
├── assets/            # Images, fonts
├── App.tsx            # Entry point
└── app.json           # Expo config
```

## Environment Setup

Create `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
API_URL=https://api.cleandata.app
```

## Build Configuration

```json
{
  "expo": {
    "name": "CleanData CRM",
    "slug": "cleandata-crm",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.cleandata.crm"
    },
    "android": {
      "package": "com.cleandata.crm",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

## Screens

1. **Login** - Email/password + biometric
2. **Dashboard** - Overview stats
3. **Contacts** - List, search, filter
4. **Contact Detail** - View & edit
5. **Enrichment** - Run enrichment jobs
6. **Settings** - Preferences & logout

## Push Notifications

```typescript
import * as Notifications from 'expo-notifications'

// Register for push notifications
async function registerPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status === 'granted') {
    const token = await Notifications.getExpoPushTokenAsync()
    // Send token to backend
  }
}
```