# Plan: PWA Hardening + Android Native via Capacitor

**Date:** 2026-05-10
**Status:** Pre-marketing blocker. Marketing/ads push paused until session reliability is solved.
**Theme:** v0.7.0 — Native Android + PWA Hardening

---

## The actual problem (corrected from earlier framing)

Code review found the situation is better than the initial "PWA timer breaks when phone is idle" framing suggested:

- ✅ **Timer is already drift-resistant.** [`app/modules/entry-types/timed/TimedInput.vue`](../../app/modules/entry-types/timed/TimedInput.vue) computes elapsed time from a stored `sessionStartTime` (a `Date.now()` timestamp), not a counter. Backgrounding/visibility changes don't desync the displayed time.
- ✅ **Wake Lock is already wired to sessions.** `requestWakeLock()` is called on `beginSession()` and released on `stopTimer()` (around lines 603 and 729). Screen stays on while the session page is foregrounded.
- ✅ **Service worker already handles push notifications.** [`app/workers/sw.ts`](../../app/workers/sw.ts) has a `push` listener and `showNotification` plumbing for weekly rhythms.
- ❌ **Bells stop firing when the phone is locked or the app is backgrounded.** The JS event loop suspends, `setInterval` doesn't tick, `<audio>` doesn't play. This is the real pain.
- ❌ **No service-worker-scheduled notifications.** The SW only fires on incoming push from the server — nothing schedules local notifications when a session starts.

The path splits into two halves that share most of the codebase:

1. **PWA hardening** — service-worker-scheduled bells, recovery UX, honest "screen off" mode. Benefits all users (web + future Android) and is the foundation for Capacitor.
2. **Capacitor Android** — wraps the existing Nuxt frontend, adds reliable local notifications + foreground service for sessions.

---

## Goals & success criteria

**A successful Android v1 ships when:**

1. User starts a 20-minute session, locks phone, puts it in pocket → bells fire at intervals, completion sound plays at 20 min ✅
2. Same flow works on PWA in latest Chrome with screen on / browser foregrounded ✅
3. Existing voice capture, wins flow, and sync to server work in the Android shell ✅
4. App is signed, listed, and live on Google Play Store ✅
5. F-Droid submission accepted (or in queue) — aligned with AGPL ethos ✅

**Explicit non-goals for v1:**

- iOS (deferred until revenue covers $99/yr Apple developer cost)
- Background sync of entries created offline (separate problem — defer)
- Native widgets / home-screen complications
- Tablet/foldable optimisation
- Native voice transcription (keep using server endpoint)

---

## Phase 0 — Decisions to lock before coding (1 hour)

These are blockers; resolve before phase 1 starts.

### D1. API URL strategy for the Android app
Capacitor can't run the Nuxt server in-device. Pick one:

- **(A) Cloud-only Android.** Static frontend in APK; all API calls go to `https://tada.living/api`. Self-hosters use the PWA, not the APK.
- **(B) Configurable backend.** First-run screen lets user enter their server URL. APK ships with `tada.living` default but self-hosters can repoint.

**Recommendation: (B).** Aligned with AGPL ethos, low extra cost (one settings page + URL persistence), unlocks r/selfhosted as an audience for the APK, not just the PWA.

### D2. Auth strategy for WebView
Cookies in Capacitor WebView are flaky across app restarts. Pick one:

- **(A) Stick with cookies + `CapacitorCookies` plugin.** Minimal code change.
- **(B) Migrate to bearer token (JWT) stored via `@capacitor/preferences`.** Cleaner long-term but requires server-side changes too.

**Recommendation: (A) for v1.** Defer JWT migration. If cookies cause real problems, add a token endpoint later.

### D3. Static export vs. SSR for the Capacitor build
The Nuxt app has no SSR routes detected — `nuxi generate` should work. But some pages may not pre-render cleanly.

- **Action:** spike `nuxi generate` once before Phase 1. ~30 min. If it fails, revisit decision.

### D4. Lock versions
Capacitor 7 (current), Android Studio Hedgehog or later, Java 17, Gradle 8.x.

---

## Phase 1 — PWA hardening (3-5 days)

Benefits everyone immediately and the Capacitor build inherits all of it. **Not throwaway** — it's the foundation.

### 1.1 Schedule bell notifications via service worker (1.5 days)

**The core fix.** When a session starts, the page registers scheduled notifications with the SW. The SW fires them via `setTimeout` (or `Notification Triggers` where available) so they survive page suspension.

