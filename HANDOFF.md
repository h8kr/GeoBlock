# GeoBlock — Project Handoff

**Last updated:** May 2026  
**Repo:** https://github.com/h8kr/GeoBlock  
**Platform:** Android only (React Native 0.85.3)  
**Design spec:** `design.md` — read this before touching any UI  
**Architecture reference:** `CLAUDE.md` — full codebase map, gotchas, conventions

---

## What This App Does

GeoBlock is an Android self-discipline tool. Users create GPS-based location rules ("block Instagram and TikTok when I'm at work"), and the app enforces them automatically in the background using Android's AccessibilityService. To prevent cheating, users can activate a Self-Lock (1-hour unlock delay) or invite an Accountability Partner who controls their settings via Firestore.

---

## Current Feature Status

### ✅ Complete & Working
| Feature | Where |
|---|---|
| Firebase email/password auth | `LoginScreen.tsx`, `SignUpScreen.tsx`, `App.tsx` |
| Full UI redesign (all screens) | `src/screens/` — matches `design.md` |
| App blocking via AccessibilityService | `GeoBlockAccessibilityService.kt`, `BlockedActivity.kt` |
| GPS geofencing (enter/exit zones) | `GeofenceModule.kt`, `GeofenceTransitionReceiver.kt` |
| Location rules (create/edit/delete/toggle) | `LocationRulesScreen.tsx` |
| Map picker for setting rule coordinates | `MapPicker.tsx` (Leaflet in WebView) |
| App assignment to location rules | Apps modal in `LocationRulesScreen.tsx` |
| Screen time data (real UsageStats API) | `ScreenTimeScreen.tsx`, `UsageStatsModule.kt` |
| Installed apps list (native) | `InstalledAppsModule.kt` |
| Self-lock with 1-hour countdown | `LockScreen.tsx`, `useAppStore.ts` |
| Accountability partner app selector | `LockScreen.tsx`, `PartnerService.ts` — Select real apps to block |
| Partner invite code system | `PartnerService.ts` — Firestore `users/{uid}` collection |
| Dev test blocking (selectable app) | Admin section in `DashboardScreen.tsx` |
| User-Namespaced AsyncStorage | `useAppStore.ts` — state namespaced by UID to prevent cross-account leak |
| Global Always-On Partner Blocks | `useAppStore.ts` — Partner blocks merged & pushed to native service immediately |
| Light/dark theme toggle | `src/theme/index.ts`, `useTheme()` |
| Privacy policy | `PrivacyPolicyScreen.tsx` (modal) |
| Background location permission flow | `LocationRulesScreen.tsx` |
| Usage access permission flow | `ScreenTimeScreen.tsx` |
| `CLAUDE.md` project documentation | Root — keep updated |
| `.gitignore` (build artifacts excluded) | Root |

### ⚠️ Known Issues / Incomplete
| Issue | Detail |
|---|---|
| **Geist fonts not linked** | `src/theme/index.ts` exports font names but TTFs aren't registered with React Native's font system. All `fontFamily` refs silently fall back to system font. To fix: run `npx react-native-asset` after confirming fonts are in `android/app/src/main/assets/fonts/` and `react-native.config.js` lists the asset path. |
| **`google-services.json` not in repo** | Gitignored intentionally. Every developer must obtain it from Firebase console (GeoBlock project → Android app → download config) and place it at `android/app/google-services.json`. |
| **Light mode not fully tested** | The theme system supports light mode but screens were designed and tested primarily in dark mode. |
| **BlockedAppsScreen still uses old font refs** | `BlockedAppsScreen.tsx` still imports and uses `fonts` from theme. Harmless (silent fallback) but inconsistent with other screens. |
| **iOS not started** | All native modules (`BlockingModule`, `GeofenceModule`, etc.) are Android-only. No iOS implementations exist. |

---

## Architecture in 60 Seconds

```
App.tsx
 ├── AuthNavigator  →  LoginScreen / SignUpScreen
 └── MainNavigator (bottom tabs)
      ├── Dashboard      (tab: "Dashboard",  route: "Dashboard")
      ├── ScreenTime     (tab: "Limits",     route: "ScreenTime")
      ├── LocationRules  (tab: "Rules",      route: "LocationRules")
      └── LockScreen     (tab: "Lock",       route: "Partner")  ← route name is "Partner"

State: useAppStore.ts (custom hook) → AppContext → useAppContext() in all screens
Persistence: AsyncStorage (all state) + Firestore (partner data only)
Blocking pipeline:
  JS: useAppStore.ts useEffect combines user blocked apps + partner's packages
    → BlockingModule.setBlockedApps([...combinedPackages])
    → SharedPrefs "blocked_apps"
    → GeoBlockAccessibilityService checks on every window change
  Geofence: GeofenceTransitionReceiver → SharedPrefs "geofence_blocked_apps"
    → same AccessibilityService check
```

