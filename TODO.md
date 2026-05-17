# GeoBlock — To Do

## In progress
- [ ] Nothing currently in progress

## Up next (roughly in order)

### Real app blocking
- [x] Build native Android AccessibilityService that detects when a blocked app is foregrounded
- [x] When a blocked app is detected, overlay a "blocked" screen on top of it
- [x] Connect the blocked apps list (AsyncStorage) to the AccessibilityService

### Real GPS / location rules
- [ ] Request location permission from the user
- [ ] Use device GPS when creating a location rule (replace the 0,0 placeholder)
- [ ] Build a background geofence service that monitors if the user enters/exits a rule's radius
- [ ] When inside a geofence, enforce that zone's blocked app list

### Real screen time data
- [ ] Request "Usage Access" permission from the user
- [ ] Build a native module using Android UsageStatsManager to read real per-app screen time
- [ ] Replace the mock data in the Screen Time tab with real numbers

### Assign apps to location rules
- [ ] Add UI to select which apps get blocked for each location rule
- [ ] Store the app-to-rule mapping and pass it to the geofence service

### Accountability partner (Firestore)
- [ ] Design Firestore data model for users and partner relationships
- [ ] Build invite flow (generate a code, other user enters it)
- [ ] Let the partner lock/unlock settings remotely in real time
- [ ] Push notifications when the partner locks or unlocks you

### Read installed apps
- [ ] Build a native Android module that returns the list of apps actually installed on the device
- [ ] Replace the hardcoded app list in Blocked Apps with the real installed apps

## Done
- [x] Firebase project created and connected
- [x] Real login / sign up with email and password
- [x] Auth state persists (stay logged in between sessions)
- [x] Sign out button
- [x] Blocked apps toggle saves to device
- [x] Location rules save to device
- [x] Self-lock timer with 1-hour unlock delay
- [x] Tab navigation fixed
