import { defineEventHandler, createError, getQuery } from "h3";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and, isNull, sql, gte } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:stats");

interface PeriodStats {
  count: number;
  hours: number;
}

interface EntryStats {
  totalHours: number;
  totalSessions: number;
  oldestEntry: string | null;
  thisWeek: PeriodStats;
  thisMonth: PeriodStats;
  thisYear: PeriodStats;
  categories: Record<string, number>;
}

export default defineEventHandler(async (event): Promise<EntryStats> => {
  try {
    // Get authenticated user from context
    const user = event.context.user;
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const userId = user.id;
    const _query = getQuery(event);
    logger.debug("Fetching entry stats", { userId });

    // Calculate start of week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekISO = startOfWeek.toISOString();

    // Calculate start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthISO = startOfMonth.toISOString();

    // Calculate start of year
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfYearISO = startOfYear.toISOString();

    // timestamp is THE canonical timeline field - always set, never null

    // Get overall stats
    const overallStats = await db
      .select({
        totalSessions: sql<number>`COUNT(*)`,
        totalSeconds: sql<number>`COALESCE(SUM(${entries.durationSeconds}), 0)`,
        oldestEntry: sql<string>`MIN(${entries.timestamp})`,
      })
      .from(entries)
      .where(and(eq(entries.userId, userId), isNull(entries.deletedAt)));

    // Get this week's stats
    const weekStats = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalSeconds: sql<number>`COALESCE(SUM(${entries.durationSeconds}), 0)`,
      })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          isNull(entries.deletedAt),
          gte(entries.timestamp, startOfWeekISO)
        )
      );

    // Get this month's stats
    const monthStats = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalSeconds: sql<number>`COALESCE(SUM(${entries.durationSeconds}), 0)`,
      })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          isNull(entries.deletedAt),
          gte(entries.timestamp, startOfMonthISO)
        )
      );

    // Get this year's stats
    const yearStats = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalSeconds: sql<number>`COALESCE(SUM(${entries.durationSeconds}), 0)`,
      })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          isNull(entries.deletedAt),
          gte(entries.timestamp, startOfYearISO)
        )
      );

    // Get category breakdown (count per category)
    const categoryStats = await db
      .select({
        category: entries.category,
        count: sql<number>`COUNT(*)`,
      })
      .from(entries)
      .where(and(eq(entries.userId, userId), isNull(entries.deletedAt)))
      .groupBy(entries.category);

    // Build categories record
    const categories: Record<string, number> = {};
    for (const row of categoryStats) {
      const cat = row.category || "uncategorized";
      categories[cat] = row.count;
    }

    const stats: EntryStats = {
      totalHours:
        Math.round(((overallStats[0]?.totalSeconds || 0) / 3600) * 10) / 10,
      totalSessions: overallStats[0]?.totalSessions || 0,
      oldestEntry: overallStats[0]?.oldestEntry || null,
      thisWeek: {
        count: weekStats[0]?.count || 0,
        hours: Math.round(((weekStats[0]?.totalSeconds || 0) / 3600) * 10) / 10,
      },
      thisMonth: {
        count: monthStats[0]?.count || 0,
        hours:
          Math.round(((monthStats[0]?.totalSeconds || 0) / 3600) * 10) / 10,
      },
      thisYear: {
        count: yearStats[0]?.count || 0,
        hours: Math.round(((yearStats[0]?.totalSeconds || 0) / 3600) * 10) / 10,
      },
      categories,
    };

    logger.info("Entry stats fetched successfully", { stats });
    return stats;
  } catch (error: unknown) {
    logger.error("Failed to fetch entry stats", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch entry stats",
      data: { error: message },
    });
  }
});
