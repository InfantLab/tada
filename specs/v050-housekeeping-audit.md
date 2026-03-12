# V0.5 Housekeeping Audit

**Date:** 2026-03-10
**Status:** Planning
**Theme:** Administrative release — security hardening, testing, documentation, dependency updates

---

## Audit Summary

Five parallel audits were conducted covering security, dependencies, test coverage, documentation, and code quality.

---

## 1. Security Audit (20 issues found)

### Critical

| # | Issue | Location | Risk |
|---|-------|----------|------|
| 1 | Hardcoded production secrets in `.env` | `app/.env` | Live Stripe keys, Groq API key committed to repo |
| 2 | Session cookie missing `sameSite` attribute | `app/server/utils/auth.ts` | CSRF attacks |
| 3 | Missing `httpOnly` flag on session cookies | `app/server/utils/auth.ts` | XSS cookie theft |

### High

| # | Issue | Location | Risk |
|---|-------|----------|------|
| 4 | No CSP or security headers | `nuxt.config.ts` | Clickjacking, MIME sniffing, etc. |
| 5 | Error responses leak internal details | `app/server/api/entries/index.post.ts` + others | Stack traces, DB schema exposed |
| 6 | In-memory-only rate limiting | `app/server/services/rate-limit.ts` | Lost on restart, no multi-instance |
| 7 | Weak password minimum (6 chars) | `app/server/api/auth/register.post.ts` | Brute-force vulnerability |
| 8 | Missing CSRF token validation | Server-wide | State-changing requests unprotected |

### Medium

| # | Issue | Location | Risk |
|---|-------|----------|------|
| 9 | SSRF in link-preview (no private IP blocking) | `app/server/api/link-preview.get.ts` | Internal network access |
| 10 | Debug token in forgot-password dev response | `app/server/api/auth/forgot-password.post.ts` | Token leakage |
| 11 | No rate limiting on voice transcription | `app/server/api/voice/transcribe.post.ts` | API key exhaustion |
| 12 | CSV import has no size/row limits | `app/server/api/v1/import/csv.post.ts` | DoS via large files |
| 13 | Email validation too permissive | `app/server/api/auth/forgot-password.post.ts` | Invalid email formats |
| 14 | Webhook URL validation gaps (IPv6, DNS rebinding) | `app/server/services/webhooks.ts` | SSRF via webhooks |

### Low

| # | Issue | Location | Risk |
|---|-------|----------|------|
| 15 | Missing security headers (Referrer-Policy, Permissions-Policy) | `nuxt.config.ts` | Information leakage |
| 16 | Console.error instead of logger in some files | `app/server/utils/api-key.ts` + others | Inconsistent logging |
| 17 | Token expiry enforcement needs verification | `app/server/api/auth/verify-reset-token.get.ts` | Stale tokens |

### Positive Findings

- Password hashing: scrypt with strong parameters (N=16384, r=8, p=1)
- API key hashing: bcrypt with cost factor 12
- SQL injection protection: parameterized queries via Drizzle ORM throughout
- Email enumeration prevention: same response whether user exists or not
- Webhook signature validation: HMAC-SHA256
- Session invalidation on password reset: all sessions cleared
- Stripe webhook verification: proper signature checking
- Admin audit logging: auth events logged for admin actions

---

## 2. Dependency Audit

### Critical

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| **lucia** | v3.2.2 | DEPRECATED | Deprecated March 2025. No longer maintained beyond bug fixes. Migration required. |

### High Priority Updates

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| **nuxt** | ^3.15.1 | 4.3.1 | Nuxt 3 EOL July 2026 — migration needed soon |
| **stripe** | ^17.5.0 | 20.4.0 | 3 major versions behind |

### Medium Priority Updates

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| **typescript** | ^5.7.2 | 5.9.3 | 2 minor versions behind |
| **@libsql/client** | ^0.14.0 | 0.17.0+ | Several minor versions behind |
| **zod** | 3.23.8 (pinned) | 4.3.6 | Major behind, v3 still maintained |
| **tailwindcss** | ^3.4.17 | 4.2.1 | Major behind, v3 still works |

