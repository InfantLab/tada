/**
 * GET /api/rhythms - List all rhythms for the authenticated user
 *
 * Returns rhythms with summary data including current tier and chain stats
 * for displaying in collapsed accordion panels.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "~/server/db";
import { rhythms } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import {
  getMatchingEntries,
  entriesToDayStatuses,
  calculateChainStats,
} from "~/server/utils/rhythmCalculator";
import { calculateWeeklyProgress, getTierLabel } from "~/utils/tierCalculator";

const logger = createLogger("api:rhythms:list");

export default defineEventHandler(async (event) => {
  // Require authentication
  const session = event.context.session;
  if (!session?.userId) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const userId = session.userId;

  try {
    // Fetch all rhythms for this user
    const userRhythms = await db
      .select()
      .from(rhythms)
      .where(eq(rhythms.userId, userId))
      .orderBy(desc(rhythms.createdAt));

    // Calculate summary data for each rhythm
    const rhythmsWithSummary = await Promise.all(
      userRhythms.map(async (rhythm: (typeof userRhythms)[number]) => {
        // Get entries for the last 8 weeks to calculate current tier
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 56); // 8 weeks

        const matchingEntries = await getMatchingEntries(
          db,
          rhythm,
          userId,
          startDate,
          endDate,
        );

        const dayStatuses = entriesToDayStatuses(
          matchingEntries,
          rhythm.durationThresholdSeconds,
        );

        // Calculate current week progress
        const weekProgress = calculateWeeklyProgress(dayStatuses, new Date());

        // Calculate chain stats
        const chains = calculateChainStats(dayStatuses);
        const dailyChain = chains.find((c) => c.tier === "daily");

        // Parse panel preferences
        const panelPrefs = rhythm.panelPreferences || {
          showYearTracker: true,
          showMonthCalendar: true,
          showChainStats: true,
          monthViewMode: "calendar" as const,
          expandedByDefault: true,
        };

        return {
          id: rhythm.id,
          name: rhythm.name,
          emoji: null, // Could derive from category
          matchCategory: rhythm.matchCategory,
          durationThresholdSeconds: rhythm.durationThresholdSeconds,
          frequency: rhythm.frequency,
          currentTier: weekProgress.achievedTier,
          currentTierLabel: getTierLabel(weekProgress.achievedTier),
          currentChainDays: dailyChain?.current || 0,
          currentChainWeeks:
            chains.find((c) => c.tier === weekProgress.achievedTier)?.current ||
            0,
          panelPreferences: panelPrefs,
          createdAt: rhythm.createdAt,
        };
      }),
    );

    return { rhythms: rhythmsWithSummary };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error("Failed to fetch rhythms", { error: errorMessage, stack: errorStack, userId });
    throw createError({
      statusCode: 500,
      message: `Failed to fetch rhythms: ${errorMessage}`,
    });
  }
});
