# Logging Audit: Comprehensive & Useful Logging for Troubleshooting

**Date:** 2026-03-13
**Status:** Complete (Phases 1-3)
**Context:** Follow-up from v0.5.0 housekeeping audit (item #16: console.error instead of logger)

---

## Current State

### What Exists

- **Structured JSON logger** (`app/server/utils/logger.ts`) with timestamps, levels, prefixes, and arbitrary context
- **Rotating log files** — `combined.log` + `error.log` with 10MB rotation, 5-file retention
- **Global error handler plugin** (`app/server/plugins/error-handler.ts`) — catches uncaught exceptions, unhandled rejections, and logs all 4xx/5xx responses
- **Auth event logging** via `logAuthEvent()` for security-sensitive actions
- **~60 files** use `createLogger()` with namespaced prefixes (e.g., `api:auth:login`, `api:entries:post`)

### What's Good

- JSON-structured output — machine-parseable, ready for log aggregation
- Consistent prefix naming convention (`api:module:action`)
- Error logs capture stack traces and error names
- Separate error.log file for quick triage
- Auth events tracked with userId for audit trail

---

## Problems Found

### 1. Split Logging: 27 v1 API files use raw `console.error` (HIGH)

The entire `/api/v1/` surface (REST API, webhooks, import/export, insights, sync) uses `console.error()` instead of the structured logger. These errors are unstructured, have no timestamps, no prefixes, and no context — making them nearly impossible to search or correlate.

**Files affected:**
- `api/v1/entries/` — index.get, index.post, [id].get, [id].patch, [id].delete, bulk.post
- `api/v1/webhooks/` — index.get, index.post, [id].patch, [id].delete, [id]/test.post
- `api/v1/auth/` — keys.get, keys.post, keys/[id].delete
- `api/v1/import/` — csv.post, json.post, insight-timer.post
- `api/v1/export/` — entries.get, obsidian.get
- `api/v1/insights/` — summary.get, patterns.get, correlations.get
- `api/v1/sync/` — trigger.post
- `api/v1/rhythms/` — index.get

### 2. No Request IDs (HIGH)

Zero instances of request ID generation or propagation. When a user reports "I got an error," there is no way to find their specific request in logs. This is the single biggest gap for user support.

### 3. Inconsistent userId in Error Logs (MEDIUM)

Internal API endpoints (e.g., entries CRUD) include `userId` on success logs but not consistently on error logs. The v1 API endpoints don't log userId at all.

### 4. No Request Timing (MEDIUM)

The error handler logs status codes for failed requests but not request duration. Slow queries are invisible — no way to identify performance issues without external tooling.

### 5. No Log Level Filtering (MEDIUM)

Everything from `debug` to `error` is logged in all environments. Production will be noisy with debug-level presets/preferences logs, while important warnings get buried.

### 6. Remaining `console.log/error` in Utilities (LOW)

| File | Issue |
|------|-------|
| `server/utils/cache-cleanup.ts` | 4× manual `[Cache Cleanup]` prefixed console.log/error |
| `server/utils/password.ts` | 1× `console.error` for verification errors |
| `server/utils/api-key.ts` | 1× `console.error` for validation errors |
| `server/services/webhooks.ts` | 1× `console.error` for delivery failures |
| `server/services/entries.ts` | 2× `console.error` for bulk operations |
| `server/api/entries/[id].delete.ts` | 1× `console.error` for delete failures |
| `server/api/newsletter/subscribe.post.ts` | 1× `console.error` for subscription errors |

---

## Plan

### Phase 1: Request ID Middleware + Log Level Filtering

**Goal:** Every request gets a unique ID; logs are filterable by environment.

1. **Add request ID middleware** (`server/middleware/request-id.ts`)
   - Generate nanoid per request
   - Attach to `event.context.requestId`
   - Set `X-Request-Id` response header (so users/support can reference it)

2. **Add LOG_LEVEL env var support** to `logger.ts`
   - Default: `debug` in development, `info` in production
   - Skip writing log entries below the configured level
   - No code changes needed in consumers — just the logger core

3. **Update error-handler plugin** to include requestId in all log entries

### Phase 2: Migrate All `console.error/log` to Structured Logger

**Goal:** Every server-side log goes through the structured logger with consistent context.

4. **Migrate 27 v1 API files** — replace `console.error(...)` with `logger.error(...)`, adding `createLogger` import and including `{ userId, requestId }` context

5. **Migrate 7 utility/service files** — cache-cleanup, password, api-key, webhooks, entries service, newsletter, entries delete

6. **Add userId to all error-path logs** — audit each endpoint's catch block to ensure userId is included when available

### Phase 3: Request Timing + Support Helpers

**Goal:** Make slow requests visible and support workflows easy.

7. **Add request duration logging** to error-handler plugin
   - Record `Date.now()` at request start
   - Log duration on completion for requests > 1s (or all 4xx/5xx)
   - Include method, URL, statusCode, durationMs, userId, requestId

8. **Add user-facing error reference** — when returning 500 errors, include the requestId in the response body so users can share it with support:
   ```json
   { "statusCode": 500, "statusMessage": "Something went wrong", "requestId": "abc123" }
   ```

---

## Success Criteria

After implementation, a support workflow should look like:

1. User reports: "I got an error when saving my entry"
2. User provides the `requestId` from the error screen (or support finds it from the timestamp + userId)
3. `grep "abc123" combined.log` returns the full request lifecycle:
   - Request received (method, URL, userId, requestId)
   - What was attempted (entry type, action)
   - What failed (error message, stack trace)
   - How long it took

---

## Files to Modify

| File | Change |
|------|--------|
| `server/utils/logger.ts` | Add LOG_LEVEL filtering |
| `server/middleware/request-id.ts` | **New** — request ID generation |
| `server/plugins/error-handler.ts` | Add requestId, duration tracking |
| 27 × `server/api/v1/**/*.ts` | Migrate console.error → logger |
| 7 × `server/utils/*.ts` + `server/services/*.ts` | Migrate console.error → logger |
| ~15 × `server/api/**/*.ts` | Add userId to error-path logs |

**Estimated scope:** ~45 files touched, mostly mechanical find-and-replace with context additions.

---

## Implementation Summary (2026-03-13)

### Phase 1: Complete

- **`server/utils/logger.ts`** — Added `LOG_LEVEL` env var support with priority filtering. Default: `info` in production, `debug` in development. Levels: debug < info < warn < error.
- **`server/middleware/request-id.ts`** — New middleware. Generates 12-char nanoid per request, sets `event.context.requestId` and `event.context.requestStartTime`, returns `X-Request-Id` response header.
- **`server/plugins/error-handler.ts`** — Enhanced to log requestId, userId, and durationMs on all 4xx/5xx responses. Logs slow requests (>2s) as warnings. Separate log levels for 4xx (warn) vs 5xx (error).

### Phase 2: Complete

- **24 v1 API files** migrated from `console.error` → `logger.error` with `{ userId, requestId }` context. 29 total replacements (some files had webhook trigger catch blocks).
- **7 utility/service files** migrated: cache-cleanup (4 calls), password (1), api-key (1), webhooks (1), entries service (2), entries delete (1), newsletter (1).
- **Zero `console.error/log` calls remain** in server code outside of `logger.ts` itself.

### Phase 3: Complete

- Request duration tracking implemented in error-handler plugin (via `event.context.requestStartTime` set by request-id middleware).
- `X-Request-Id` header returned on every response for user support reference.
- All 4xx/5xx responses and slow requests (>2s) logged with full context: method, URL, statusCode, durationMs, requestId, userId.

### Remaining (deferred)

- **Item 8 from plan** (user-facing requestId in error response body) — not yet implemented. Requires changes to error response format across all endpoints. Tracked for future improvement.
