# Ta-Da! v0.5.0 Release Notes

**Release Date:** March 2026
**Codename:** Clean House

---

## What's New in v0.5.0

A comprehensive housekeeping release. No new user-facing features — instead, a full security audit, dependency modernization, test coverage expansion, and infrastructure hardening. 32 of 33 audit items completed across five parallel audits.

---

## Highlights

### Security Hardening (20 Issues Addressed)

A full security audit identified 20 issues across critical, high, medium, and low severity. All critical and high issues are resolved:

- **Lucia auth removed** — the deprecated authentication library was replaced with ~160 lines of direct session management. Removed `lucia`, `@lucia-auth/adapter-drizzle`, and `oslo` dependencies entirely.
- **Session cookies hardened** — `httpOnly: true`, `sameSite: "lax"`, and `secure` flag in production
- **Security headers** — new middleware adds CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and HSTS
- **SSRF protection** — link-preview endpoint now blocks private IPv4/IPv6 ranges and metadata endpoints
- **Error sanitization** — production error responses no longer leak stack traces or database schema details
- **Password policy** — minimum increased from 6 to 8 characters
- **CSV import limits** — 5 MB file size and 50,000 row maximum
- **Persistent rate limiting** — moved from in-memory to SQLite-backed `rateLimits` table, survives restarts

### Dependency Modernization

| Package | Before | After |
|---------|--------|-------|
| **Nuxt** | 3.15.1 | 4.4.2 |
| **Stripe** | 17.5.0 | 20.4.1 |
| **TypeScript** | 5.7.2 | 5.9.3 |
| **Zod** | 3.23.8 | 4.3.6 |
| **@libsql/client** | 0.14.0 | 0.17.0 |
| **@nuxt/test-utils** | — | 4.0 |
| **@vite-pwa/nuxt** | — | 1.1.1 |

Removed `@nuxt/devtools` (bundled in Nuxt 4) and all Lucia-related packages.

### 209 New Tests

Test coverage expanded significantly across the most critical untested areas:

| Area | New Tests |
|------|-----------|
| Auth endpoints (login, register, logout, password change, sessions) | 38 |
| Entry CRUD operations | 33 |
| Admin API (users, stats, sessions) | 26 |
| Sync engine (content hashing, conflicts, operations) | 25 |
| Billing/Stripe (checkout, portal, webhooks, subscriptions) | 40 |
| Component tests (login, forgot-password, reset-password) | 47 |
| **Total** | **209** |

Plus 4 Playwright E2E smoke tests and fixes for 7 previously failing logger tests.

### Structured Logging

- Request IDs generated per request via `00.request-id.ts` middleware
- `console.error` migrated to structured logger in server code
- Logger supports timestamps, levels, prefixes, and arbitrary context

### Unified Error Responses

All 73+ API endpoints now return a consistent structured error format:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details": {} } }
```

Previously, internal endpoints used raw `{ statusCode, statusMessage }` while v1 endpoints used structured helpers. Now every endpoint uses shared helpers (`apiError`, `unauthorized`, `notFound`, `validationError`, `internalError`, `forbidden`), making error handling predictable for all API consumers.

### Documentation & Quality

- **CONTRIBUTING.md** created — practical guide for new contributors
- **Admin API** fully documented in API-SPECIFICATION.md
- Version references updated to v0.5.0 across all docs
- Specs 001–005 marked as Completed
- Debug `console.log` statements cleaned from `useTranscription.ts` and `VoiceRecorder.vue`
- `db: any` replaced with proper `Database` type in entryEngine.ts
- Fixed Zod v4 `z.record()` calls across 7 files (breaking change: now requires key schema)

---

## What's Deferred

One item deferred to v0.6.0:

- **Tailwind v4** — `@nuxtjs/tailwindcss` module is not yet compatible with v4

---

## Upgrade Notes

**Breaking Changes:** None. All existing data is preserved.

**Self-hosted users:** This is a drop-in upgrade. Back up your database before deploying — the Nuxt 4 migration is low-risk but the framework version jump is significant.

**Production operators:** Review the [Recommendations for Tada Living](specs/v050-housekeeping-audit.md#recommendations-for-tada-living-live-site) section for operational security steps (key rotation, header verification, rate limit monitoring).

---

## Full Audit Details

See [specs/v050-housekeeping-audit.md](specs/v050-housekeeping-audit.md) for the complete audit report covering all 33 items across 5 audit areas (security, dependencies, test coverage, documentation, code quality).

---

## Philosophy

> "Maintenance isn't the boring part — it's what makes everything else possible."

v0.5.0 has no features to announce. That's the point. The security audit found real vulnerabilities. The dependency updates prevent accumulating debt. The 209 new tests catch regressions before users see them. The structured logging makes incidents debuggable. None of this is visible in the UI, but all of it makes the next feature release safer, faster, and more confident.

---

**Thank you for using Ta-Da!**
