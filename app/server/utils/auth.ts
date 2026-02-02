import type { H3Event } from "h3";
import { Lucia } from "lucia";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "~/server/db";
import { sessions, users } from "~/server/db/schema";

// Initialize Lucia with Drizzle adapter
const adapter = new DrizzleSQLiteAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env["NODE_ENV"] === "production",
    },
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      timezone: attributes.timezone,
      email: attributes.email,
      emailVerified: attributes.emailVerified,
      // Cloud subscription attributes (v0.4.0+)
      subscriptionTier: attributes.subscriptionTier,
      subscriptionStatus: attributes.subscriptionStatus,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      username: string;
      timezone: string;
      email: string | null;
      emailVerified: boolean;
      // Cloud subscription attributes (v0.4.0+)
      subscriptionTier: string | null;
      subscriptionStatus: string | null;
    };
  }
}

declare module "h3" {
  interface H3EventContext {
    user: import("lucia").User | null;
    session: import("lucia").Session | null;
  }
}

/**
 * Validates a session from an HTTP request
 * Returns the session and user if valid, or null if invalid/missing
 */
export async function validateSessionRequest(event: H3Event) {
  const sessionId = getCookie(event, lucia.sessionCookieName) ?? null;

  if (!sessionId) {
    return { session: null, user: null };
  }

  const { session, user } = await lucia.validateSession(sessionId);

  // Refresh session cookie if needed
  if (session && session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    setCookie(
      event,
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );
  }

  // Clear expired session cookie
  if (!session) {
    const blankCookie = lucia.createBlankSessionCookie();
    setCookie(
      event,
      blankCookie.name,
      blankCookie.value,
      blankCookie.attributes,
    );
  }

  return { session, user };
}
