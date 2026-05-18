# GeoBlock — CLAUDE.md

GeoBlock is an Android-only React Native app that blocks distracting apps using GPS geofencing and accountability features. Users create location rules ("block Instagram at work"), optionally lock their settings via self-lock or a partner.

**Design spec:** See `design.md` for all UI decisions — colors, spacing, card styles, screen-by-screen layouts, and tone. Always consult it before writing UI code.

---

## Commands

```bash
npm start                        # Start Metro bundler
npm run android                  # Build & install debug APK on emulator
npx react-native start --reset-cache   # Metro with cache cleared

# Manual gradle build (if npm run android fails)
cd android && ./gradlew app:installDebug -x lint -PreactNativeDevServerPort=8081

# ADB port forward after emulator restart
adb reverse tcp:8081 tcp:8081
adb devices                      # Confirm emulator is connected
```

**Node ≥22.11.0 required.** No iOS support yet — Android only.

---

## Architecture

```
src/
├── screens/
│   ├── auth/          LoginScreen.tsx, SignUpScreen.tsx
│   └── main/          DashboardScreen.tsx, ScreenTimeScreen.tsx,
│                      LocationRulesScreen.tsx, LockScreen.tsx,
│                      PrivacyPolicyScreen.tsx
├── navigation/        AuthNavigator.tsx (stack), MainNavigator.tsx (bottom tabs)
├── components/        MapPicker.tsx (Leaflet WebView map)
├── store/             AppContext.tsx, useAppStore.ts, apps.ts
├── native/            BlockingModule.ts, GeofenceModule.ts,
│                      InstalledAppsModule.ts, UsageStatsModule.ts
├── services/          PartnerService.ts (Firestore)
├── types/             index.ts
└── theme/             index.ts

android/app/src/main/java/com/geoblock/
├── GeoBlockAccessibilityService.kt   # Core blocker — watches foreground app
├── BlockedActivity.kt                # Full-screen overlay shown when app is blocked
├── BlockingModule.kt                 # RN bridge: setBlockedApps, isAccessibilityServiceEnabled
├── GeofenceModule.kt                 # RN bridge: getCurrentLocation, updateGeofences
├── GeofenceTransitionReceiver.kt     # BroadcastReceiver: updates geofence_blocked_apps on enter/exit
├── InstalledAppsModule.kt            # RN bridge: getInstalledApps
└── UsageStatsModule.kt               # RN bridge: getUsageStats, hasUsagePermission
```

**Entry point:** `App.tsx` — checks Firebase Auth state, routes to `AuthNavigator` or `MainNavigator`.

---

## State Management

All state lives in `useAppStore.ts` (custom hook, no Zustand/Redux), persisted via AsyncStorage. Accessed everywhere through `useAppContext()`.

**Key state:**
- `blockedApps: BlockedApp[]` — global app block list (managed in BlockedAppsScreen)
- `locationRules: LocationRule[]` — geofence zones, each with `blockedAppIds: string[]`
- `lockMode: 'none' | 'self' | 'partner'`
- `selfLock: { isLocked, unlockRequestedAt, unlockDelayMs }` — 1-hour default delay
- `partner: { uid, displayName, email, isLockingYou } | null`
- `lockHistory: LockEvent[]` — capped at 50 entries
- `theme: 'light' | 'dark'`

**Critical:** `updateLocationRules()` resolves `blockedAppIds` → package names via `blockedApps` state first, then falls back to `COMMON_APPS`. This fallback was added intentionally — do not remove it. If only `blockedApps` is used, geofences silently block nothing when a user skips BlockedAppsScreen.

---

## Navigation

**Tab names → screens:**
- `Dashboard` → DashboardScreen (icon: `dashboard`)
- `ScreenTime` → ScreenTimeScreen (icon: `timer`, label: "Limits")
- `LocationRules` → LocationRulesScreen (icon: `location-on`, label: "Rules")
- `Partner` → LockScreen (icon: `lock`, label: "Lock")

Tab route names are what `navigation.navigate()` uses. Labels are display-only.

---

## Blocking Architecture (Android)

The blocking pipeline has two independent inputs that both feed `GeoBlockAccessibilityService`:

