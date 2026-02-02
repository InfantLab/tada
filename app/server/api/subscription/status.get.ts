/**
 * GET /api/subscription/status
 *
 * Returns the current user's subscription status and usage limits.
 * This endpoint is used by the UI to show subscription tier,
 * data retention info, and upgrade prompts.
 */

import { eq, sql, and, gte, isNull } from "drizzle-orm";
import { db } from "~/server/db";
import { entries, users } from "~/server/db/schema";
import { isCloudMode, getFreeRetentionDays } from "~/server/utils/cloudMode";
import {
  getVisibleDateRange,
  getArchivedEntryCount,
  getRetentionWarning,
} from "~/server/utils/usageLimits";

export default defineEventHandler(async (event) => {
  // Require authentication
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const userId = event.context.user.id;

  // Get full user record with subscription fields
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  // If not in cloud mode, return minimal response
  if (!isCloudMode()) {
    return {
      cloudMode: false,
      tier: "unlimited" as const,
      status: "active" as const,
      features: ["unlimited_history", "all_features"],
    };
  }

  // Get total entry count for this user
  const totalResult = await db
    .select({ totalCount: sql<number>`count(*)` })
    .from(entries)
    .where(and(eq(entries.userId, userId), isNull(entries.deletedAt)));
  const totalCount = totalResult[0]?.totalCount ?? 0;

  // Get visible entry count (within retention window)
  const dateRange = getVisibleDateRange(user);
  const visibleResult = await db
    .select({ visibleCount: sql<number>`count(*)` })
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        isNull(entries.deletedAt),
        gte(entries.timestamp, dateRange.from.toISOString())
      )
    );
  const visibleCount = visibleResult[0]?.visibleCount ?? 0;

  // Get oldest visible entry date for warning calculation
  const [oldestEntry] = await db
    .select({ timestamp: entries.timestamp })
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        isNull(entries.deletedAt),
        gte(entries.timestamp, dateRange.from.toISOString())
      )
    )
    .orderBy(entries.timestamp)
    .limit(1);

  const oldestVisibleDate = oldestEntry ? new Date(oldestEntry.timestamp) : null;
  const archivedCount = getArchivedEntryCount(user, totalCount, visibleCount);
  const retentionWarning = getRetentionWarning(user, oldestVisibleDate);
  const retentionDays = getFreeRetentionDays();

  // Determine available features based on tier
  const features: string[] = [];
  if (user.subscriptionTier === "premium") {
    features.push("unlimited_history", "all_features", "email_support", "early_access");
  } else {
    features.push("core_features", "community_support");
  }

  return {
    cloudMode: true,
    tier: user.subscriptionTier || "free",
    status: user.subscriptionStatus || "active",
    expiresAt: user.subscriptionExpiresAt || null,
    stripeCustomerId: user.stripeCustomerId ? true : false, // Don't expose actual ID

    // Data retention info
    dataRetention: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
      retentionDays,
    },

    // Entry counts
    entries: {
      total: totalCount,
      visible: visibleCount,
      archived: archivedCount,
    },

    // Warnings and prompts
    retentionWarning,

    // Features available at this tier
    features,

    // Email verification status
    email: user.email || null,
    emailVerified: user.emailVerified || false,
  };
});
