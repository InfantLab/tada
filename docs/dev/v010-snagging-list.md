# v0.1.0 Snagging List

**Created:** January 10, 2026  
**Status:** Pre-release checklist  
**Goal:** Identify gaps between SDR/roadmap claims and actual implementation

---

## Summary

The roadmap claims v0.1.0 MVP is complete, but several features are placeholders or partially implemented. This document lists all issues that need resolution before v0.1.0 can be considered production-ready.

**Legend:**

- 🔴 **Blocker** — Must fix before release
- 🟡 **Important** — Should fix, affects user experience
- 🟢 **Minor** — Nice to have, can defer to v0.1.1

---

## 0. Authentication & Login

### 0.1 🔴 No User Login System

**SDR Claim:** "Simple auth (optional password for self-hosted)" is listed in Phase 1  
**Reality:** No login page, no auth flow, no user management whatsoever.  
**Impact:** Anyone with network access to the app can see all data. No privacy for self-hosters on shared networks.  
**Files:** No auth-related pages exist (`/login`, `/register`, etc.)  
**Fix Options:**

1. Implement basic password protection (single user, simple PIN or password)
2. Remove auth from v0.1.0 scope and document "single-user, local-only" limitation
3. Add HTTP Basic Auth at nginx/reverse proxy level as workaround

### 0.2 🔴 Auth is Placeholder Only