### Current (No Action)

- vitest 3.0, @vue/test-utils 2.4, eslint 9.x, nodemailer 7.x, papaparse 5.5, nanoid 5.x, happy-dom 16.x — all current.

### No Unused Dependencies Detected

All major packages verified as used in the codebase.

---

## 3. Test Coverage (~3.5% of source files)

### What Exists

- **41 test files** (8,912 lines of test code)
- Good coverage: error tracking, password hashing, CSV parsing, category defaults, column detection, entry registry
- Partial: 4 of 149+ API endpoints tested, 3 of 18 composables, 1 of 14 services

### Major Gaps

| Area | Files | Tested | Coverage |
|------|-------|--------|----------|
| API Endpoints | 149+ | 4 | ~2.7% |
| Server Services | 14 | 1 | ~7% |
| Server Utils | 19 | 8 | ~42% |
| Composables | 18 | 3 | ~17% |
| Components | 62 | 0 | 0% |
| Pages | 29 | 0 | 0% |

### Untested Critical Areas

- **Authentication** — login, register, password reset, email verification, session management, permission checking (0 tests)
- **Billing/Stripe** — checkout, portal, webhooks, subscription management (0 tests)
- **Admin API** — all new endpoints (0 tests)
- **Sync Engine** — orchestration, conflict detection, content hashing (0 tests)
- **Voice/Transcription** — transcription, LLM structuring (0 tests)
- **Entry Drafts** — draft CRUD and commit workflow (0 tests)
- **Webhooks** — management, dispatch, retry, signatures (0 tests)
- **Import/Export** — CSV/JSON processing beyond unit-level CSV parser tests (0 tests)

### Other Issues

- 7 failing tests in `server/utils/logger.test.ts`
- Integration tests in `tests/api/` marked for rewrite with `@nuxt/test-utils/e2e`
- Coverage tool (`@vitest/coverage-v8`) blocked by Bun not implementing `node:inspector`

---

## 4. Documentation Review

### Strengths (Score: 9/10 completeness)

- README.md — comprehensive, current
- API-SPECIFICATION.md — 1,414 lines, complete reference
- Deployment docs — excellent (CapRover, Docker, self-hosted)
- Module docs — all 6 modules documented
- Architecture docs — philosophy, ontology, decisions, schema, style guide
- CHANGELOG.md — detailed version history

### Issues Found

| Issue | Location | Priority |
|-------|----------|----------|
| Version says "v0.3.0" | AGENTS.md line 57 | High |
| Spec 008 Admin API not in API docs | docs/tada-api/API-SPECIFICATION.md | High |
| Specs 001-005 marked "Draft" (completed) | specs/ | Medium |
| No CONTRIBUTING.md | Project root | Medium |
| "Current State (v0.2.0)" | docs/DEVELOPER_GUIDE.md line 57 | Medium |
| docs/README.md "Last Updated: 2026-02-04" | docs/README.md | Medium |
| package.json version still 0.4.2 | app/package.json | Medium |
| Several plan docs reference v0.2.0 | docs/plans/ | Low |

---

## 5. Code Quality

### Issues

| Issue | Location | Priority |
|-------|----------|----------|
| 30+ console.log debug statements | `app/composables/useTranscription.ts` | Medium |
| Silent `.catch(() => {})` handlers | `app/pages/rhythms.vue` (lines 77, 101) | Medium |
| `db: any` type (4 instances) | `app/server/services/entryEngine.ts` | Low |
| `console.log("Settings saved")` | `app/pages/settings.vue` line 569 | Low |

### Positive Findings

- Accessibility: excellent (proper ARIA roles, semantic HTML, alt text throughout)
- Environment handling: clean dev/prod separation, no env leaks
- ESLint: properly configured with Nuxt-specific rules
- No dead code detected
- Minimal code duplication
- No `@ts-ignore` in source code
- 9 TODOs all for planned future features (well-managed)

---

## Prioritized Action Plan