- Add `scheduleSessionNotifications(intervals: number[], totalMs: number)` in [`app/workers/sw.ts`](../../app/workers/sw.ts).
- Page-side: on `beginSession()`, post a message to SW with bell schedule.
- Page-side: on `stopTimer()` / pause, post a message to clear pending notifications.
- Audio file URL passed in payload so SW can include sound on Android.
- **Caveat: iOS Safari doesn't support `Notification Triggers`.** Document this. Capacitor solves it natively for Android.

### 1.2 Background-friendly bell delivery on the page (0.5 day)

When page IS visible and JS is alive, prefer in-page audio for bells (better latency, no notification spam). Only fall back to SW notifications when page is hidden.

- Visibility check before in-page bell playback.
- SW notification fires only when `document.visibilityState === "hidden"`.

### 1.3 Recovery UX when returning from suspension (0.5 day)

Timer recomputes elapsed correctly, but the user comes back to a stale-looking UI for a frame.

- On `visibilitychange` → `visible`, force immediate `timerTick()` recalc.
- Subtle "session continued in background" toast if elapsed jumped >5s while hidden.

### 1.4 Audio keepalive (silent loop) for iOS PWA users (0.5 day, optional)

Classic iOS Safari trick — play a silent looping audio track to keep the page from being suspended. Ugly but effective.

- Behind a feature flag, off by default. Add only if iOS PWA users complain.

### 1.5 "Screen off" mode toggle in session UI (0.5 day)

Honest UX: a toggle that says "I'll lock my phone — fire bells via notifications" vs. "Screen will stay on." Sets user expectation correctly.

- Default: screen-on (current behaviour).
- Toggle: schedules SW notifications for the whole session, dims the UI.

### 1.6 Update philosophy claim about offline-first (0.25 day)

[`design/philosophy.md`](../../design/philosophy.md) and [`docs/dev/v010-snagging-list.md`](../dev/v010-snagging-list.md) disagree on offline-first status. Either implement entry queueing or update the claim to match reality. Recommend the doc fix for now; full offline queueing is a Phase 7 concern.

**Phase 1 deliverable:** PWA bells reliably fire on Android Chrome with screen locked. iOS still requires native. Limitation documented honestly.

---

## Phase 2 — Static export readiness (1-2 days)

Capacitor needs a static `dist/` to bundle.

### 2.1 Confirm `nuxi generate` builds clean (0.5 day)

- Run `nuxi generate`.
- Identify any pages that error on prerender (likely candidates: dynamic entry routes, admin pages).
- Fix each: add `routeRules` to skip prerender, or refactor to client-render after hydration.

### 2.2 Add `build:capacitor` script (0.25 day)

- Targets static output to a stable path Capacitor can read (`./dist`).
- Sets `NUXT_PUBLIC_API_BASE_URL` env at build time.
- Add to `package.json`: `"build:capacitor": "NUXT_PUBLIC_API_BASE_URL=https://tada.living nuxi generate"`.

### 2.3 Refactor `$fetch` calls to respect API base URL (0.5 day)

Currently API calls use relative paths (`/api/...`). In a static APK these resolve against the WebView origin. Need to rebase.

Two paths — investigate first:
- **Lower-effort:** configure Capacitor's `server.url` to redirect `/api/*` to `https://tada.living/api/*`. No code changes needed.
- **More work:** add a `useApi()` composable that reads `runtimeConfig.public.apiBaseUrl` and prepends to relative paths.

### 2.4 Configurable server URL (0.5 day) — *if D1 = (B)*

- First-run settings page with server URL input.
- Persist via `@capacitor/preferences`.
- Validate URL by hitting `/api/health` before saving.

**Phase 2 deliverable:** `npm run build:capacitor` produces a static `dist/` that talks to a remote backend.

---

## Phase 3 — Capacitor Android shell (2-3 days)

### 3.1 Capacitor init + Android Studio first build (1 day)

- `npx cap init "Ta-Da!" living.tada.app --web-dir=dist`
- `npx cap add android`
- Configure `capacitor.config.ts`: app name, scheme, allow-navigation to `tada.living`.
- Open in Android Studio, build to emulator.
- Hello-world: confirm Nuxt frontend loads inside the WebView.

### 3.2 Cookie + auth flow (0.5 day)

- Install `@capacitor/cookies` (built-in in v7).
- Test login → session cookie persists across app restart.
- If broken: fall back to manual `Set-Cookie` extraction → `@capacitor/preferences` storage. Document workaround.

### 3.3 App icon, splash, manifest (0.5 day)

- Generate Android icon set from `public/icons/icon-512.png`.
- Splash screen via `@capacitor/splash-screen`.
- App name and metadata in `AndroidManifest.xml`.

