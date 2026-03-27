# Ta-Da! v0.7.0 Release Notes

**Release Date:** March 2026
**Codename:** TBD

---

## Bug Fixes

### Registration error messages now surface correctly (#10)

When registration failed (e.g. username already taken, password too short), users saw a generic "Registration failed" message instead of the actual reason. The frontend error handler was reading the HTTP status text rather than the backend's error message. Fixed to read the validation message directly from the API response.

Also: the 3-character username minimum has been removed. Single-character usernames (e.g. "M") are now valid — the only constraint is the 31-character maximum.

### Android PWA: mic noise during recording fixed (#5)

On Android Chrome, pressing the record button produced loud beeping and clunking sounds throughout the recording session. The audio capture itself worked correctly.

**Root cause:** enabling `echoCancellation`, `noiseSuppression`, and `autoGainControl` in `getUserMedia` caused Chrome to activate Android's `MODE_IN_COMMUNICATION` audio routing — the same mode used for phone calls. This reroutes speaker output to the earpiece, which sits next to the microphone, and any system sounds (notifications, UI feedback) were picked up directly by the mic.

**Fix:** all three audio processing constraints are now disabled. Whisper handles ambient noise well without browser-level processing, so transcription quality is unaffected. Additionally, `AudioContext.setSinkId('')` is set to prevent Chrome from routing the visualisation context's output to any speaker, and the cleanup order is reversed (AudioContext closed before stream tracks stopped) to eliminate a secondary clunk artifact at the end of recordings.
