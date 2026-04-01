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

### Accessibility Glow-Up (WCAG 2.2 AA) — All 3 Phases

A comprehensive three-phase accessibility audit touching 50+ files. Ta-Da! is now significantly more usable for keyboard-only users, screen reader users, and people with colour vision deficiencies.

**Screen reader improvements (Phase 1+2):**
- Skip-to-main-content link on every page
- All 5 modals now announce as dialogs (`role="dialog"`, `aria-modal`, `aria-labelledby`)
- Form labels properly wired to inputs across 4 components
- Filter and toggle buttons announce their selected state (`aria-pressed`)
- Decorative nav SVGs hidden from screen readers
- Timeline strip toggle has a proper `aria-label`
- Rhythm type/category selection buttons use `radiogroup` + `aria-checked` semantics

**Screen reader improvements (Phase 3):**
- Timeline filter results announced via `aria-live="polite"` region — screen readers hear "12 entries found" when filters change
- Settings toggles now use `role="switch"` + `aria-checked` for proper announcement
- Heatmap legends include tooltips and `aria-label` (None / Low / Medium / High / Very High)
- Every day cell in the year tracker has a descriptive `aria-label` ("April 1: 3 entries")

**Keyboard navigation (Phase 1+2):**
- Focus moves into modals on open and restores to the trigger on close
- Rhythm expand/collapse panels are now keyboard-accessible buttons with `aria-expanded`

**Keyboard navigation (Phase 3):**
- **Focus traps** — new `useFocusTrap` composable confines Tab/Shift+Tab to the open modal. Applied to QuickAddMenu and all dialog components. Tab no longer escapes into the page behind.
- **Year tracker keyboard grid** — the heatmap is now a proper `role="grid"`. Arrow keys move between days, Home/End jump to start/end, Enter/Space select. Roving tabindex keeps focus intuitive.

**Colour & contrast (Phase 1+2):**
- `tada-600` text upgraded to `tada-700` on light backgrounds (2.5:1 → 4.5:1+)
- `stone-400` informational text upgraded to `stone-500` in light mode
- Hardcoded low-contrast colours in chart labels fixed

**Colour & contrast (Phase 3):**
- **Colourblind-safe heatmaps** — green → violet sequential scale in year tracker and month calendar. Distinguishable under deuteranopia, protanopia, and tritanopia.
- **Category colour contrast** — Creative, Social, Life Admin, and Events category colours darkened to meet 3:1 minimum contrast on white backgrounds.
- **Button text contrast** — `text-white` → `text-stone-900` on `bg-tada-600` buttons across Settings for WCAG AA compliance.

**Touch targets (Phase 1):**
- Chart navigation buttons enlarged from ~28px to ~36px
- Modal close button enlarged

**Reduced motion (Phase 3):**
- New `useReducedMotion` composable respects `prefers-reduced-motion: reduce`
- CelebrationOverlay suppresses confetti, bounce, and fade animations when the OS preference is set

The full audit is documented at `design/accessibility.md`.

### Version Number Visibility

Version number at the bottom of the Help, Settings, and About pages is now legible in both light and dark mode (was previously faint and tiny). Also added to the Help page where it was missing entirely.

### What's New → Settings Navigation

Clicking "Yes, turn it on!" in the What's New overlay now navigates directly to the Rhythms section of Settings (`/settings#section-rhythms`) instead of the top of the settings page.

---

## Bug Fixes

### Registration error messages now surface correctly (#10)

When registration failed (e.g. username already taken, password too short), users saw a generic "Registration failed" message instead of the actual reason. The frontend was reading the HTTP status text rather than the backend's validation message.

Also adds enforcement of the 3-character username minimum on both the frontend (immediate feedback before submission) and backend (validation guard). Usernames must be between 3 and 31 characters.

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
