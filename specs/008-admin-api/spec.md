# Spec 008: Admin API

> Operational and user-support API endpoints for site administration, statistics, and user management.

## Status

- **Status:** Draft
- **Author:** Ted (OpenClaw)
- **Created:** 2026-03-09
- **Target:** v0.6.0+
- **Issue:** [#4](https://github.com/InfantLab/tada/issues/4)

## Problem

Running a cloud instance of Ta-Da! requires operational visibility and user-support capabilities that don't currently exist:

1. **Weekly statistics** are gathered by a shell script that queries SQLite directly — fragile, non-portable, and can't run remotely
2. **User support** (password resets, account issues, subscription changes) requires direct database access
3. **Operational monitoring** (signup trends, system health, error rates) has no API surface
4. **Feedback triage** — feedback submissions exist in the database but there's no admin interface to review or respond to them

The immediate trigger: OpenClaw runs a cron job to collate weekly reports on new users, activity levels, and site health. It authenticates via an existing API key but has no endpoints to query cross-user data.

## Goals

- Replace direct-database admin queries with proper API endpoints
- Support both automated reporting (OpenClaw cron) and interactive support workflows
- Reuse existing auth infrastructure (API keys + sessions) with minimal new concepts
- Cover the core admin use cases: stats, user management, and user support
- Audit all admin actions

## Non-Goals

- Admin UI/dashboard (API-only for now; consumers are OpenClaw and scripts)
- User impersonation / acting-as-user
- Bulk data operations (mass delete, mass email)
- Real-time monitoring or alerting (use webhooks or external tools)
- Multi-tenant admin (single-instance admin only)

---

## Architecture Overview

### What Is an Admin?

Every API key belongs to a user (`apiKeys.userId` references `users.id`). There is no separate "service account" concept — OpenClaw authenticates as a regular user who happens to be the site owner.

An **admin** is therefore a user who is authorized to perform cross-user operations. Rather than adding a role column to the users table (which implies a role system we don't need yet), admin status is determined by:

```
ADMIN_USER_IDS=user_abc123,user_def456
```

An environment variable listing user IDs that have admin privileges. This is:
- **Simple** — no migration, no role system, no UI for role management
- **Secure** — can't be changed via the API, only via server config
- **Sufficient** — a cloud instance has 1-2 admins at most
- **Familiar** — same pattern used by many small services (Plausible, Umami, etc.)

If a future version needs database-backed roles, the `isAdmin()` utility can be extended without changing any endpoint code.

### Permission Model

Extend the existing permission system with admin scopes:

```typescript
// New permissions added to Permission type
| 'admin:stats'      // Read site-wide statistics
| 'admin:users'      // List and view user accounts
| 'admin:users:write' // Modify user accounts (password reset, disable, tier change)
| 'admin:activity'   // View site-wide activity feed
| 'admin:health'     // View system health
| 'admin:feedback'   // View and manage feedback submissions
```

**Authorization flow:**
1. Request arrives at `/api/v1/admin/*`
2. Existing v1 auth middleware authenticates (API key or session)
3. Admin utility checks: is `auth.userId` in `ADMIN_USER_IDS`?
4. Permission check: does the API key have the required `admin:*` permission?
5. Both must pass — being an admin user with a non-admin-scoped key is denied

Session-based auth (logged-in admin in browser) gets all permissions automatically, matching existing behavior.

### Route Structure

```
/api/v1/admin/
  stats.get.ts              # Site-wide statistics
  users/
    index.get.ts            # List users
    [id].get.ts             # User detail
    [id].patch.ts           # Update user (tier, disable)
    [id]/
      reset-password.post.ts  # Trigger password reset email
      sessions.delete.ts      # Invalidate all sessions
  activity.get.ts           # Site-wide activity feed
  feedback/
    index.get.ts            # List feedback
    [id].patch.ts           # Update feedback status/notes
  health.get.ts             # System health
```

---

## 1. Admin Utilities

### `server/utils/admin.ts`

```typescript
/**
 * Check if the authenticated user is an admin.
 * Admin status is determined by the ADMIN_USER_IDS env var.
 */
export function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
  return adminIds.includes(userId)
}

/**
 * Require admin access. Throws 403 if not admin.
 * Also checks that the API key (if used) has the required permission.
 */
export function requireAdmin(event: H3Event, permission: Permission): void {
  const auth = event.context.auth as ApiAuthContext
  if (!auth) {
    throw createError(unauthorized(event, 'Authentication required'))
  }

  if (!isAdmin(auth.userId)) {
    throw createError(forbidden(event, 'Admin access required'))
  }

  // For API key auth, also check specific permission
  if (auth.type === 'api_key') {
    requirePermission(event, permission)
  }
}
```

### Audit Logging

All admin actions are logged to the existing `authEvents` table with admin-specific event types:

```typescript
// New auth event types for admin actions
'admin:user_viewed'
'admin:user_updated'
'admin:password_reset_triggered'
'admin:sessions_invalidated'
'admin:feedback_updated'
'admin:stats_accessed'
```

This provides a full audit trail using existing infrastructure.

---

## 2. Endpoints

### GET /api/v1/admin/stats

Site-wide statistics for dashboards and weekly reports. This is the primary endpoint that replaces the shell-script approach.

**Permission:** `admin:stats`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period` | string | `7d` | Time window: `24h`, `7d`, `30d`, `90d`, `all` |

**Response:**
```json
{
  "data": {
    "period": "7d",
    "periodStart": "2026-03-02T00:00:00Z",
    "periodEnd": "2026-03-09T00:00:00Z",
    "users": {
      "total": 142,
      "newInPeriod": 8,
      "activeInPeriod": 53,
      "byTier": { "free": 128, "premium": 14 },
      "byStatus": { "active": 135, "cancelled": 5, "expired": 2 }
    },
    "entries": {
      "totalInPeriod": 1847,
      "byType": { "timed": 620, "tada": 891, "tally": 204, "moment": 132 },
      "bySource": { "manual": 1650, "import": 180, "voice": 17 },
      "avgPerActiveUser": 34.8
    },
    "rhythms": {
      "totalActive": 312,
      "avgPerUser": 2.2
    },
    "newsletter": {
      "totalActive": 89,
      "newInPeriod": 3,
      "unsubscribedInPeriod": 1
    },
    "subscriptions": {
      "activeRevenue": 14,
      "newInPeriod": 2,
      "cancelledInPeriod": 0,
      "churnRate": 0.0
    },
    "feedback": {
      "newInPeriod": 2,
      "openTotal": 5
    }
  }
}
```

**Implementation notes:**
- All counts are computed via SQL aggregation (no loading full result sets)
- "Active" user = user with at least one entry in the period
- Revenue is count of premium subscribers (actual amounts are in Stripe)
- Cache-friendly: results for completed periods can be cached

---

### GET /api/v1/admin/users

List users with filtering, sorting, and search.

**Permission:** `admin:users`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tier` | string | - | Filter by subscription tier: `free`, `premium` |
| `status` | string | - | Filter by subscription status: `active`, `cancelled`, `expired`, `past_due` |
| `search` | string | - | Search by username or email (case-insensitive) |
| `sort` | string | `createdAt` | Sort by: `createdAt`, `username`, `lastActiveAt` |
| `order` | string | `desc` | Sort order: `asc`, `desc` |
| `limit` | number | `50` | Max 200 |
| `offset` | number | `0` | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "id": "user_abc123",
      "username": "meditator42",
      "email": "m42@example.com",
      "emailVerified": true,
      "subscriptionTier": "premium",
      "subscriptionStatus": "active",
      "createdAt": "2025-06-15T10:30:00Z",
      "lastActiveAt": "2026-03-09T08:15:00Z",
      "stats": {
        "entryCount": 2341,
        "rhythmCount": 5
      }
    }
  ],
  "meta": {
    "total": 142,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Implementation notes:**
- `lastActiveAt` is derived from `MAX(entries.timestamp)` for the user — computed via subquery
- `stats.entryCount` is `COUNT(entries)` — computed via subquery
- Never expose `passwordHash` or other sensitive fields
- Email is shown to admin but should be treated as PII in logs

---

### GET /api/v1/admin/users/:id

Detailed view of a single user for support purposes.

**Permission:** `admin:users`

**Response:**
```json
{
  "data": {
    "id": "user_abc123",
    "username": "meditator42",
    "email": "m42@example.com",
    "emailVerified": true,
    "timezone": "Europe/London",
    "subscriptionTier": "premium",
    "subscriptionStatus": "active",
    "stripeCustomerId": "cus_xxx",
    "subscriptionExpiresAt": "2026-04-15T00:00:00Z",
    "createdAt": "2025-06-15T10:30:00Z",
    "updatedAt": "2026-03-08T14:20:00Z",
    "stats": {
      "entryCount": 2341,
      "rhythmCount": 5,
      "lastEntryAt": "2026-03-09T08:15:00Z",
      "firstEntryAt": "2025-06-15T11:00:00Z",
      "apiKeyCount": 2,
      "activeSessions": 3
    },
    "recentActivity": {
      "lastLogin": "2026-03-09T07:30:00Z",
      "loginsLast30d": 28,
      "entriesLast7d": 45
    }
  }
}
```

---

### PATCH /api/v1/admin/users/:id

Update user account properties for support purposes.

**Permission:** `admin:users:write`

**Request Body:**
```json
{
  "subscriptionTier": "premium",
  "subscriptionStatus": "active",
  "subscriptionExpiresAt": "2026-12-31T00:00:00Z",
  "emailVerified": true
}
```

**Allowed fields:**
- `subscriptionTier` — Change between `free` and `premium`
- `subscriptionStatus` — Override status (`active`, `cancelled`, `expired`, `suspended`)
- `subscriptionExpiresAt` — Set/extend expiration (ISO 8601)
- `emailVerified` — Manually verify email (useful for support)

**Not allowed via this endpoint:**
- `username`, `email` — user-managed, changing could break things
- `passwordHash` — use the reset-password endpoint instead
- `id` — immutable

**Response:** Updated user object (same shape as GET users/:id)

All changes are logged to `authEvents` with event type `admin:user_updated` and metadata containing the changed fields and previous values.

---

### POST /api/v1/admin/users/:id/reset-password

Trigger a password reset email for a user. Does not set the password directly — sends the standard reset flow email so the user sets their own new password.

**Permission:** `admin:users:write`

**Request Body:** None required.

**Response:**
```json
{
  "data": {
    "message": "Password reset email sent",
    "email": "m42@example.com",
    "expiresAt": "2026-03-09T20:00:00Z"
  }
}
```

**Implementation notes:**
- Reuses existing password reset token generation and email logic
- Fails with 400 if user has no email address
- Logged as `admin:password_reset_triggered` auth event

---

### DELETE /api/v1/admin/users/:id/sessions

Invalidate all active sessions for a user. Useful when an account may be compromised or after a password reset.

**Permission:** `admin:users:write`

**Response:**
```json
{
  "data": {
    "message": "All sessions invalidated",
    "sessionsRevoked": 3
  }
}
```

**Implementation notes:**
- Deletes all rows from `sessions` table for the user
- User will need to log in again on all devices
- Logged as `admin:sessions_invalidated` auth event

---

### GET /api/v1/admin/activity

Site-wide activity feed showing recent signups, subscription changes, and notable events. Designed for a quick "what's happening" view.

**Permission:** `admin:activity`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | - | Filter: `signup`, `subscription`, `login`, `password_reset` |
| `limit` | number | `50` | Max 200 |
| `offset` | number | `0` | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "type": "signup",
      "timestamp": "2026-03-09T14:30:00Z",
      "user": { "id": "user_xyz", "username": "newuser" },
      "details": {}
    },
    {
      "type": "subscription",
      "timestamp": "2026-03-09T12:00:00Z",
      "user": { "id": "user_abc", "username": "meditator42" },
      "details": { "event": "upgraded", "from": "free", "to": "premium" }
    }
  ],
  "meta": { "total": 312, "limit": 50, "offset": 0, "hasMore": true }
}
```

**Implementation notes:**
- Combines data from `authEvents` (signups, logins) and `subscriptionEvents` (billing changes)
- Ordered by timestamp descending (most recent first)
- User info is joined from users table (never expose passwordHash)

---

### GET /api/v1/admin/feedback

List feedback submissions with filtering by status.

**Permission:** `admin:feedback`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | - | Filter: `new`, `reviewed`, `in_progress`, `resolved`, `closed` |
| `type` | string | - | Filter: `bug`, `feedback`, `question` |
| `limit` | number | `50` | Max 200 |
| `offset` | number | `0` | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "id": "fb_123",
      "type": "bug",
      "description": "Timer doesn't stop when app goes to background",
      "email": "user@example.com",
      "status": "new",
      "userId": "user_abc",
      "username": "meditator42",
      "systemInfo": { "platform": "iOS", "appVersion": "0.5.0" },
      "internalNotes": null,
      "createdAt": "2026-03-08T16:00:00Z"
    }
  ],
  "meta": { "total": 5, "limit": 50, "offset": 0, "hasMore": false }
}
```

