# Time Tracker Mobile App

React Native app built with Expo for Android time tracking.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   Edit `lib/supabase.js` and add your Supabase URL and anon key:
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_URL'
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
   ```

3. **Install Expo CLI:**
   ```bash
   npm install -g @expo/cli
   ```

## Development

**Start development server:**
```bash
npx expo start
```

**Run on Android:**
```bash
npx expo run:android
```

## Building for Production

**Build APK:**
```bash
npx expo build:android
```

**Or use EAS Build (recommended):**
```bash
npm install -g @expo/eas-cli
eas build --platform android
```

## Features

- ✅ Employee authentication via Supabase
- ✅ Clock in/out functionality
- ✅ Break tracking
- ✅ Real-time sync with database
- ✅ **Offline capabilities**
  - Clock in/out without internet connection
  - Automatic sync when connection restored
  - Visual offline/online status indicator
  - Pending action counter

## Project Structure

```
mobile-app/
├── screens/
│   ├── LoginScreen.js       # Login/authentication
│   └── TimeTrackingScreen.js # Main time tracking interface
├── lib/
│   └── supabase.js          # Supabase client configuration
├── App.js                   # Main app component
└── app.json                 # Expo configuration
```