# GeoBlock — App UI Design Brief

## What the app is
GeoBlock is an Android app that helps people block distracting apps using GPS-based location rules and accountability features. Think of it as a self-discipline tool: you tell the app "block Instagram and TikTok whenever I'm at work," and it enforces that automatically. You can also lock your own settings so you can't cheat, or invite a trusted friend to hold the lock for you.

---

## Design language

**Aesthetic:** Clean, minimal, slightly premium. Dark-first but with a light mode.  
**Accent color:** Indigo — `#4f46e5`  
**Font weight:** Heavy use of 800-weight for headings, 600–700 for labels, regular for body  
**Border radius:** 12–16px on cards, 10px on smaller elements  
**Cards:** Subtle 1px borders, no heavy shadows  
**State colors:**
- Success green: `#4ade80` (dark) / `#16a34a` (light)  
- Danger red: `#ef4444` / bg `#2d1515`  
- Warning amber: `#fbbf24` / bg `#2d1a00`  
- Locked state card: deep indigo bg `#1e1b4b`, border `#4f46e5`

**Dark palette:**
- Background: `#0f0f0f`
- Surface: `#1c1c1c`
- Surface secondary: `#2a2a2a`
- Border: `#2a2a2a`
- Text: `#ffffff`
- Text secondary: `#888888`
- Text muted: `#555555`

**Light palette:**
- Background: `#f7f7f7`
- Surface: `#ffffff`
- Border: `#e5e5e5`
- Text: `#111111`
- Text secondary: `#666666`

---

## App structure

**Auth screens (unauthenticated):**
1. Login screen
2. Sign Up screen

**Main app — bottom tab bar with 4 tabs:**
1. Dashboard (home icon)
2. Screen Time (bar chart icon)
3. Location Rules (map pin icon)
4. Lock Mode (lock icon)

---

## Screen-by-screen breakdown

### Auth: Login / Sign Up
- Email + password fields, large CTA button in indigo
- "Sign up" / "Log in" toggle link below
- Minimal, centered layout with the app name "GeoBlock" as the headline
- No social login — email only

---

### Tab 1: Dashboard

**Header row:**  
- Title "Dashboard" (bold, 28pt)  
- Right side: sun/moon icon button (theme toggle) + "Sign out" text link

**Subline:** "Your blocking is locked." or "Your blocking is unlocked." (14pt, secondary color)

**Stat cards (2-up row):**
- "Apps Configured" — shows a count
- "Active Rules" — shows a count
- Each: large number (32pt, 800 weight), label below, surface card with border

**Status section card:**
- Section title "Status"
- Rows: "Blocking Service", "Location Rules", "Lock Mode" — each with a small pill badge: green "Active" or grey "Off"
- If partner mode: "Partner" row with partner name in indigo

**Banners (conditional):**
- Unlock countdown banner (indigo locked-state bg): "Unlock Requested" title, "Your blocks will turn off in ~1 hour. Stay strong!" + "Cancel Unlock Request" button
- Warning banner (amber): "App blocking is disabled — The Accessibility Service is off. Tap to re-enable it in Settings."

**Footer:**
- Small "Privacy Policy" text link, centered

---

### Tab 2: Screen Time

**Header:** "Screen Time" / "See where your time goes."

**Permission banner (conditional):** Amber banner — "Usage Access not enabled. Tap here → find GeoBlock → enable 'Permit usage access'."

**Total card (indigo bg):**
- Label: "Total today" / "Total this week"
- Big number: e.g. "3h 42m" (44pt, white, 800 weight)
- Subtitle: "Across all apps"

**Segment control:** Today | This Week — pill toggle, indigo fill for active

**App list card:**
- Each row: letter-initial icon (square rounded, 38px), app name, time right-aligned, thin progress bar below showing % of total (indigo fill)
- Rows separated by 1px borders

---

### Tab 3: Location Rules

**Header row:** "Location Rules" / "Block apps in specific places." + "+ Add" button (indigo, right-aligned)

