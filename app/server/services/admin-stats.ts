/**
 * Admin Statistics Service
 *
 * Aggregation queries for site-wide statistics.
 * All queries use SQL aggregation — no loading full result sets.
 */

import { db } from "~/server/db";
import {
  users,
  entries,
  rhythms,
  newsletterSubscribers,
  feedback,
  subscriptionEvents,
} from "~/server/db/schema";
import { eq, and, gte, sql, count, ne, isNull, isNotNull } from "drizzle-orm";

type Period = "24h" | "7d" | "30d" | "90d" | "all";

function getPeriodStart(period: Period): string | null {
  if (period === "all") return null;

  const now = new Date();
  const hours: Record<Exclude<Period, "all">, number> = {
    "24h": 24,
    "7d": 7 * 24,
    "30d": 30 * 24,
    "90d": 90 * 24,
  };
  const start = new Date(now.getTime() - hours[period] * 60 * 60 * 1000);
  return start.toISOString();
}

export async function getAdminStats(period: Period = "7d") {
  const now = new Date().toISOString();
  const periodStart = getPeriodStart(period);

  // Run all queries in parallel
  const [
    userStats,
    entryStats,
    rhythmStats,
    newsletterStats,
    feedbackStats,
    subscriptionStats,
  ] = await Promise.all([
    getUserStats(periodStart),
    getEntryStats(periodStart),
    getRhythmStats(),
    getNewsletterStats(periodStart),
    getFeedbackStats(periodStart),
    getSubscriptionStats(periodStart),
  ]);

  return {
    period,
    periodStart: periodStart || "all",
    periodEnd: now,
    users: userStats,
    entries: entryStats,
    rhythms: rhythmStats,
    newsletter: newsletterStats,
    subscriptions: subscriptionStats,
    feedback: feedbackStats,
  };
}

async function getUserStats(periodStart: string | null) {
  const totalResult = await db
    .select({ count: count() })
    .from(users);

  const total = totalResult[0]?.count ?? 0;

  // Users by tier
  const tierResults = await db
    .select({
      tier: users.subscriptionTier,
      count: count(),
    })
    .from(users)
    .groupBy(users.subscriptionTier);

  const byTier: Record<string, number> = {};
  for (const row of tierResults) {
    byTier[row.tier || "free"] = row.count;
  }

  // Users by status
  const statusResults = await db
    .select({
      status: users.subscriptionStatus,
      count: count(),
    })
    .from(users)
    .groupBy(users.subscriptionStatus);

  const byStatus: Record<string, number> = {};
  for (const row of statusResults) {
    byStatus[row.status || "active"] = row.count;
  }

  let newInPeriod = 0;
  let activeInPeriod = 0;

  if (periodStart) {
    // New users in period
    const newResult = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, periodStart));
    newInPeriod = newResult[0]?.count ?? 0;

    // Active users in period (users with at least one entry)
    const activeResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${entries.userId})` })
      .from(entries)
      .where(
        and(
          gte(entries.timestamp, periodStart),
          isNull(entries.deletedAt),
        ),
      );
    activeInPeriod = activeResult[0]?.count ?? 0;
  } else {
    newInPeriod = total;
    const activeResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${entries.userId})` })
      .from(entries)
      .where(isNull(entries.deletedAt));
    activeInPeriod = activeResult[0]?.count ?? 0;
  }

  return {
    total,
    newInPeriod,
    activeInPeriod,
    byTier,
    byStatus,
  };
}

