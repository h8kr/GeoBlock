# GeoBlock — Session Handoff

## What we are building
A React Native app (Android + iOS) that blocks distracting apps based on GPS location, tracks screen time, and lets a trusted accountability partner (or a self-lock timer) prevent you from disabling your own rules.

## Current state
- Full UI is built and running on the Android emulator (Pixel 8 AVD)
- All 5 screens work: Dashboard, Blocked Apps, Screen Time, Location Rules, Lock Mode
- Login / Sign Up screens exist but use a **fake bypass** — the button just skips auth, no real Firebase yet
- Local state (blocked apps, location rules, lock mode) saves to the device via AsyncStorage
- Code is on GitHub: https://github.com/h8kr/GeoBlock

## What we are doing RIGHT NOW
**Setting up Firebase authentication.**

The user has already:
- Created a Firebase project called "GeoBlock"
- Added an Android app with package name `com.geoblock`
- Downloaded `google-services.json` and placed it in `android/app/`
- Enabled Email/Password authentication in the Firebase console

**Your next task is to wire up Firebase in the code.**

## Steps to complete Firebase setup

### 1. Verify google-services.json is in place
```
Test-Path "c:\Users\gavri\GeoBlock\android\app\google-services.json"
```
Should return True. If not, ask the user to drop the file there.

### 2. Install Firebase npm packages
```
cd c:\Users\gavri\GeoBlock
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
```

### 3. Update android/build.gradle
Add to the `dependencies` block inside `buildscript`:
```
classpath('com.google.gms:google-services:4.4.2')
```

### 4. Update android/app/build.gradle
Add at the very bottom:
```
apply plugin: 'com.google.gms.google-services'
```

### 5. Replace fake auth in the code
- `src/screens/auth/LoginScreen.tsx` — replace the TODO with `auth().signInWithEmailAndPassword(email, password)`
- `src/screens/auth/SignUpScreen.tsx` — replace the TODO with `auth().createUserWithEmailAndPassword(email, password)` then `updateProfile({displayName: name})`
- `App.tsx` — replace `useState(false)` with a real `onAuthStateChanged` listener from `@react-native-firebase/auth`
- Add a sign-out button somewhere (Settings or Dashboard)

### 6. Rebuild the Android app
```
cd c:\Users\gavri\GeoBlock\android
.\gradlew.bat app:installDebug -x lint -PreactNativeDevServerPort=8081
```

### 7. Start Metro (in a separate terminal)
```
cd c:\Users\gavri\GeoBlock
npx react-native start --reset-cache
```

### 8. Forward the port
```
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 reverse tcp:8081 tcp:8081
```

## Known Windows-specific build quirks (already fixed — don't undo these)

| Issue | Fix already in place |
|---|---|
| Gradle can't download from services.gradle.org | `distributionUrl` in `gradle-wrapper.properties` points to a local zip file |
| Needs JDK 17 | `gradle.properties` points to `C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot` |
| AsyncStorage Maven artifact | Added to `android/build.gradle` allprojects as a local repo |
| react-native-screens src/ broken on Windows | `metro.config.js` has a custom `resolveRequest` redirecting to `lib/commonjs/index.js` |
| Metro can't connect to emulator | Run `adb reverse tcp:8081 tcp:8081` after every emulator restart |

## Folder structure
```
src/
  screens/
    auth/         — LoginScreen.tsx, SignUpScreen.tsx
    main/         — DashboardScreen, BlockedAppsScreen, ScreenTimeScreen,
                    LocationRulesScreen, LockScreen
  navigation/     — AuthNavigator.tsx, MainNavigator.tsx
  store/          — useAppStore.ts (AsyncStorage state)
  types/          — index.ts
```

## After Firebase — what comes next
1. Assign apps to a location rule (currently rules are created with no apps attached)
2. Real GPS coordinates when creating a location rule
3. Background geofence monitoring service
4. Native Android AccessibilityService (actual app blocking)
5. Native Android UsageStatsManager (real screen time data)
6. Accountability partner invite flow (Firestore)
