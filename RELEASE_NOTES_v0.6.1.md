# Ta-Da! v0.6.1 Release Notes

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

**Operator setup:** generate keys with `npx web-push generate-vapid-keys`, then set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` env vars in CapRover.

---

## Bug Fixes

### Registration error messages now surface correctly (#10)

When registration failed (e.g. username already taken, password too short), users saw a generic "Registration failed" message instead of the actual reason. The frontend was reading the HTTP status text rather than the backend's validation message. Also removes the 3-character username minimum — single-character usernames are now valid.

### Android PWA: mic noise during recording fixed (#5)

On Android Chrome, pressing the record button produced loud beeping and clunking throughout the recording session.

**Root cause:** `echoCancellation`, `noiseSuppression`, and `autoGainControl` triggered Android's `MODE_IN_COMMUNICATION` audio routing, rerouting speaker output to the earpiece — right next to the mic. System sounds were picked up directly.

**Fix:** all three constraints disabled. Whisper handles ambient noise internally. `AudioContext.setSinkId('')` added as a secondary guard; cleanup order reversed to eliminate the teardown thump.

---

## Upgrade Notes

**Self-hosted:** drop-in upgrade. Push notifications are off by default — no new behaviour until you set the VAPID env vars.

**Breaking changes:** none.

---

## What's Next (v0.7.0)

- LLM titles for audio entries (#6)
- Dedicated `bot@tada.living` support/transactional email address
