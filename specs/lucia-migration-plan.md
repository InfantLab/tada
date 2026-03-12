# Lucia Auth Migration Plan

**Date:** 2026-03-12
**Status:** Planning
**Audit Item:** v0.5.0 Housekeeping Audit, Item #5
**Approach:** Roll your own session management (Lucia's official recommendation)

---

## Why Migrate

Lucia v3 was deprecated March 2025. No bug fixes or security patches. The `@lucia-auth/adapter-drizzle` package is also deprecated. The author recommends inlining the session logic since it's simple enough that a library adds unnecessary overhead.

## Alternatives Evaluated

| Option | Verdict |
|--------|---------|
| **Roll your own** | **Selected.** Lowest effort, same session model, removes dependencies |
| nuxt-auth-utils | Different session model (sealed cookies vs DB). Loses server-side session revocation. |
| Better Auth | Heavy — takes over schema, routes, everything. Uncertain libSQL/Turso support. |
| Arctic | OAuth only, not relevant for email/password auth. |

## Current Lucia Surface Area

**Packages to remove:** `lucia`, `@lucia-auth/adapter-drizzle`
**Package to keep:** `oslo` (still maintained, used for crypto)

### Files that import Lucia (8 files)

| File | Usage |
|------|-------|
| `server/utils/auth.ts` | Lucia instance, `validateSessionRequest()` |
| `server/middleware/auth.ts` | `lucia.validateSession()`, cookie management |
| `server/api/auth/login.post.ts` | `lucia.createSession()`, `lucia.createSessionCookie()` |
| `server/api/auth/register.post.ts` | `lucia.createSession()`, `lucia.createSessionCookie()` |
| `server/api/auth/logout.post.ts` | `lucia.invalidateSession()`, `lucia.createBlankSessionCookie()` |
| `server/api/auth/change-password.post.ts` | `lucia.createSession()`, `lucia.createSessionCookie()` |
| `server/api/account.delete.ts` | `lucia.invalidateUserSessions()` |
| `server/middleware/api-v1-auth.ts` | `validateSessionRequest()` (indirect) |

### Lucia Methods Used (7 methods)

| Method | Replacement |
|--------|-------------|
| `lucia.createSession(userId, {})` | Insert into `sessions` table, return session object |
| `lucia.validateSession(sessionId)` | Query `sessions` table, check expiry, refresh if needed |
| `lucia.invalidateSession(sessionId)` | `db.delete(sessions).where(eq(sessions.id, sessionId))` |
| `lucia.invalidateUserSessions(userId)` | `db.delete(sessions).where(eq(sessions.userId, userId))` |
| `lucia.createSessionCookie(session.id)` | `setCookie(event, SESSION_COOKIE_NAME, sessionId, cookieAttributes)` |
| `lucia.createBlankSessionCookie()` | `deleteCookie(event, SESSION_COOKIE_NAME)` |
| `lucia.sessionCookieName` | Constant: `SESSION_COOKIE_NAME = "auth_session"` |

### Database Schema — No Changes Needed

The existing `sessions` and `users` tables are already defined in Drizzle schema and work directly with SQL. No schema migration required.

## Migration Plan

### Step 1: Create session utility functions in `auth.ts`

Replace the Lucia class with plain functions:

```ts
import { generateIdFromEntropySize } from "lucia"; // or use oslo/nanoid
import { sha256 } from "oslo/crypto";
import { encodeHex } from "oslo/encoding";

const SESSION_COOKIE_NAME = "auth_session";
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_REFRESH_MS = 15 * 24 * 60 * 60 * 1000; // 15 days (refresh when half expired)

const COOKIE_ATTRIBUTES = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env["NODE_ENV"] === "production",
  path: "/",
};

export async function createSession(userId: string) {
  const sessionId = generateIdFromEntropySize(25); // 40-char hex string
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt: Math.floor(expiresAt.getTime() / 1000),
  });
  return { id: sessionId, userId, expiresAt };
}

export async function validateSession(sessionId: string) {
  const [result] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId));

  if (!result) return { session: null, user: null };

  const expiresAt = new Date(result.session.expiresAt * 1000);

  if (expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return { session: null, user: null };
  }

  // Refresh session if past halfway point
  const fresh = Date.now() >= expiresAt.getTime() - SESSION_REFRESH_MS;
  if (fresh) {
    const newExpiry = new Date(Date.now() + SESSION_EXPIRY_MS);
    await db.update(sessions)
      .set({ expiresAt: Math.floor(newExpiry.getTime() / 1000) })
      .where(eq(sessions.id, sessionId));
  }

  return {
    session: { id: sessionId, userId: result.session.userId, expiresAt, fresh },
    user: mapUserAttributes(result.user),
  };
}

export async function invalidateSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export function setSessionCookie(event: H3Event, sessionId: string) {
  setCookie(event, SESSION_COOKIE_NAME, sessionId, {
    ...COOKIE_ATTRIBUTES,
    maxAge: SESSION_EXPIRY_MS / 1000,
  });
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE_NAME);
}
```

### Step 2: Update each consumer file

Each file's changes are mechanical — replace Lucia method calls with the new functions:

- **middleware/auth.ts** — Replace `lucia.validateSession()` → `validateSession()`, cookie methods → `setSessionCookie()`/`clearSessionCookie()`
- **login.post.ts** — Replace `lucia.createSession()` → `createSession()`, cookie → `setSessionCookie()`
- **register.post.ts** — Same as login
- **change-password.post.ts** — Same as login (already uses direct DB delete for other sessions)
- **logout.post.ts** — Replace `lucia.invalidateSession()` → `invalidateSession()`, cookie → `clearSessionCookie()`
- **account.delete.ts** — Replace `lucia.invalidateUserSessions()` → `invalidateUserSessions()`

### Step 3: Remove TypeScript module declarations

Remove the `declare module "lucia"` block from `auth.ts`. Define session/user types directly.

### Step 4: Remove packages

```bash
bun remove lucia @lucia-auth/adapter-drizzle
```

Keep `oslo` — it's still maintained and used for crypto utilities.

### Step 5: Test

- Login, register, logout flows
- Session persistence across page reloads
- Session expiry and refresh
- Password change invalidates other sessions
- Account deletion clears sessions
- API key auth still works (separate system, unaffected)

## Risk Assessment

- **Low risk.** The session model, schema, and cookie format stay identical. This is a refactor, not a redesign.
- **No user impact.** Existing sessions will continue to work since the session table and cookie name are unchanged.
- **Rollback.** If issues arise, Lucia v3 still installs from npm — just revert the code changes.

## Estimated Scope

- ~8 files changed
- ~80 lines of new session utility code replacing ~50 lines of Lucia config
- Net removal of 2 dependencies