Full detail: see `CLAUDE.md`.

---

## Critical Bug Fixes & Refactors This Session

### 1. User-Namespaced AsyncStorage
Previously, user configurations (rules, blocked apps, locks) were stored globally in AsyncStorage. This caused data leakage when signing in with a different account.
**Fix:** Refactored `useAppStore.ts` to prepend the authenticated user's `uid` to all storage keys. State is properly wiped/restored on sign-out/sign-in.

### 2. Firestore Modular API exists Method Bug
In `@react-native-firebase/firestore` v24, `exists` is a method (`snap.exists()`) rather than a property (`snap.exists`). The old code used it as a property, causing the check to always evaluate as truthy and skip document creation, leading to `undefined` errors.
**Fix:** Implemented a wrapper `snapExists(snap)` in `PartnerService.ts` that safely handles both property and method forms.

### 3. Screen Freeze on Network Timeout
If Firestore was unreachable, the Lock tab would spin infinitely without user-facing errors.
**Fix:** Implemented a 10-second request timeout in `LockScreen.tsx` that triggers a friendly red error banner with a manual retry button.

### 4. Interactive Partner App Selection
We completely revamped the Accountability Partner feature. Instead of a basic locking switch, partners can now selectively choose which apps to block on each other's devices.
- **Dynamic App Sync:** The app retrieves the actual installed apps on the device using `InstalledAppsModule` and syncs them to the user's Firestore document.
- **Cross-device App Choice:** The partner's device fetches the actual installed apps list of the other user and displays it in a clean selection modal on `LockScreen.tsx`.
- **Always-on Enforced Blocking:** Blocks are combined automatically inside `useAppStore.ts` and pushed to native SharedPreferences. They are fully active even if the app is closed, restarted, or offline.

---

## Windows Build Quirks (Do Not Undo)

| Problem | Fix in place |
|---|---|
| Gradle can't hit services.gradle.org | `gradle-wrapper.properties` → `distributionUrl` points to a local `.zip` |
| `react-native-screens` broken on Windows | `metro.config.js` → custom `resolveRequest` redirects to `lib/commonjs/index.js` |
| AsyncStorage Maven artifact missing | `android/build.gradle` → `allprojects` block has local Maven repo path |
| Metro can't reach emulator | Run `adb reverse tcp:8081 tcp:8081` after every emulator restart |

---

## Dev Commands

```bash
npm start                         # Metro bundler
npm run android                   # Build + install debug APK
npx react-native start --reset-cache  # Metro with cleared cache

# Manual gradle (if npm run android fails)
cd android
.\gradlew.bat app:installDebug -x lint -PreactNativeDevServerPort=8081

# ADB port forward (run after emulator boots)
adb reverse tcp:8081 tcp:8081
```

---

## What Comes Next (Priority Order)

### 1. Fix Geist Font Linking
The fonts are bundled at `android/app/src/main/assets/fonts/` but aren't registered. Add a `react-native.config.js`:
```js
module.exports = { assets: ['./android/app/src/main/assets/fonts/'] };
```
Then run `npx react-native-asset`. Verify in theme that font names match exactly.

### 2. Notification When Blocked
When `GeoBlockAccessibilityService` launches `BlockedActivity`, it could also fire a local notification explaining why the app is blocked and showing the active rule name. Android notification channel setup needed.

### 3. Play Store Submission
See the pre-launch requirements document (separate doc). Key blockers:
- Privacy policy must be hosted at a real URL (not just the in-app modal)
- `MANAGE_OVERLAY_PERMISSION` and Accessibility Service usage requires declaration
- Release keystore must be set up (`android/app/release.keystore`, never commit it)

### 4. iOS Port
All native modules need iOS implementations. AccessibilityService equivalent on iOS is Screen Time API (heavily restricted by Apple — may require MDM). Requires macOS machine to build.

---

## Key File Locations

| What | Where |
|---|---|
| App entry point | `App.tsx` |
| All types | `src/types/index.ts` |
| Theme colors + fonts | `src/theme/index.ts` |
| Pre-built app list | `src/store/apps.ts` |
| All state + persistence | `src/store/useAppStore.ts` |
| Firestore partner logic | `src/services/PartnerService.ts` |
| Android blocking service | `android/app/src/main/java/com/geoblock/GeoBlockAccessibilityService.kt` |
| Blocked app overlay | `android/app/src/main/java/com/geoblock/BlockedActivity.kt` |
| Android manifest | `android/app/src/main/AndroidManifest.xml` |
| Firebase config (gitignored) | `android/app/google-services.json` — get from Firebase console |
