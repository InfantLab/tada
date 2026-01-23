/**
 * Voice Usage Statistics Endpoint
 *
 * Returns the user's voice feature usage for the current billing period.
 *
 * GET /api/voice/usage
 *
 * @module server/api/voice/usage
 */

import { defineEventHandler, createError } from "h3";
import { createLogger } from "~/server/utils/logger";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

const logger = createLogger("api:voice:usage");

// Free tier limit
const FREE_TIER_LIMIT = 50;

interface UsageResponse {
  /** Number of voice entries created this billing period */
  voiceEntriesThisMonth: number;
  /** Maximum voice entries allowed per billing period */
  voiceEntriesLimit: number;
  /** Remaining voice entries before limit */
  voiceEntriesRemaining: number;
  /** Whether user has exceeded the limit */
  limitExceeded: boolean;
  /** Start of current billing period (ISO date) */
  billingPeriodStart: string;
  /** End of current billing period (ISO date) */
  billingPeriodEnd: string;
  /** Date when usage resets (ISO date) */
  resetDate: string;
  /** Whether user has their own API key configured */
  hasUserApiKey: boolean;
  /** User's current tier */
  tier: "free" | "premium";
}

/**
 * Get the start of the current billing month (1st of month, 00:00:00 UTC)
 */
function getBillingPeriodStart(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
}

/**
 * Get the end of the current billing month (last day, 23:59:59 UTC)
 */
function getBillingPeriodEnd(): Date {
  const now = new Date();
  // Next month's 1st, then subtract 1 second
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return new Date(nextMonth.getTime() - 1);
}

/**
 * Get the reset date (1st of next month)
 */
function getResetDate(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
}

/**
 * Count voice entries this billing period
 */
async function countVoiceEntriesThisMonth(userId: string): Promise<number> {
  const periodStart = getBillingPeriodStart().toISOString();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        eq(entries.source, "voice"),
        gte(entries.createdAt, periodStart),
      ),
    );

  return (result[0] as { count: number } | undefined)?.count || 0;
}

export default defineEventHandler(async (event) => {
  // Require authentication
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const userId = event.context.user.id;

  logger.info(`Getting voice usage for user ${userId}`);

  try {
    const voiceEntriesThisMonth = await countVoiceEntriesThisMonth(userId);

    // TODO: Check user preferences for BYOK status
    // For now, we assume no user API key (would need to check IndexedDB client-side)
    const hasUserApiKey = false;

    // TODO: Check user subscription status for tier
    // For now, everyone is on free tier
    const tier = "free" as const;

    const limit = FREE_TIER_LIMIT;
    const remaining = Math.max(0, limit - voiceEntriesThisMonth);
    const limitExceeded = !hasUserApiKey && voiceEntriesThisMonth >= limit;

    const response: UsageResponse = {
      voiceEntriesThisMonth,
      voiceEntriesLimit: limit,
      voiceEntriesRemaining: remaining,
      limitExceeded,
      billingPeriodStart: getBillingPeriodStart().toISOString(),
      billingPeriodEnd: getBillingPeriodEnd().toISOString(),
      resetDate: getResetDate().toISOString(),
      hasUserApiKey,
      tier,
    };

    return response;
  } catch (err) {
    logger.error("Error getting voice usage:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get usage statistics",
    });
  }
});