**Background location warning banner (conditional):** Amber banner — "Background location not enabled — Geofences won't trigger unless you set location to 'Allow all the time'."

**Rule cards (list):**
Each card:
- Top row: rule name (bold) + toggle switch (indigo when on)
- Meta line: "3 apps blocked · 200m radius"
- Coords line: tiny muted text with lat/lng
- Action row: "Apps" button + "Edit" button (secondary style) + "Remove" (red text link)

**Empty state:** Centered, "No location rules yet" title + description explaining the feature

**Create rule sheet (bottom modal):**
- "New Location Rule" title
- Text input: rule name
- Note: "Your current GPS coordinates will be saved as the centre of this rule."
- Cancel / Create buttons (side by side)

**Edit rule sheet (bottom modal):**
- Name input
- Radius input (numeric, metres)
- Coords display with pin emoji
- "Set on Map" button (blue tint, map emoji)
- Cancel / Save buttons

**Apps assignment sheet (bottom modal, tall — 80% height):**
- "Apps blocked at 'Work'" title
- Scrollable list of apps with toggle switches, same icon + name style as blocked apps
- "Done" button at bottom

---

### Tab 4: Lock Mode

**Header:** "Lock Mode" / "Prevent yourself from disabling your blocks."

#### State: No lock mode selected
Two option cards:
1. **Self-Lock card** — clock icon, "Self-Lock", description: "Lock your settings on this device. If you want to turn off your blocks, you must wait 1 hour after requesting the unlock."
2. **Accountability Partner card** — people icon, "Accountability Partner", description: "Invite a trusted person. They can lock your settings from their phone so only they can allow changes."

#### State: Self-Lock mode active

**Status card (normal or locked-indigo bg):**
- "Self-Lock Active" or "Self-Lock Enabled (Not Locked)"
- Subtitle explaining state

**Action buttons (conditional):**
- Not locked: "Activate Lock" (indigo primary button)
- Locked, no countdown: "Request Unlock (1-hour delay)" (danger/red border button)
- Countdown active: large countdown card (indigo bg) showing HH:MM:SS timer in 48pt, "Stay strong — you've got this." subtitle, "Cancel Unlock Request" secondary button

**Ghost button:** "Disable Self-Lock Mode"

#### State: Partner mode active

**My invite code card:**
- "Your invite code" label
- 6-character code in 36pt, bold, letter-spaced
- "Tap to copy" link in indigo

**Not connected yet:**
- "Connect a partner" card
- Explanation text
- Text input (center-aligned, letter-spaced, code-entry style)
- "Connect" primary button

**Connected:**
- Partner status card: "Partner: [name]" + lock/unlock status with emoji
- Lock your partner card: Toggle button — "Lock [name]" (indigo) or "Unlock [name]" (red/danger)
- "Disconnect Partner" ghost button

**Activity log section (at bottom):**
- Section header "ACTIVITY" (small caps, muted)
- Rows: event label left, time ago right ("just now", "2m ago", "1h ago")
- Thin separators

---

## Interaction notes

- Switches: indigo track when on, grey when off
- Locked state: toggles are disabled, tapping shows an alert
- Error banner (red): "Couldn't connect to server. Check your internet. [Retry link]"
- Modals: slide up from bottom, dark overlay, `border-top-radius: 20px`
- App icon letters: first letter of app name in a rounded square (38–42px), surface-secondary bg

---

## Platforms & tech context

- React Native (Android only for now)
- Bottom tab navigation
- The app uses a real Accessibility Service to block apps (shows an overlay when a blocked app is opened)
- Firebase auth (email/password)
- Firestore for partner sync (real-time)
- GPS geofencing (background location)

---

## Tone

Serious but not clinical. This is a productivity/self-control tool. The locked state should feel intentional and firm (indigo, bold). Warning states should feel urgent but not alarming. Empty states should be encouraging and explain the value.