---

### PATCH /api/v1/admin/feedback/:id

Update feedback status and add internal notes.

**Permission:** `admin:feedback`

**Request Body:**
```json
{
  "status": "in_progress",
  "internalNotes": "Confirmed on iOS. Related to background audio handling.",
  "replyEmail": "Thanks for reporting this! We've confirmed the issue and are working on a fix."
}
```

**Allowed fields:**
- `status` — Transition to any valid status
- `internalNotes` — Admin-only notes (never shown to user)
- `replyEmail` — Optional. When provided, sends an email reply to the user's email address using the existing email service. The reply text is appended to `internalNotes` with a timestamp for the audit trail.

**Response:** Updated feedback object. Includes `"emailSent": true` in meta if a reply was sent.

Logged as `admin:feedback_updated` auth event. If email sent, also includes `replyEmailSent: true` in event metadata.

---

### GET /api/v1/admin/health

System health check for monitoring. Unlike `/api/v1/health` (public, unauthenticated), this returns detailed operational data.

**Permission:** `admin:health`

**Response:**
```json
{
  "data": {
    "status": "healthy",
    "version": "0.6.0",
    "uptime": 864000,
    "database": {
      "status": "connected",
      "sizeBytes": 52428800,
      "tables": {
        "users": 142,
        "entries": 48000,
        "rhythms": 312,
        "sessions": 89,
        "apiKeys": 15,
        "feedback": 23,
        "newsletterSubscribers": 92
      }
    },
    "cloudMode": true,
    "environment": "production"
  }
}
```