### Tier 1 — Must Do (security & critical debt)

- [x] 1. **Rotate exposed secrets** — Stripe & Groq keys rotated, separate keys for local dev and production
- [x] 2. **Fix session cookie security** — add `sameSite: "lax"`, `httpOnly: true` to `auth.ts`
- [x] 3. **Add security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy via Nitro config
- [x] 4. **Sanitize error responses** — generic messages in production, detailed logs server-side only
- [x] 5. **Lucia auth migration** — DONE. Removed `lucia`, `@lucia-auth/adapter-drizzle`, `oslo`. Replaced with ~160 lines of direct session management in `auth.ts`. See [lucia-migration-plan.md](lucia-migration-plan.md).
- [x] 6. **Increase password minimum** to 8-12 characters

### Tier 2 — Should Do (testing, upgrades & Nuxt migration planning)

- [ ] 7. **Plan Nuxt 4 migration** — Nuxt 3 EOL July 2026, start compatibility testing now
- [ ] 8. **Add auth endpoint tests** — login, register, password reset (highest-risk untested area)
- [ ] 9. **Add entry CRUD tests** — core user workflow
- [ ] 10. **Fix 7 failing logger tests**
- [ ] 11. **Update Stripe SDK** 17 → 20
- [ ] 12. **Update TypeScript** 5.7 → 5.9
- [ ] 13. **Update @libsql/client** 0.14 → 0.17
- [ ] 14. **Block private IPs in link-preview** (SSRF fix)
- [ ] 15. **Add CSV import size limits**

### Tier 3 — Should Do (docs & quality)

- [ ] 16. **Document Admin API** in API-SPECIFICATION.md
- [ ] 17. **Update version references** across all docs (AGENTS.md, DEVELOPER_GUIDE, etc.)
- [ ] 18. **Mark completed specs** (001-005) as "Completed"
- [ ] 19. **Bump package.json** to 0.5.0
- [ ] 20. **Clean up console.log** in useTranscription.ts
- [ ] 21. **Create CONTRIBUTING.md**
- [ ] 22. **Update CHANGELOG** unreleased section for v0.5.0

### Tier 4 — Nice to Have (longer-term, track for v0.6.0)

- [ ] 23. **Execute Nuxt 4 migration** (if not done in Tier 2)
- [ ] 24. **Lucia auth migration execution**
- [ ] 25. **Add admin API tests**
- [ ] 26. **Add sync engine tests**
- [ ] 27. **Add billing/Stripe tests**
- [ ] 28. **Persistent rate limiting** (Redis or DB-backed)
- [ ] 29. **Replace `db: any`** with proper Drizzle types in entryEngine.ts
- [ ] 30. **Consider Tailwind v4** upgrade
- [ ] 31. **Consider Zod v4** upgrade
- [ ] 32. **Add component tests** (phased, starting with critical forms)
- [ ] 33. **Add E2E tests** with Playwright

---

## Recommendations for Tada Living (Live Site)

These are suggestions for the site manager of the production deployment:

1. **Rotate all API keys immediately** — Stripe live keys, Groq API key, and webhook secrets are exposed in the repo
2. **Verify session cookie settings** — ensure `httpOnly`, `secure`, and `sameSite` are set in production
3. **Add security headers** — configure at reverse proxy/CDN level if not in app: CSP, HSTS, X-Frame-Options
4. **Review rate limiting** — current in-memory implementation resets on server restart
5. **Monitor for unauthorized Stripe activity** — keys were exposed; check for unusual charges/API calls
6. **Set up automated dependency scanning** — GitHub Dependabot or similar for security advisories
7. **Back up database** before v0.5.0 deployment
8. **Test password reset flow** — verify token expiry is enforced in production
9. **Review CORS origins** — ensure only expected domains are allowlisted
10. **Consider WAF** — Web Application Firewall for additional protection layer

---

## Scope Decision

**For v0.5.0:** Tiers 1-3 (items 1-22)
**Tracked for v0.6.0:** Tier 4 (items 23-33)