### 3.4 Deep linking + share target (0.5 day)

- Configure intent filters for `https://tada.living/*` to open in app (App Links).
- Wire the existing `share_target` from PWA manifest to Android share intent.

**Phase 3 deliverable:** A real Android app that loads Ta-Da!, lets you log in, and works for everything except backgrounded sessions.

---

## Phase 4 — Native plugins for session reliability (3-4 days)

This is what makes the native version solve the problem.

### 4.1 Local notifications for bells (1 day)

- Install `@capacitor/local-notifications`.
- Request permission on first session start.
- Bridge: when the page-side session starts, call native API to schedule notifications at all interval times + completion time, with sound from `public/sounds/`.
- Cancel scheduled notifications on pause / stop.
- Test: lock phone, put in pocket, wait 10 min — bell should fire.

### 4.2 Foreground service for active sessions (1 day)

Keeps Android from killing the WebView while a session is running. Shows "Session active — 12:34 elapsed" persistent notification.

- Use `capacitor-foreground-service` community plugin (verify maintenance status — if unmaintained, alternative is a small custom plugin, ~1 extra day).
- Started on `beginSession()`, stopped on `stopTimer()`.
- Notification updates every minute with elapsed time.
- User can tap to return to app, or stop session from the notification.

### 4.3 Wake lock + audio focus (0.5 day)

- Confirm Wake Lock API works in Capacitor WebView (it should — Android 9+ supports it).
- Audio focus: configure `<audio>` to play in `BACKGROUND_AUDIO` category so bells aren't ducked by other apps.

### 4.4 Permission flows (0.5 day)

- Notification permission (Android 13+ runtime grant).
- Battery optimisation exemption prompt (optional but recommended for meditation users).

### 4.5 Bridge between web bells and native bells (0.5 day)

Session UI needs to know: "if running on Android, use native scheduled notifications; if running in browser, use SW scheduled notifications." Single composable handles routing.

- `useSessionNotifications()` returns `schedule()` / `cancel()` that delegates to either native or SW.

**Phase 4 deliverable:** Lock-the-phone meditation works the same as Insight Timer.

---

## Phase 5 — Polish + edge cases (2-3 days)

### 5.1 Lifecycle bugs (1 day)

- App killed mid-session → restart → recover state from localStorage (already partially via `useSessionRecovery`).
- App backgrounded for hours → returning to a finished session shows completion correctly.
- Network drop during sync → entries queue locally, retry on reconnect (partial offline; revisit fully in Phase 7).

### 5.2 Real device testing (1 day)

- Test on at least: 1 budget Android (Samsung A-series or similar), 1 mid-range (Pixel a-series), 1 power-user (Pixel flagship).
- Test on Android 12, 13, 14 if possible (notification permission rules differ).
- Battery impact check: 1 hour session should not drain >5%.

### 5.3 Crash / error reporting (0.5 day)

- Decide: integrate Sentry, or rely on Play Store crash reports.
- Recommend Play Store native reports for v1 (free, no PII concern).

### 5.4 Update tada.living homepage / docs (0.5 day)

- "Available on Google Play" badge once submitted.
- F-Droid badge once accepted.
- iOS users continue with PWA install for now — be explicit.

---

## Phase 6 — Distribution (2-3 days)

### 6.1 Google Play Store submission (1.5 days)

