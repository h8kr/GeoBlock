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
| Accountability partner (Firestore real-time) | `LockScreen.tsx`, `PartnerService.ts` |
| Partner invite code system | `PartnerService.ts` — Firestore `users/{uid}` collection |
| Dev test blocking (selectable app) | Admin section in `DashboardScreen.tsx` |
| AsyncStorage persistence | `useAppStore.ts` — all state survives app restart |
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
  JS: BlockingModule.setBlockedApps([...packageNames])
    → SharedPrefs "blocked_apps"
    → GeoBlockAccessibilityService checks on every window change
  Geofence: GeofenceTransitionReceiver → SharedPrefs "geofence_blocked_apps"
    → same AccessibilityService check
```

Full detail: see `CLAUDE.md`.

---

## Critical Bug Fixed This Session

`useAppStore.ts` → `updateLocationRules()` was resolving `blockedAppIds` (COMMON_APPS string IDs) to package names exclusively through `blockedApps` state. If a user added apps to a location rule without first visiting BlockedAppsScreen, `blockedApps` was empty and geofences silently blocked nothing.

**Fix:** Added `COMMON_APPS` as a direct fallback in the package name lookup. Do not revert this.

```ts
// in updateLocationRules():
blockedPackages: r.blockedAppIds.map(id =>
  appsToUse.find(a => a.id === id)?.packageName ??
  COMMON_APPS.find(a => a.id === id)?.packageName   // ← this fallback is critical
).filter(Boolean)
```

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

### 2. Real App Blocking from Installed Apps
`InstalledAppsModule` already returns installed apps. `LocationRulesScreen` currently only shows `COMMON_APPS`. Wire up `InstalledAppsModule.getInstalledApps()` in the apps assignment modal to show the user's actual installed apps as the primary list, falling back to `COMMON_APPS`.

### 3. Notification When Blocked
When `GeoBlockAccessibilityService` launches `BlockedActivity`, it could also fire a local notification explaining why the app is blocked and showing the active rule name. Android notification channel setup needed.

### 4. Play Store Submission
See the pre-launch requirements document (separate doc). Key blockers:
- Privacy policy must be hosted at a real URL (not just the in-app modal)
- `MANAGE_OVERLAY_PERMISSION` and Accessibility Service usage requires declaration
- Release keystore must be set up (`android/app/release.keystore`, never commit it)

### 5. iOS Port
All 4 native modules need iOS implementations. AccessibilityService equivalent on iOS is Screen Time API (heavily restricted by Apple — may require MDM). Requires macOS machine to build.

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
