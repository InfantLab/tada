# Ta-Da! v0.7.0 Release Notes

**Release Date:** March 2026
**Codename:** The PWA One

---

## What's New

### PWA Glow-Up

A round of progressive web app improvements across the board — making the installed app feel significantly more native.

**Manifest fixes**
- Maskable icon now correctly references `maskable-icon.png` (proper safe-zone cropping on Android home screens)
- Added `id: "/"` to pin app identity across URL changes (reinstalls recognised as the same app)

**App shortcuts**
Long-press the Ta-Da! icon on Android or desktop Chromium for quick actions: New Entry, Record Dream, New Tally.

**Offline fallback**
Offline users now see a branded "You're offline" page instead of a raw browser error.

**Screen Wake Lock**
The screen stays on during voice recording sessions. No more mid-sentence screen-off interruptions. Re-acquires automatically if the OS releases the lock while still recording.

### Web Push Notifications

Weekly celebration and encouragement messages can now be delivered via push notification in addition to (or instead of) email — even when Ta-Da! isn't open.

**How it works:**
- Self-hosted operators generate VAPID keys (`npx web-push generate-vapid-keys`) and add them as env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
- Users opt in from Settings → Rhythms → Push Notifications
- Toggling on triggers the browser permission prompt; the subscription is registered server-side
- The Monday celebration and Thursday encouragement fire push notifications alongside (or instead of) email, per your channel preferences
- Notifications click through directly to the `/rhythms` page

**Platform notes:** Supported on Android Chrome and desktop Chromium. iOS requires the app to be installed to the home screen (standalone mode) and iOS 16.4+.

**What was built:**
- `push_subscriptions` table (endpoint, VAPID keys, failure tracking)
- `POST /api/push/subscribe` and `DELETE /api/push/subscribe` endpoints
- `GET /api/push/vapid-key` — exposes the public VAPID key to the client
- Custom service worker (switched from `generateSW` to `injectManifest`) with `push` and `notificationclick` handlers
- Push delivery service mirroring the email delivery pattern, with 410-gone handling (expired subscriptions soft-disabled)
- Push delivery wired into the weekly rhythms scheduler sweep alongside email
- `usePushNotifications` composable — permission request, subscribe/unsubscribe, reactive state
- Push toggles in Settings → Weekly Rhythms (shown only when server is VAPID-configured and browser supports push)

---

## Bug Fixes

### Registration error messages now surface correctly (#10)

When registration failed (e.g. username already taken, password too short), users saw a generic "Registration failed" message instead of the actual reason. The frontend error handler was reading the HTTP status text rather than the backend's error message. Fixed to read the validation message directly from the API response.

Also: the 3-character username minimum has been removed. Single-character usernames (e.g. "M") are now valid — the only constraint is the 31-character maximum.

### Android PWA: mic noise during recording fixed (#5)

On Android Chrome, pressing the record button produced loud beeping and clunking sounds throughout the recording session. The audio capture itself worked correctly.

**Root cause:** enabling `echoCancellation`, `noiseSuppression`, and `autoGainControl` in `getUserMedia` caused Chrome to activate Android's `MODE_IN_COMMUNICATION` audio routing — the same mode used for phone calls. This reroutes speaker output to the earpiece, which sits next to the microphone, and any system sounds (notifications, UI feedback) were picked up directly by the mic.

**Fix:** all three audio processing constraints are now disabled. Whisper handles ambient noise well without browser-level processing, so transcription quality is unaffected. Additionally, `AudioContext.setSinkId('')` is set to prevent Chrome from routing the visualisation context's output to any speaker, and the cleanup order is reversed (AudioContext closed before stream tracks stopped) to eliminate a secondary clunk artifact at the end of recordings.

---

## What's Deferred

- **LLM titles for audio entries (#6)** — auto-generating entry titles from voice transcriptions. Deferred to v0.8.0.
- **Dedicated support channel for tada.living** — set up `bot@tada.living` as a transactional/support email address for push VAPID contact, SMTP from-address, and future in-app feedback routing.
