# GeoBlock

A React Native app that helps fight phone addiction by blocking distracting apps based on your location, tracking your screen time, and letting a trusted accountability partner help keep you honest.

---

## What the App Does

Most screen time apps are easy to bypass — you just turn them off. GeoBlock solves this by letting someone you trust (a friend, partner, or coach) lock your settings from their own phone, so you can't cheat your own rules.

---

## Core Features

### 1. App Blocking by Location
- Choose which apps to block (e.g. TikTok, Instagram, YouTube)
- Set locations where those blocks are active (e.g. "block social media when I'm at work or school")
- When you enter a blocked zone, the selected apps become inaccessible
- On Android: a full overlay blocks the app and returns you to the home screen
- On iOS: blocks are enforced via Screen Time rules (less strict due to Apple's restrictions)

### 2. Screen Time Tracking
- See a daily and weekly breakdown of how long you spend in each app
- View trends over time to see if you're improving
- Get notified when you're approaching a daily limit you've set for yourself
- All tracked locally on-device — nothing is sent anywhere without your permission

### 3. Lock Mode — Two Options

#### Option A: Accountability Partner
- Invite a trusted person to be your accountability partner — they download GeoBlock and accept your request
- Your partner can see your screen time stats and which rules you have set
- Your partner can **lock your rules** so you can't change or disable them without their approval
- Your partner receives a notification if you try to tamper with your settings
- You can have one active accountability partner at a time
- Either party can end the partnership at any time

#### Option B: Self-Lock (No Partner Needed)
- Lock your own rules directly on your device — no other person required
- If you try to disable a block or turn off the app, a **1-hour countdown timer** starts before the change takes effect
- During the countdown you can cancel the request, but you cannot skip or shorten the delay
- This gives you a built-in "cooling off" period — by the time the hour is up, the urge to open the blocked app has usually passed
- Useful for people who want accountability without involving anyone else

---

## Platform Support

| Feature | Android | iOS |
|---|---|---|
| App blocking (hard block) | Full support via AccessibilityService | Limited — uses Screen Time API, requires Apple entitlement |
| Screen time tracking | Full support via UsageStatsManager | Full support via Screen Time API |
| Location-based rules | Full support | Full support |
| Accountability partner | Full support | Full support |

---

## How It Works (Technical Overview)

- **React Native** — cross-platform mobile framework
- **Firebase Auth** — user accounts and login (email/password or Google sign-in)
- **Firebase Firestore** — real-time database that syncs rules and partner data between two phones
- **Firebase Cloud Messaging (FCM)** — push notifications between partners
- **Android AccessibilityService** — detects when a blocked app is opened and overlays a block screen
- **Android UsageStatsManager** — reads per-app screen time data
- **Android/iOS Geofencing APIs** — detects when the user enters or leaves a defined location zone

---

## Screens (Planned)

1. **Onboarding** — explain the app, request permissions
2. **Dashboard** — today's screen time summary, active blocks, partner status
3. **Blocked Apps** — list of apps the user has chosen to block, toggle on/off
4. **Location Rules** — map view to create/edit geofence zones and assign blocked apps to them
5. **Screen Time** — detailed usage stats with daily/weekly charts
6. **Accountability Partner** — invite partner, view partner controls, lock/unlock settings
7. **Settings** — account, notifications, app permissions

---

## Permissions Required

### Android
- `BIND_ACCESSIBILITY_SERVICE` — to detect and block foreground apps
- `PACKAGE_USAGE_STATS` — to read screen time data
- `ACCESS_FINE_LOCATION` + `ACCESS_BACKGROUND_LOCATION` — for geofencing
- `FOREGROUND_SERVICE` — to keep blocking active in the background
- `RECEIVE_BOOT_COMPLETED` — to restart the blocking service after phone reboot
- `POST_NOTIFICATIONS` — for alerts and partner notifications

### iOS
- Location (Always) — for geofencing
- Screen Time / Family Controls entitlement — for app blocking (requires Apple approval to ship on App Store)

---

## Development Setup

### Prerequisites
- Node.js 18+
- JDK 17 (Eclipse Temurin recommended)
- Android Studio with an emulator (API 30+)
- Xcode 15+ (for iOS)
- Firebase project (see Firebase Setup below)

### Run on Android
```sh
# Install dependencies
npm install

# Start Metro bundler
npx react-native start

# In a second terminal, build and install
npx react-native run-android
```

### Firebase Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project called "GeoBlock"
2. Add an Android app with package name `com.geoblock`
3. Download `google-services.json` and place it in `android/app/`
4. Add an iOS app with bundle ID `com.geoblock`
5. Download `GoogleService-Info.plist` and place it in `ios/GeoBlock/`
6. Enable **Authentication** (Email/Password), **Firestore**, and **Cloud Messaging** in the Firebase console

---

## Things to Build Later

### B2B — Employer / Workplace Mode
- **Company workspaces** — an employer creates a workspace and employees join with an invite code
- **Policy push** — employer defines blocking rules (e.g. block social media at the office location) and they automatically apply to all employee devices
- **Admin web dashboard** — employers manage dozens of employees from a browser, not a phone app
- **Compliance reporting** — employer can see which employees have the app active, aggregate screen time stats, and rule violations
- **Group policies** — assign different rule sets to different teams or roles
- Applies equally to **schools/universities** (students instead of employees) and **parental controls for teens**
- The personal accountability partner model is the same architecture — one party controls another's settings via Firebase. The B2B version is just one-to-many instead of one-to-one
- Note: Firestore data model should be designed from the start to support both personal and workspace accounts to avoid a rewrite later

### Computer / Desktop Linking
- **Browser extension** — block distracting websites on your computer when you're in a blocked zone, synced with the same location rules as your phone
- **Desktop app (Mac/Windows)** — shows your screen time across both phone and computer in one place
- **Unified dashboard** — see total daily screen time combining phone + computer usage
- **Cross-device rules** — one rule blocks Instagram on your phone AND the browser on your laptop simultaneously
- **Admin web portal** (ties into B2B above) — employers manage employee phone rules from their computer

---

## Project Status

- [ ] Firebase Auth (login / signup screens)
- [ ] Dashboard screen
- [ ] App picker (choose apps to block)
- [ ] Android AccessibilityService (block enforcement)
- [ ] Android UsageStatsManager (screen time)
- [ ] Location rule creation (map + geofence)
- [ ] Background geofence monitoring
- [ ] Lock mode selection (accountability partner vs. self-lock)
- [ ] Accountability partner invite flow
- [ ] Partner remote lock/unlock
- [ ] Self-lock with 1-hour countdown timer
- [ ] Push notifications
- [ ] iOS Screen Time integration
- [ ] App Store / Play Store release
