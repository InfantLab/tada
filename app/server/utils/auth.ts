import type { H3Event } from "h3";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { sessions, users } from "~/server/db/schema";

// Session configuration
const SESSION_COOKIE_NAME = "auth_session";
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // refresh when <15 days remain

const COOKIE_ATTRIBUTES = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env["NODE_ENV"] === "production",
  path: "/",
};

// User attributes returned from session validation
export interface SessionUser {
  id: string;
  username: string;
  timezone: string;
  email: string | null;
  emailVerified: boolean;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  fresh: boolean;
}

declare module "h3" {
  interface H3EventContext {
    user: SessionUser | null;
    session: Session | null;
  }
}

function mapUserAttributes(row: typeof users.$inferSelect): SessionUser {
  return {
    id: row.id,
    username: row.username,
    timezone: row.timezone,
    email: row.email ?? null,
    emailVerified: row.emailVerified ?? false,
    subscriptionTier: row.subscriptionTier ?? null,
    subscriptionStatus: row.subscriptionStatus ?? null,
  };
}

/**
 * Create a new session for a user and return it
 */
export async function createSession(userId: string): Promise<Session> {
  const sessionId = nanoid(40);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt: Math.floor(expiresAt.getTime() / 1000),
  });

  return { id: sessionId, userId, expiresAt, fresh: false };
}

/**
 * Validate a session ID and return the session + user if valid
 * Automatically extends sessions past their halfway point
 */
export async function validateSession(
  sessionId: string,
): Promise<{ session: Session | null; user: SessionUser | null }> {
  const result = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (result.length === 0) {
    return { session: null, user: null };
  }

  const row = result[0]!;
  const expiresAt = new Date(row.session.expiresAt * 1000);

  // Session expired — clean it up
  if (expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return { session: null, user: null };
  }

  // Refresh if past halfway point
  let fresh = false;
  if (expiresAt.getTime() - Date.now() < SESSION_REFRESH_THRESHOLD_MS) {
    const newExpiry = new Date(Date.now() + SESSION_EXPIRY_MS);
    await db
      .update(sessions)
      .set({ expiresAt: Math.floor(newExpiry.getTime() / 1000) })
      .where(eq(sessions.id, sessionId));
    fresh = true;
  }

  return {
    session: {
      id: sessionId,
      userId: row.session.userId,
      expiresAt: fresh
        ? new Date(Date.now() + SESSION_EXPIRY_MS)
        : expiresAt,
      fresh,
    },
    user: mapUserAttributes(row.user),
  };
}

/**
 * Invalidate a single session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Set the session cookie on the response
 */
export function setSessionCookie(event: H3Event, sessionId: string): void {
  setCookie(event, SESSION_COOKIE_NAME, sessionId, {
    ...COOKIE_ATTRIBUTES,
    maxAge: SESSION_EXPIRY_MS / 1000,
  });
}

/**
 * Clear the session cookie
 */
export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, COOKIE_ATTRIBUTES);
}

/**
 * Validates a session from an HTTP request
 * Returns the session and user if valid, or null if invalid/missing
 */
export async function validateSessionRequest(event: H3Event) {
  const sessionId = getCookie(event, SESSION_COOKIE_NAME) ?? null;

  if (!sessionId) {
    return { session: null, user: null };
  }

  const { session, user } = await validateSession(sessionId);

  // Refresh session cookie if needed
  if (session && session.fresh) {
    setSessionCookie(event, session.id);
  }

  // Clear expired session cookie
  if (!session) {
    clearSessionCookie(event);
  }

  return { session, user };
}
