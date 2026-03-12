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
  calculateTypedChainStats,
  getJourneyStage,
  getJourneyStageLabel,
  getJourneyStageEmoji,
  getDefaultThresholdType,
  getJourneyMetric,
  type JourneyThresholdType,
  type CachedChainData,
} from "~/server/utils/rhythmCalculator";
import {
  calculateWeeklyProgress,
  getTierLabel,
  getChainConfig,
  type ChainType,
} from "~/utils/tierCalculator";

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

        const sessionBased = rhythm.completionMode === "session";
        const dayStatuses = entriesToDayStatuses(
          matchingEntries,
          rhythm.durationThresholdSeconds,
          rhythm.countThreshold,
          sessionBased,
        );

        // Calculate current week progress
        const weekProgress = calculateWeeklyProgress(dayStatuses, new Date());

        // Calculate chain stat based on rhythm's chain type
        const chainType = (rhythm.chainType as ChainType) || "weekly_low";
        const chainConfig = getChainConfig(chainType);
        const chain = calculateTypedChainStats(
          dayStatuses,
          chainType,
          rhythm.chainTargetMinutes || undefined,
        );

        // Compute journey stage from cached totals (avoids all-time entry fetch)
        const thresholdType =
          (rhythm.journeyThresholdType as JourneyThresholdType) ||
          getDefaultThresholdType(rhythm.matchType);
        const customThresholds = rhythm.journeyThresholds as {
          building: number;
          becoming: number;
          being: number;
        } | null;
        const cached = rhythm.cachedChainStats as CachedChainData | null;
        let journeyStage: "beginning" | "building" | "becoming" | "being";
        if (cached?.totals) {
          const metric = getJourneyMetric(thresholdType, cached.totals);
          journeyStage = getJourneyStage(metric, thresholdType, customThresholds);
        } else {
          journeyStage = "beginning";
        }

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
          matchType: rhythm.matchType,
          durationThresholdSeconds: rhythm.durationThresholdSeconds,
          countThreshold: rhythm.countThreshold,
          frequency: rhythm.frequency,
          chainType: chainType,
          chainLabel: chainConfig.shortLabel,
          journeyStage,
          journeyStageLabel: getJourneyStageLabel(journeyStage),
          journeyStageEmoji: getJourneyStageEmoji(journeyStage),
          currentTier: weekProgress.achievedTier,
          currentTierLabel: getTierLabel(weekProgress.achievedTier),
          daysCompleted: weekProgress.daysCompleted,
          daysRemaining: weekProgress.daysRemaining,
          currentChain: chain.current,
          longestChain: chain.longest,
          chainUnit: chain.unit,
          chainTargetMinutes: rhythm.chainTargetMinutes || null,
          panelPreferences: panelPrefs,
          createdAt: rhythm.createdAt,
        };
      }),
    );

    return { rhythms: rhythmsWithSummary };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error("Failed to fetch rhythms", {
      error: errorMessage,
      stack: errorStack,
      userId,
    });
    throw createError({
      statusCode: 500,
      message: "Failed to fetch rhythms",
    });
  }
});