---

## 3. Rate Limiting

Admin endpoints use the existing rate limiting infrastructure with a dedicated tier:

```typescript
// Add to RATE_LIMITS in rate-limit.ts
admin: 100,   // 100 requests per minute (same as standard)
```

The admin tier is applied in the v1 auth middleware by detecting `/api/v1/admin/` paths, matching the existing pattern for export/insights/webhook detection.

---

## 4. Security Considerations

### Access Control
- Admin status is env-var controlled — cannot be escalated via API
- API keys must explicitly include `admin:*` permissions — an admin user's existing keys don't automatically get admin access
- All admin actions are audit-logged with the admin's userId, IP, and user agent

### Data Exposure
- `passwordHash` is never returned in any response
- Email addresses are included (admin needs them for support) but should be treated as PII
- Stripe customer IDs are included for cross-referencing with Stripe dashboard
- The health endpoint does not expose secrets, connection strings, or env vars

### IP Allowlisting (Optional)
For production hardening, an optional `ADMIN_ALLOWED_IPS` env var can restrict admin endpoint access:

```
ADMIN_ALLOWED_IPS=192.168.1.0/24,10.0.0.1
```

This is a future enhancement, not required for v1.

---

## 5. Implementation Plan

### Phase 1: Foundation
- [ ] Create `server/utils/admin.ts` with `isAdmin()` and `requireAdmin()`
- [ ] Add admin permissions to `Permission` type in `types/api.d.ts`
- [ ] Add `admin` rate limit tier to `rate-limit.ts`
- [ ] Update v1 auth middleware to detect admin paths for rate limiting
- [ ] Move `/api/admin/test-email.post.ts` to `/api/v1/admin/test-email.post.ts`