async function getEntryStats(periodStart: string | null) {
  const conditions = [isNull(entries.deletedAt)];
  if (periodStart) {
    conditions.push(gte(entries.timestamp, periodStart));
  }

  const totalResult = await db
    .select({ count: count() })
    .from(entries)
    .where(and(...conditions));

  const totalInPeriod = totalResult[0]?.count ?? 0;

  // By type
  const typeResults = await db
    .select({
      type: entries.type,
      count: count(),
    })
    .from(entries)
    .where(and(...conditions))
    .groupBy(entries.type);

  const byType: Record<string, number> = {};
  for (const row of typeResults) {
    byType[row.type] = row.count;
  }

  // By source
  const sourceResults = await db
    .select({
      source: entries.source,
      count: count(),
    })
    .from(entries)
    .where(and(...conditions))
    .groupBy(entries.source);

  const bySource: Record<string, number> = {};
  for (const row of sourceResults) {
    bySource[row.source] = row.count;
  }

  // Avg per active user
  let activeUsers = 1;
  if (periodStart) {
    const activeResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${entries.userId})` })
      .from(entries)
      .where(and(...conditions));
    activeUsers = Math.max(1, activeResult[0]?.count ?? 1);
  }

  return {
    totalInPeriod,
    byType,
    bySource,
    avgPerActiveUser: Math.round((totalInPeriod / activeUsers) * 10) / 10,
  };
}

async function getRhythmStats() {
  const totalResult = await db
    .select({ count: count() })
    .from(rhythms);

  const totalActive = totalResult[0]?.count ?? 0;

  const userCount = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${rhythms.userId})` })
    .from(rhythms);

  const usersWithRhythms = Math.max(1, userCount[0]?.count ?? 1);

  return {
    totalActive,
    avgPerUser: Math.round((totalActive / usersWithRhythms) * 10) / 10,
  };
}

async function getNewsletterStats(periodStart: string | null) {
  const activeResult = await db
    .select({ count: count() })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "active"));

  const totalActive = activeResult[0]?.count ?? 0;

  let newInPeriod = 0;
  let unsubscribedInPeriod = 0;

  if (periodStart) {
    const newResult = await db
      .select({ count: count() })
      .from(newsletterSubscribers)
      .where(gte(newsletterSubscribers.createdAt, periodStart));
    newInPeriod = newResult[0]?.count ?? 0;

    const unsubResult = await db
      .select({ count: count() })
      .from(newsletterSubscribers)
      .where(
        and(
          eq(newsletterSubscribers.status, "unsubscribed"),
          isNotNull(newsletterSubscribers.unsubscribedAt),
          gte(newsletterSubscribers.unsubscribedAt, periodStart),
        ),
      );
    unsubscribedInPeriod = unsubResult[0]?.count ?? 0;
  }

  return {
    totalActive,
    newInPeriod,
    unsubscribedInPeriod,
  };
}

async function getFeedbackStats(periodStart: string | null) {
  // Open feedback (not resolved or closed)
  const openResult = await db
    .select({ count: count() })
    .from(feedback)
    .where(
      and(
        ne(feedback.status, "resolved"),
        ne(feedback.status, "closed"),
      ),
    );

  const openTotal = openResult[0]?.count ?? 0;

  let newInPeriod = 0;

  if (periodStart) {
    const newResult = await db
      .select({ count: count() })
      .from(feedback)
      .where(gte(feedback.createdAt, periodStart));
    newInPeriod = newResult[0]?.count ?? 0;
  }

  return {
    newInPeriod,
    openTotal,
  };
}

async function getSubscriptionStats(periodStart: string | null) {
  // Active premium subscribers
  const activeResult = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.subscriptionTier, "premium"),
        eq(users.subscriptionStatus, "active"),
      ),
    );

  const activeRevenue = activeResult[0]?.count ?? 0;

  let newInPeriod = 0;
  let cancelledInPeriod = 0;

  if (periodStart) {
    const newResult = await db
      .select({ count: count() })
      .from(subscriptionEvents)
      .where(
        and(
          eq(subscriptionEvents.eventType, "created"),
          gte(subscriptionEvents.createdAt, periodStart),
        ),
      );
    newInPeriod = newResult[0]?.count ?? 0;

    const cancelResult = await db
      .select({ count: count() })
      .from(subscriptionEvents)
      .where(
        and(
          eq(subscriptionEvents.eventType, "cancelled"),
          gte(subscriptionEvents.createdAt, periodStart),
        ),
      );
    cancelledInPeriod = cancelResult[0]?.count ?? 0;
  }

  return {
    activeRevenue,
    newInPeriod,
    cancelledInPeriod,
    churnRate:
      activeRevenue > 0
        ? Math.round((cancelledInPeriod / activeRevenue) * 1000) / 1000
        : 0,
  };
}
