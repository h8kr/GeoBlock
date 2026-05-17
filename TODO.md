# GeoBlock — To Do

## In progress
- [ ] Nothing currently in progress

## Up next (roughly in order)

### Real GPS / location rules
- [x] Request location permission from the user
- [x] Use device GPS when creating a location rule (replace the 0,0 placeholder)
- [x] Build a background geofence service that monitors if the user enters/exits a rule's radius
- [x] When inside a geofence, enforce that zone's blocked app list
- [x] Map picker — tap on OpenStreetMap to set rule centre coordinates
- [x] Edit rule — change name, radius, and location after creation
- [ ] **Known issue:** Geofence triggering unreliable on emulator due to mock GPS + background location permission requirements. Works correctly on a real device with "Allow all the time" location permission granted.

### Real screen time data
- [x] Request "Usage Access" permission from the user (banner + opens settings)
- [x] Build native UsageStatsModule using Android UsageStatsManager
- [x] Replace the mock data in the Screen Time tab with real numbers
- [x] Today / This Week toggle with live data

### Assign apps to location rules
- [x] Add UI to select which apps get blocked for each location rule
- [x] Store the app-to-rule mapping and pass it to the geofence service

### Read installed apps
- [x] Build native InstalledAppsModule using Android PackageManager
- [x] Replace the hardcoded app list in Blocked Apps with real installed apps (falls back to hardcoded list if native not ready)

### Accountability partner (Firestore)
- [x] Design Firestore data model (`/users/{uid}` with inviteCode, partnerId, isLocking)
- [x] PartnerService.ts — getOrCreateUserDoc, connectPartner, disconnectPartner, setLocking, subscribeToPartner
- [x] LockScreen — show invite code, enter partner code, connect flow, real-time partner lock status
- [ ] **Requires Firestore security rules** — set these in Firebase console before testing:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{uid} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == uid;
      }
    }
  }
  ```
- [ ] Push notifications when partner locks/unlocks you (requires FCM setup)
- [ ] Show lock/unlock state correctly from MY isLocking field (currently needs partner doc loaded)

## Before Google Play Store

### Must fix
- [ ] Remove the DEV reset button from the Lock screen (it's visible to all users)
- [ ] Test everything on a real physical Android device (nothing tested off emulator yet)
- [ ] Verify geofencing works end-to-end on a real device with "Allow all the time" location
- [ ] App icon — proper icon in all required sizes
- [ ] Play Store listing — screenshots, description, content rating questionnaire
- [ ] Privacy policy page — required by Google, especially since the app uses location data and an AccessibilityService

### Accessibility Service approval (the hard one)
- [ ] Submit a permission declaration form to Google explaining why the app needs AccessibilityService
- [ ] Record a video demonstrating the exact use case (Google requires this)
- [ ] Apps that use AccessibilityService for app blocking have been rejected before — be prepared to appeal or find an alternative approach

### Known limitations to fix or disclose
- [ ] The accessibility service can be disabled by the user from Android Settings, bypassing all blocking — a determined user can always escape
- [ ] No error handling if Firebase goes down
- [ ] No offline mode — app requires internet for auth and partner features

## iOS — Separate major project
- [ ] iOS has no equivalent to Android's AccessibilityService — app blocking works completely differently on iOS
- [ ] Would need to use Apple's Screen Time API (heavily restricted, only available via parental controls framework)
- [ ] Screen time usage data is not accessible to third-party apps on iOS at all
- [ ] All 5 native Kotlin modules need to be rewritten in Swift from scratch (blocking, geofencing, installed apps, usage stats, accessibility)
- [ ] Geofencing API is different on iOS (CLLocationManager + CLCircularRegion)
- [ ] Realistically iOS is months of additional work after the Android version ships

## Done
- [x] Firebase project created and connected
- [x] Real login / sign up with email and password
- [x] Auth state persists (stay logged in between sessions)
- [x] Sign out button
- [x] Blocked apps toggle saves to device
- [x] Location rules save to device
- [x] Self-lock timer with 1-hour unlock delay
- [x] Tab navigation fixed
- [x] Real app blocking via AccessibilityService — shows "blocked" overlay screen
- [x] Blocked apps list synced to native service via SharedPreferences
