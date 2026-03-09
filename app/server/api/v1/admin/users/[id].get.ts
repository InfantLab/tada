/**
 * GET /api/v1/admin/users/:id
 *
 * Detailed view of a single user for support purposes.
 */

import { requireAdmin } from "~/server/utils/admin";
import { success, notFound } from "~/server/utils/response";
import { logAuthEvent } from "~/server/utils/authEvents";
import { db } from "~/server/db";
import {
  users,
  entries,
  rhythms,
  apiKeys,
  sessions,
  authEvents,
} from "~/server/db/schema";
import { eq, and, gte, sql, count, isNull, isNotNull } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:users");

  const userId = getRouterParam(event, "id");
  if (!userId) {
    throw createError(notFound(event, "User"));
  }

  // Fetch user
  const user = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      emailVerified: users.emailVerified,
      timezone: users.timezone,
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      stripeCustomerId: users.stripeCustomerId,
      subscriptionExpiresAt: users.subscriptionExpiresAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw createError(notFound(event, "User"));
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch stats in parallel
  const [
    entryCountResult,
    rhythmCountResult,
    lastEntryResult,
    firstEntryResult,
    apiKeyCountResult,
    sessionCountResult,
    lastLoginResult,
    loginsLast30dResult,
    entriesLast7dResult,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(entries)
      .where(and(eq(entries.userId, userId), isNull(entries.deletedAt))),
    db
      .select({ count: count() })
      .from(rhythms)
      .where(eq(rhythms.userId, userId)),
    db
      .select({ timestamp: sql<string | null>`MAX(${entries.timestamp})` })
      .from(entries)
      .where(and(eq(entries.userId, userId), isNull(entries.deletedAt))),
    db
      .select({ timestamp: sql<string | null>`MIN(${entries.timestamp})` })
      .from(entries)
      .where(and(eq(entries.userId, userId), isNull(entries.deletedAt))),
    db
      .select({ count: count() })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt))),
    db
      .select({ count: count() })
      .from(sessions)
      .where(eq(sessions.userId, userId)),
    db
      .select({ createdAt: sql<string | null>`MAX(${authEvents.createdAt})` })
      .from(authEvents)
      .where(and(eq(authEvents.userId, userId), eq(authEvents.eventType, "login"))),
    db
      .select({ count: count() })
      .from(authEvents)
      .where(
        and(
          eq(authEvents.userId, userId),
          eq(authEvents.eventType, "login"),
          gte(authEvents.createdAt, thirtyDaysAgo),
        ),
      ),
    db
      .select({ count: count() })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          isNull(entries.deletedAt),
          gte(entries.timestamp, sevenDaysAgo),
        ),
      ),
  ]);

  const auth = event.context.auth!;
  await logAuthEvent({
    event,
    userId: auth.userId,
    eventType: "admin:user_viewed",
    metadata: { targetUserId: userId },
  });

  return success(event, {
    ...user[0],
    stats: {
      entryCount: entryCountResult[0]?.count ?? 0,
      rhythmCount: rhythmCountResult[0]?.count ?? 0,
      lastEntryAt: lastEntryResult[0]?.timestamp ?? null,
      firstEntryAt: firstEntryResult[0]?.timestamp ?? null,
      apiKeyCount: apiKeyCountResult[0]?.count ?? 0,
      activeSessions: sessionCountResult[0]?.count ?? 0,
    },
    recentActivity: {
      lastLogin: lastLoginResult[0]?.createdAt ?? null,
      loginsLast30d: loginsLast30dResult[0]?.count ?? 0,
      entriesLast7d: entriesLast7dResult[0]?.count ?? 0,
    },
  });
});