**Files:** [schema.ts](../../app/server/db/schema.ts#L8-L28) — `users` and `sessions` tables exist but unused  
**Issue:** Database schema has auth tables, but no Lucia Auth integration, no login endpoints, no session management.  
**Impact:** Misleading — looks like auth is implemented but it's not.  
**Fix:** Either implement Lucia Auth or remove auth tables from schema for v0.1.0.

---

## 1. PWA & Installability

### 1.1 🔴 PWA Icons Missing

**File:** [nuxt.config.ts](../../app/nuxt.config.ts#L42-L56)  
**Issue:** Config references `/icons/icon-192.png` and `/icons/icon-512.png` but the `public/icons/` directory doesn't exist.  
**Fix:** Create PWA icons or use a placeholder. Without these, PWA install will fail on most devices.

### 1.2 🟡 Favicon Missing

**File:** [nuxt.config.ts](../../app/nuxt.config.ts#L90)  
**Issue:** Config references `/favicon.png` — verify it exists.  
**Fix:** Add favicon to `public/` directory.

### 1.3 🟡 No Offline-First Architecture

**SDR Claim:** "Full functionality offline, sync when connected"  
**Reality:** No IndexedDB implementation, no service worker data caching, no background sync.  
**Impact:** App will not work offline beyond cached static assets.  
**Recommendation:** Either implement basic offline support OR update roadmap to move this to v0.2.0.

---

## 2. Timer Page

### 2.1 🟡 Wake Lock API Not Implemented

**File:** [timer.vue](../../app/pages/timer.vue#L247)  
**Issue:** There's a `// TODO: Implement wake lock API` comment. Screen will turn off during meditation.  
**Fix:** Implement `navigator.wakeLock.request('screen')` with proper error handling.

### 2.2 🟡 No Start Bell (Start/End Should Be Configurable Separately)

**SDR Claim:** "Start bell (optional), End bell (optional), Interval bells"  
**Reality:** Only end bell is implemented. No start bell, no interval bells.  
**Required:** Start and end bells should be independently configurable with different sounds.  
**Fix:** Add start bell selector in timer settings panel (separate from end bell). Interval bells can defer to v0.2.0.

### 2.3 🟢 Timer Presets Not Persisted

**SDR Claim:** "Users can save timer configurations as presets"  
**Reality:** Presets are hardcoded. Database has `timer_presets` table but no API or UI to use it.  
**Recommendation:** Defer full preset save/load to v0.2.0, but document this limitation.

### 2.4 🟢 Custom Minutes UX Issue

**File:** [timer.vue](../../app/pages/timer.vue#L318-L332)  
**Issue:** "Custom" preset button doesn't properly activate — clicking it does nothing (`preset.seconds === -1 ? null`).  
**Fix:** Custom button should set a flag to show the input field.

### 2.5 🟢 Settings Panel Bell Mismatch

**Issue:** Timer settings panel shows bell options: Bell, Chime, Gong, Gong2, Cymbal, None.  
Settings page shows: Tibetan Bowl, Meditation Bell, Crystal Singing Bowl, Soft Gong.  
**Fix:** Unify bell sound options across both locations.

---

## 3. Habits Page

### 3.1 🔴 Habits Page is Non-Functional Placeholder

**File:** [habits.vue](../../app/pages/habits.vue#L23-L25)  
**Issue:** Page shows empty state with "Create your first habit" button that does nothing. No habits API exists.  
**SDR Claim:** Habits are Phase 2, but roadmap marks "Habits page scaffolding" as complete.  
**Options:**

1. Remove habits from nav until v0.2.0
2. Add a "Coming in v0.2" message instead of fake button
3. Keep as-is but update roadmap to say "placeholder only"

### 3.2 🟡 Add Habit Button Non-Functional

**File:** [habits.vue](../../app/pages/habits.vue#L65-L78)  
**Issue:** "New Habit" button in header has no click handler.  
**Fix:** Either disable with tooltip "Coming soon" or remove until v0.2.0.

---

## 4. Journal Page

### 4.1 � Empty State Buttons Non-Functional

**File:** [journal.vue](../../app/pages/journal.vue#L127-L136)  
**Issue:** "Record a dream" and "Celebrate a win" buttons have no click handlers — they do nothing when clicked.  
**User Impact:** Confusing UX, buttons appear broken.  
**Fix:** Link to `/add?type=dream` and `/add?type=tada` respectively.

### 4.2 🟢 "Journal" Type Filter Mismatch

**File:** [journal.vue](../../app/pages/journal.vue#L100)  
**Issue:** Filter shows "journal" option but add page doesn't have "journal" as an entry type (only tada, dream, note, meditation).  
**Fix:** Either add "journal" to add page types or remove from filter.

---

## 5. Add Entry Page

### 5.1 🟢 Missing Entry Types from SDR

**SDR Types:** timed, reps, gps_tracked, measurement, journal, tada, experience, consumption  
**Add Page Types:** tada, dream, note, meditation  
**Impact:** Limited entry types for MVP. Acceptable, but should document.

### 5.2 🟢 Meditation Type Creates Wrong Entry

**File:** [add.vue](../../app/pages/add.vue#L63-L74)  
**Issue:** Selecting "Meditation" in add page creates a manual entry, but real meditation entries should come from timer with duration data.  
**Recommendation:** Remove "meditation" from quick-add OR clarify it's for logging past sessions.

---

## 6. Settings Page

### 6.1 🟡 Settings Not Loaded on Mount

**File:** [settings.vue](../../app/pages/settings.vue#L37-L39)  
**Issue:** Settings are saved to localStorage but never loaded back. Refreshing page resets to defaults.  
**Fix:** Add `onMounted` hook to load settings from localStorage.

### 6.2 🟡 Settings Don't Affect Timer

**Issue:** Default timer duration and bell sound in settings don't propagate to timer page.  
**Fix:** Timer should read from localStorage/settings on mount.

### 6.3 🟢 Theme Toggle Not Implemented

**File:** [settings.vue](../../app/pages/settings.vue#L17)  
**Issue:** Theme selection UI exists but doesn't actually change the theme.  
**Fix:** Implement dark mode toggle with localStorage persistence.

### 6.4 🟢 Notifications Toggle Placeholder

**Issue:** Notifications setting exists but there's no notification system.  
**Recommendation:** Hide or disable until v0.3.0.

---

## 7. Entry Detail Page

### 7.1 🟢 Tags Not Editable

**File:** [entry/[id].vue](../../app/pages/entry/[id].vue)  
**Issue:** Tags are displayed but there's no UI to add/remove them.  
**Fix:** Add tag editing UI or defer to v0.2.0.

---

## 8. API & Data

### 8.1 � Hardcoded Default User (No Auth)

**Files:** All API endpoints  
**Issue:** All endpoints use `"default-user"` with no actual user management.  
**SDR Claim:** "Simple auth (optional password for self-hosted)" is Phase 1  
**Reality:** No auth at all, just a hardcoded user ID. No login, no sessions, no password protection.  
**Impact:** Zero security — anyone on the network can access all data.  
**Fix:** See Section 0 for auth implementation options.

### 8.2 � Timeline Shows No Entries

**File:** [index.vue](../../app/pages/index.vue), [index.get.ts](../../app/server/api/entries/index.get.ts)  
**Issue:** Timeline page may show empty even when entries exist in database.  
**Possible Causes:**

1. API sorts by `timestamp` but timer entries use `startedAt` — entries may not appear in expected order or at all
2. `default-user` not created before first entry query
3. Entry timestamps may be malformed  
   **Impact:** Core functionality broken — users can't see their data.  
   **Fix:** Debug API response, ensure proper sorting with `COALESCE(timestamp, startedAt, date, createdAt)`.

### 8.3 �🟢 Entry Sorting May Be Inconsistent

**File:** [index.get.ts](../../app/server/api/entries/index.get.ts#L29)  
**Issue:** Sorts by `timestamp` but timer entries use `startedAt`. May cause ordering issues.  
**Fix:** Use `COALESCE(timestamp, startedAt, date, createdAt)` or similar.

### 8.4 🟢 No Pagination

**Issue:** API returns up to 100 entries with no pagination. Will be slow for heavy users.  
**Recommendation:** Acceptable for v0.1.0, add pagination in v0.2.0.

---

## 9. Code Quality

### 9.1 🟢 Version Defined in Multiple Places

**Files:** [settings.vue](../../app/pages/settings.vue#L8), [nuxt.config.ts](../../app/nuxt.config.ts#L25)  
**Issue:** `appVersion` is hardcoded in both files.  
**Fix:** Use `useRuntimeConfig().public.appVersion` everywhere.

### 9.2 🟢 Console.log Usage

**Issue:** Some files use `console.log` instead of `createLogger`.  
**Fix:** Run grep and replace with structured logging.

---

## 10. Documentation

### 10.1 🟡 Roadmap Claims v0.1.0 Complete

**File:** [roadmap.md](../../design/roadmap.md#L8)  
**Issue:** Roadmap says "Completed January 2026" but multiple features are placeholders.  
**Fix:** Update roadmap to accurately reflect what's done vs placeholder.

### 10.2 🟢 No User-Facing README

**Issue:** README is developer-focused. No user guide for self-hosting.  
**Recommendation:** Add basic "Getting Started" for end users.

---

## Action Plan

### Before v0.1.0 Release (Blockers)

1. [ ] **Fix Timeline** — Debug why entries don't display
2. [ ] **Auth decision** — Either implement basic password protection OR document "local-only" limitation clearly
3. [ ] **Fix journal buttons** — "Record a dream" and "Celebrate a win" must work
4. [ ] Create PWA icons (192x192, 512x512)
5. [ ] Fix or hide non-functional habits page
6. [ ] Update roadmap to reflect actual state

### Should Fix for v0.1.0

7. [ ] Implement Wake Lock API for timer
8. [ ] Load settings from localStorage on mount
9. [ ] Add start bell to timer
10. [ ] Settings should affect timer defaults

### Can Defer to v0.1.1

11. [ ] Custom minutes input UX
12. [ ] Bell sound option consistency
13. [ ] Theme toggle implementation
14. [ ] Tag editing in entry detail
15. [ ] Single source for version number

---

_Last updated: January 10, 2026_
