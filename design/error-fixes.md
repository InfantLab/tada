# Error Fix Tracker

Tracking progress on fixing TypeScript strict mode errors (220) and ESLint errors (74).

**Goal:** Green CI for both `typecheck` and `lint` jobs (currently `continue-on-error: true`).

---

## Strategy

### Phase 1: Systematic Batch Fixes (125 errors, 57%)

Fix the two dominant TS error categories that can be resolved with consistent patterns:

**Batch A — TS2345: Argument type mismatch (80 errors)**
The `ApiError` class isn't assignable to Nuxt's `createError()` signature. Fix: make `ApiError` extend `Error` or wrap with `createError()`.

**Batch B — TS4111: Index signature access (45 errors)**
Dot notation on index-typed objects (e.g., `event.context.auth`). Fix: use bracket notation `event.context['auth']` or add proper type declarations.

### Phase 2: Null Safety (37 errors)

Fix TS2532/TS18048 (possibly undefined/null) with proper null checks and type narrowing.

### Phase 3: Property/Type Fixes (25 errors)

Fix TS2339 (property doesn't exist) with proper type assertions or interface extensions.

### Phase 4: Remaining (33 errors)

Case-by-case: implicit any, type assertions, misc.

### Phase 5: ESLint (74 errors)

Mostly `no-explicit-any` (36) and `no-unused-vars` (28). Straightforward cleanup.

---

## TypeScript Errors by File (220 total)

### Batch A Candidates (TS2345 — ApiError / createError mismatch)

Most v1 API routes and services throw `ApiError` which doesn't satisfy Nuxt's expected type.

| File | Errors | Status |
|------|--------|--------|
| `server/api/v1/webhooks/[id].patch.ts` | 7 | [ ] |
| `server/api/v1/webhooks/index.post.ts` | 5 | [ ] |
| `server/api/v1/webhooks/[id]/test.post.ts` | 5 | [ ] |
| `server/api/v1/webhooks/[id].delete.ts` | 5 | [ ] |
| `server/api/v1/entries/[id].patch.ts` | 5 | [ ] |
| `server/api/v1/import/insight-timer.post.ts` | 4 | [ ] |
| `server/api/v1/import/csv.post.ts` | 4 | [ ] |
| `server/api/v1/entries/index.get.ts` | 4 | [ ] |
| `server/api/v1/entries/[id].get.ts` | 4 | [ ] |
| `server/api/v1/entries/[id].delete.ts` | 4 | [ ] |
| `server/api/v1/auth/keys/[id].delete.ts` | 4 | [ ] |
| `server/api/v1/auth/keys.post.ts` | 4 | [ ] |
| `server/api/v1/webhooks/index.get.ts` | 3 | [ ] |
| `server/api/v1/import/json.post.ts` | 3 | [ ] |
| `server/api/v1/export/entries.get.ts` | 3 | [ ] |
| `server/api/v1/entries/index.post.ts` | 3 | [ ] |
| `server/api/v1/entries/bulk.post.ts` | 3 | [ ] |
| `server/api/v1/auth/keys.get.ts` | 3 | [ ] |
| `server/services/webhooks.ts` | 4 | [ ] |
| `server/services/import.ts` | 5 | [ ] |
| `server/services/entries.ts` | 2 | [ ] |
| `server/services/export.ts` | 1 | [ ] |
| `server/services/rate-limit.ts` | 1 | [ ] |
| `server/services/stripe.ts` | 2 | [ ] |

### Batch B Candidates (TS4111 — Index signature access)

| File | Errors | Status |
|------|--------|--------|
| `server/middleware/api-v1-auth.ts` | 6 | [ ] |
| `server/utils/permissions.ts` | 5 | [ ] |
| `server/middleware/cors.ts` | 3 | [ ] |
| `plugins/umami.client.ts` | 3 | [ ] |
| `server/api/health.get.test.ts` | 2 | [ ] |
| _Plus occurrences scattered across v1 API routes_ | | |

### High-Error Files (mixed error types)

| File | Errors | Primary Types | Status |
|------|--------|--------------|--------|
| `server/services/insights.ts` | 19 | TS2345, TS2339, TS2532 | [ ] |
| `tests/api/v1/entries.test.ts` | 14 | TS18046, TS2322, TS2339 | [ ] |
| `server/utils/activityMatcher.ts` | 13 | TS2345, TS2538, TS7006 | [ ] |
| `server/api/v1/insights/patterns.get.ts` | 12 | TS2345, TS2339 | [ ] |
| `server/api/v1/insights/correlations.get.ts` | 8 | TS2345, TS2339 | [ ] |
| `server/api/v1/export/obsidian.get.ts` | 7 | TS2345, TS2532 | [ ] |
| `tests/api/v1/export.test.ts` | 5 | TS2339 | [ ] |
| `tests/api/v1/auth.test.ts` | 5 | TS18048 | [ ] |
| `server/api/v1/insights/summary.get.ts` | 4 | TS2345 | [ ] |
| `server/api/activities/category.get.ts` | 4 | TS2345, TS2532 | [ ] |

### Remaining Files (1-3 errors each)

| File | Errors | Status |
|------|--------|--------|
| `server/utils/cache-cleanup.ts` | 3 | [ ] |
| `server/api/voice/transcribe.post.ts` | 3 | [ ] |
| `server/api/voice/structure.post.ts` | 3 | [ ] |
| `server/api/version.get.ts` | 3 | [ ] |
| `tests/api/v1/import.test.ts` | 2 | [ ] |
| `server/api/v1/rhythms/index.get.ts` | 2 | [ ] |
| `server/utils/response.ts` | 1 | [ ] |
| `server/api/health.get.ts` | 1 | [ ] |
| `server/api/auth/update-email.post.ts` | 1 | [ ] |
| `server/api/admin/test-email.post.ts` | 1 | [ ] |
| `nuxt.config.ts` | 1 | [ ] |
| `composables/useOnboarding.ts` | 1 | [ ] |

---

## ESLint Errors by File (74 errors, 4 warnings)

| File | Issues | Primary Rule | Status |
|------|--------|-------------|--------|
| `server/services/insights.ts` | multiple | `no-explicit-any` | [ ] |
| `server/services/entries.ts` | multiple | `no-explicit-any` | [ ] |
| `server/services/export.ts` | multiple | `no-explicit-any` | [ ] |
| `server/services/import.ts` | multiple | `no-explicit-any` | [ ] |
| `server/services/rhythms.ts` | multiple | `no-explicit-any` | [ ] |
| `server/services/webhooks.ts` | multiple | `no-explicit-any` | [ ] |
| `server/api/v1/insights/*.ts` | multiple | `no-explicit-any` | [ ] |
| `server/utils/response.ts` | 2 | `no-explicit-any` | [ ] |
| `server/utils/logger.ts` | multiple | `no-explicit-any` | [ ] |
| `server/db/schema.ts` | multiple | `no-unused-vars` | [ ] |
| `components/*.vue` | multiple | `no-unused-vars` | [ ] |
| `pages/*.vue` | multiple | `no-unused-vars` | [ ] |
| `utils/tierCalculator.ts` | 1 | `no-unused-vars` | [ ] |
| `tests/api/v1/auth.test.ts` | 1 | `no-unused-vars` | [ ] |
| `tests/api/v1/import.test.ts` | 1 | `no-unused-vars` | [ ] |
| `utils/tierCalculator.test.ts` | 1 | `no-unused-vars` | [ ] |
| `scripts/capture-git-info.js` | 1 | misc | [ ] |

---

## Progress Summary

| Phase | Scope | Errors | Fixed | Remaining |
|-------|-------|--------|-------|-----------|
| 1A | TS2345 (ApiError) | 80 | 80 | 0 |
| 1B | TS4111 (index access) | 45 | 45 | 0 |
| 2 | TS2532/18048 (null) | 37 | 37 | 0 |
| 3 | TS2339 (property) | 25 | 25 | 0 |
| 4 | Other TS | 33 | 33 | 0 |
| 5 | ESLint | 74 | 74 | 0 |
| **Total** | | **294** | **294** | **0** |

**Status: ALL ERRORS FIXED** — TypeScript typecheck, ESLint, tests (389/389), and build all pass.

---

_Created: March 2026_