1. **Direct blocking** — `BlockingModule.setBlockedApps(packages[])` writes to SharedPreferences `blocked_apps`. Used by dev test and BlockedAppsScreen.
2. **Geofence blocking** — `GeofenceTransitionReceiver` updates SharedPreferences `geofence_blocked_apps` on zone enter/exit.

`GeoBlockAccessibilityService` fires on `TYPE_WINDOW_STATE_CHANGED`, checks both SharedPreferences keys, launches `BlockedActivity` if the foreground app is in either list. **The Accessibility Service must be manually enabled by the user in Android settings** — `isAccessibilityServiceEnabled()` checks this; the warning banner on Dashboard guides users there.

---

## Theme System

`src/theme/index.ts` exports `darkColors`, `lightColors`, `Colors` type, `fonts` object, and `useTheme()` hook. The hook reads `store.theme` from context and returns `{ colors, theme, toggleTheme }`.

Auth screens (pre-login) hardcode `darkColors` directly — they can't access the store yet.

**Accent:** `#4f46e5` (indigo). **Active lock card bg:** `#1e1b4b`. See `design.md` for full palette.

`fonts` exports Geist family names (Regular, Medium, SemiBold, Bold, ExtraBold). **Geist is not currently bundled** — `fontFamily` references fall back silently to the system font. Do not add new `fontFamily` calls until the font is properly linked.

---

## Native Modules (JS side)

| Module | Key methods |
|--------|-------------|
| `BlockingModule` | `setBlockedApps(string[])`, `isAccessibilityServiceEnabled(): Promise<bool>`, `openAccessibilitySettings()` |
| `GeofenceModule` | `getCurrentLocation(): Promise<{latitude, longitude}>`, `updateGeofences(rules[])` |
| `InstalledAppsModule` | `getInstalledApps(): Promise<InstalledApp[]>` (falls back to `COMMON_APPS` if unavailable) |
| `UsageStatsModule` | `hasUsagePermission(): Promise<bool>`, `openUsageSettings()`, `getUsageStats('today' \| 'week'): Promise<AppUsage[]>` |

---

## Firebase

- **Auth:** email/password only (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`)
- **Firestore:** partner data only. Collection: `users/{uid}` with fields `inviteCode`, `partnerId`, `isLocking`, `displayName`, `email`
- All Firestore logic is in `src/services/PartnerService.ts`

---

## COMMON_APPS (`src/store/apps.ts`)

Pre-defined list of 10 apps (Instagram, TikTok, X, Snapchat, Facebook, YouTube, Reddit, Discord, Netflix, Prime Video) with stable string IDs (`'1'`–`'10'`). These IDs are stored in `LocationRule.blockedAppIds`. Do not change existing IDs — they are persisted in AsyncStorage on users' devices.

---

## Key Gotchas

- **Windows path issue:** `metro.config.js` resolves `react-native-screens` to `lib/commonjs` — do not remove this.
- **Gradle uses local zip:** `gradle-wrapper.properties` points to a local gradle zip (Windows fix for services.gradle.org failures). Do not change the `distributionUrl`.
- **`detachInactiveScreens={false}`** in MainNavigator — required to keep screen state alive across tab switches. Do not remove.
- **Admin/dev section** on Dashboard shows when `__DEV__ === true` or email matches `gavrielchaim123@gmail.com`. The dev test lets you pick any app from `TEST_APPS` (Chrome + COMMON_APPS) and block it directly via `BlockingModule`.
- **MapPicker** uses a Leaflet.js map inside a WebView. Coordinates are passed back via `window.ReactNativeWebView.postMessage()`.
- **LockScreen tab is named `Partner`** in the navigator (for historical reasons) but displays as "Lock". Use `Partner` in `navigation.navigate()`.
- **Auth screens always use dark theme** — they don't use `useTheme()` because they render before the store is available.
- **`cancelSelfUnlock`** is called as `store.cancelSelfUnlock` (not destructured) in DashboardScreen — this is intentional to avoid stale closure issues.

---

## Code Conventions

- Styles via `StyleSheet.create()` in a `createStyles(c: Colors)` function at bottom of each file, called inside the component with `useMemo`.
- No comments unless the WHY is non-obvious.
- `useMemo` wraps styles and sub-component style factories.
- `useAppContext()` to access store everywhere in main screens.
- Icons: `@react-native-vector-icons/material-icons` (already imported in most screens).
- All screens handle their own safe area via `useSafeAreaInsets()` — no wrapper component.