### Phase 2: Stats & Health (MVP — unblocks OpenClaw cron)
- [ ] Implement `GET /api/v1/admin/stats`
- [ ] Implement `GET /api/v1/admin/health`
- [ ] Create `server/services/admin-stats.ts` for aggregation queries

### Phase 3: User Management
- [ ] Implement `GET /api/v1/admin/users`
- [ ] Implement `GET /api/v1/admin/users/:id`
- [ ] Implement `PATCH /api/v1/admin/users/:id`
- [ ] Implement `POST /api/v1/admin/users/:id/reset-password`
- [ ] Implement `DELETE /api/v1/admin/users/:id/sessions`

### Phase 4: Activity & Feedback
- [ ] Implement `GET /api/v1/admin/activity`
- [ ] Implement `GET /api/v1/admin/feedback`
- [ ] Implement `PATCH /api/v1/admin/feedback/:id`

### Phase 5: Testing & Documentation
- [ ] Integration tests for all admin endpoints
- [ ] Test permission enforcement (non-admin rejected, missing scope rejected)
- [ ] Update API documentation
- [ ] Update OpenClaw skill with admin capabilities

---

## 6. OpenClaw Integration

Once the admin API is live, the weekly report cron job becomes:

```typescript
// OpenClaw cron: Sunday 8 PM
async function weeklyAdminReport() {
  const tada = new TadaClient()  // uses existing API key

  // One call replaces the shell script
  const { data: stats } = await tada.fetch('/admin/stats', {
    params: { period: '7d' }
  })

  const report = `