- Pay $25 one-time developer fee. ([Google Play Console](https://play.google.com/console/))
- Generate signing key, store in password manager + backed up off-machine.
- Set up CI signing flow if possible (or document manual signing).
- Listing: short description (80 chars), full description (4000), screenshots (min 2), feature graphic.
- Privacy policy URL → tada.living/privacy.
- Initial review: usually 1-7 days.
- **Target audience: 17+** — declare honestly (no third-party tracking).

### 6.2 F-Droid submission (1 day)

- Fork [fdroiddata](https://gitlab.com/fdroid/fdroiddata).
- Add metadata YAML pointing at the GitHub release.
- Submit MR; reviews are slow (weeks/months) but the listing is signal not volume.
- F-Droid only accepts fully open builds — verify no proprietary deps (Stripe SDK etc. only loaded in cloud-mode, should be fine).

### 6.3 Release notes + announcement plan (0.5 day)

- v1.0 release notes — brief, honest, "Android only for now, iOS waiting on revenue."
- Coordinate with marketing push: r/selfhosted post specifically calls out F-Droid availability.

---

## Risk register

| Risk                                                                          | Likelihood        | Impact                | Mitigation                                                     |
| ----------------------------------------------------------------------------- | ----------------- | --------------------- | -------------------------------------------------------------- |
| Nuxt 4 has a static-export incompatibility we can't easily work around        | Medium            | High (blocks Phase 2) | Spike `nuxi generate` in Phase 0 (30 min) before committing    |
| Capacitor cookie handling breaks auth on real devices                         | Medium            | High                  | Phase 3.2 includes `@capacitor/preferences` fallback path      |
| Foreground service plugin is unmaintained                                     | Medium            | Medium                | Investigate alternatives in Phase 4.2; worst case ~1 extra day |
| Battery optimisation on Samsung/Xiaomi kills sessions despite foreground svc  | High on those OEMs | Medium               | Document OEM-specific battery whitelist steps in onboarding    |
| Play Store rejects for missing privacy policy / data declarations             | Low               | Medium                | Use Phase 6.1 carefully; existing privacy page covers most     |
| `build:capacitor` env-var rebase doesn't work and need real refactor          | Medium            | Medium                | Phase 2.3 has two paths (server.url config OR composable)      |
| iOS users feel left behind, write negative reviews on PWA                     | Low               | Low                   | Be loud about "Android first because solo project + costs"     |

---

## Effort summary

| Phase                  | Days  | Cumulative |
| ---------------------- | ----- | ---------- |
| 0. Decisions + spike   | 0.5   | 0.5        |
| 1. PWA hardening       | 3-5   | 4-5.5      |
| 2. Static export       | 1-2   | 5-7.5      |
| 3. Capacitor shell     | 2-3   | 7-10.5     |
| 4. Native plugins      | 3-4   | 10-14.5    |
| 5. Polish              | 2-3   | 12-17.5    |
| 6. Distribution        | 2-3   | 14-20.5    |

**Realistic range: 3-4 weeks of focused solo work.** Hobbyist pace (evenings + some weekends): 6-10 weeks.

---

## What we're NOT doing (hold the line)

- **iOS native.** Wait for revenue. Capacitor makes it a 1-2 week add-on later.
- **Tablet UI.** Phone-first. Tablet works because PWA, but no special layout.
- **Wear OS / watch face.** Out of scope.
- **Background sync of all entries.** Sessions handle the lock-screen problem; full offline-first sync is a separate project. Defer to Phase 7+.
- **Replace the PWA.** Web stays. Android is *additional*. Self-hosters keep using PWA on whatever device.

---

## Decision points / off-ramps

- **End of Phase 0:** if `nuxi generate` doesn't work cleanly, escalate decision — either invest extra refactoring days or pivot to Capacitor with `server.url=https://tada.living` (loads remote, no static bundle). Less ideal but viable.
- **End of Phase 1:** if PWA bells now work well enough on Android Chrome with screen locked, **consider stopping there** for a couple of weeks. See if real users still ask for native before doing phases 2-6.
- **End of Phase 4:** if foreground service work balloons, accept "session must be foregrounded" as a v1 limitation, document, ship.
- **Phase 6 stalls:** if Play Store review drags >2 weeks, ship F-Droid first and add Play Store later.

---

## Immediate next steps

1. **30-min spike: run `nuxi generate` in this repo.** Note errors. (Phase 0 D3.)
2. **Pick D1 = (B)** unless there's a reason against — the AGPL-aligned choice.
3. **Start Phase 1.1** (SW-scheduled notifications) — highest-leverage single change and benefits current PWA users immediately.
4. **Marketing/ads campaign parked** — campaign material in `tada.living/REDDIT-CAMPAIGN.md` and `tada.living/POSITIONING.md` stay drafted but unposted until v1.0 native is in beta (or Phase 1 demonstrates the PWA is good enough).

---

## Related docs

**This repo (engineering):**
- [`design/philosophy.md`](../../design/philosophy.md) — needs offline-first claim updated (Phase 1.6)
- [`design/decisions.md`](../../design/decisions.md) — records the May 2026 decision to add native Android alongside the PWA
- [`design/roadmap.md`](../../design/roadmap.md) — v0.7.0 theme is this work; post-v0.7.0 candidates listed there
- [`design/alternatives.md`](../../design/alternatives.md) — competitive analysis (older; pointer to marketing-side refresh)

**Marketing repo (`tada.living`):**
- `POSITIONING.md` — three pillars, who-we're-for, anti-claims, Reddit titles
- `REDDIT-CAMPAIGN.md` — marketing tactics, posting schedule (parked until v1.0 native ships)
- `MARKETING-PLAN.md` — overall marketing approach
