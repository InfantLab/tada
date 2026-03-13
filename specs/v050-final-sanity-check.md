# v0.5.0 Final Sanity Check

**Date:** 2026-03-13
**Status:** Audit complete, fixes in progress
**Context:** Final review before v0.5.0 release

---

## v0.5.0 Housekeeping Audit Status

**32 of 33 items complete.** Only #30 (Tailwind v4) remains deferred — `@nuxtjs/tailwindcss` module not yet compatible with v4.

---

## 1. Logging — GOOD (one critical fix applied)

### Strengths
- All `console.error` migrated to structured JSON logger
- Request IDs generated per request via middleware
- LOG_LEVEL env var filtering (debug/info/warn/error)
- Duration tracking for slow requests (>2s) and all errors
- Separate combined.log and error.log with rotation

### Issues Found & Fixed
- [x] **Middleware order** — `request-id.ts` ran after `auth.ts` alphabetically. Renamed to `00.request-id.ts` so it runs first.
- [x] **Synchronous file I/O** — `appendFileSync` in logger.ts blocked the event loop on every log. Replaced with async buffered writes.

### Issues Deferred
- [ ] ~47 internal API endpoints (non-v1) don't include `userId`/`requestId` in error catch blocks — the global error handler catches these, but per-endpoint context would be richer.
- [ ] requestId not yet included in error response bodies for user support.

---

## 2. Error Handling — INCONSISTENT (tracked for v0.6.0)

### Server-side
- **Two error formats:** Most endpoints use `statusMessage`, but `preferences.put.ts` uses `message`
- **Split patterns:** v1 API uses structured `response.ts` utilities (`apiError()`, `validationError()`), internal API uses raw `createError()`
- **No requestId in error responses** — users can't reference errors when contacting support

### Client-side
- Toast system works well (`useToast` composable with success/error/warning/info)
- Error handling is **copy-paste ad-hoc** across composables — no DRY helper
- Raw technical error messages sometimes leak to users
- `X-Request-Id` header is never extracted or shown to users

### Recommendation for v0.6.0
1. Create `useApiError()` composable — DRY error extraction, user-friendly messages, requestId display
2. Standardize all server endpoints on `response.ts` utilities
3. Include requestId in error response bodies

---

## 3. Security — GOOD

### Strengths
- Session cookies: `httpOnly`, `sameSite: "lax"`, `secure` in production
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Persistent SQLite-backed rate limiting (survives restarts)
- SSRF protection: private IP blocking on link-preview (IPv4, IPv6, metadata endpoints)
- Input validation: Zod schemas on v1 endpoints
- Password hashing: scrypt with strong parameters
- API key hashing: bcrypt cost 12

### Gaps
- **No HSTS header** — should add `Strict-Transport-Security`
- **No explicit CSRF tokens** — relying on `sameSite: "lax"` only (acceptable for this app type)
- **CSP uses `unsafe-inline`/`unsafe-eval`** — required by Vue/Nuxt, acceptable trade-off

### Production Reminders
- Ensure .env with real API keys stays gitignored and keys are rotated
- Monitor Stripe dashboard for unauthorized activity (keys were previously exposed)

---

## 4. Dependencies — EXCELLENT (Grade A)

| Package | Version | Status |
|---------|---------|--------|
| nuxt | 4.4.2 | Current |
| stripe | 20.4.1 | Current |
| drizzle-orm | 0.38.3 | Current |
| zod | 4.3.6 | Current |
| typescript | 5.9.3 | Current |
| vitest | 3.0.0 | Current |
| @playwright/test | 1.58.2 | Current |
| tailwindcss | 3.4.17 | Current (v4 deferred) |
| @vite-pwa/nuxt | 1.1.1 | Current |
| eslint | 9.17.0 | Current |

- No deprecated packages
- No security advisories
- **Gap:** No Dependabot/Renovate configured for automated updates

---

## 5. Architecture & Tools — SOLID

### Strengths
- Drizzle + SQLite well-suited for single-server personal tracker
- No N+1 queries, cursor-based pagination throughout
- Virtual scrolling on timeline (VirtualTimeline.vue)
- SSR enabled with payload extraction
- PWA with proper workbox caching strategies
- Self-registering module architecture is clean and extensible

### Refactoring Candidates (non-urgent)
- `rhythmCalculator.ts` (801 lines) — complex but single-purpose, could split chain type logic
- `syncEngine.ts` (423 lines) — sync resolution logic
- `webhooks.ts` (444 lines) — delivery + retry logic
- Duplicated auth checks (`event.context.user` guard) across ~28 endpoints — could extract to shared utility

---

## 6. Performance — GOOD (one critical fix applied)

### Issues Found & Fixed
- [x] **Synchronous logger I/O** — `appendFileSync` blocked the event loop. Replaced with async buffered writes using `appendFile` with periodic flush.

### Current State
- Cursor-based pagination with max 100 items per page
- Virtual scrolling for timeline rendering
- Nitro built-in caching available
- Insight cache with 1-hour TTL in SQLite
- esbuild minifier for production builds
- Pre-bundled key dependencies in Vite config

### Gaps (non-urgent)
- **No APM** — No Sentry, Datadog, or similar. Structured logging provides basic observability.
- **No bundle analysis** — No vite-bundle-analyzer configured
- **Database indexes** — Exist via migration (`0003_add_performance_indexes.sql`) but not declared in Drizzle schema. Risk: fresh installs may miss them if migrations aren't run.

---

## Priority Actions Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Fix middleware order (request-id runs too late) | Critical | Done |
| 2 | Switch logger to async file writes | Critical | Done |
| 3 | Add HSTS header | High | Tracked |
| 4 | Create client-side `useApiError` composable | High | v0.6.0 |
| 5 | Add userId/requestId to internal API error logs | Medium | v0.6.0 |
| 6 | Standardize server error format | Medium | v0.6.0 |
| 7 | Add Dependabot config | Low | v0.6.0 |
| 8 | Add Sentry or similar APM | Low | v0.6.0 |
| 9 | Declare indexes in Drizzle schema | Low | v0.6.0 |

---

## Verdict

**v0.5.0 is ready for release.** The housekeeping audit is effectively complete (32/33), logging is comprehensive and useful, security posture is strong, dependencies are current, and architecture is sound. The remaining items (error handling DRY-up, APM, HSTS) are improvements for v0.6.0, not blockers.