Weekly Ta-Da! Report (${stats.periodStart} - ${stats.periodEnd})

Users: ${stats.users.total} total, ${stats.users.newInPeriod} new this week
Active: ${stats.users.activeInPeriod} users logged entries
Premium: ${stats.subscriptions.activeRevenue} subscribers

Entries: ${stats.entries.totalInPeriod} logged this week
  Timed: ${stats.entries.byType.timed}
  Ta-Das: ${stats.entries.byType.tada}
  Tallies: ${stats.entries.byType.tally}

Newsletter: ${stats.newsletter.totalActive} subscribers
Feedback: ${stats.feedback.newInPeriod} new, ${stats.feedback.openTotal} open
`

  await sendEmail({ subject: 'Ta-Da! Weekly Report', body: report })
}
```

The API key needs the `admin:stats` permission added. Since the key already exists, this is done by updating the key's permissions array (either via the existing key management UI or directly).

---

## Design Decisions

1. **Permission granularity** — Keep `admin:users:write` as a single scope. Splitting into per-action permissions is overkill for 1-2 admins.

2. **Feedback email replies** — `PATCH /admin/feedback/:id` supports an optional `replyEmail` field. When provided, sends a reply to the user's email address using the existing email service, and records the reply in `internalNotes`.

3. **User disable/suspend** — Reuse `subscriptionStatus` with value `suspended` rather than adding a new column. The auth layer already checks subscription status, so a suspended user is effectively locked out without a migration.

4. **Consolidate admin routes** — Move existing `/api/admin/test-email.post.ts` to `/api/v1/admin/test-email.post.ts` for consistency. All admin endpoints live under the v1 namespace.
