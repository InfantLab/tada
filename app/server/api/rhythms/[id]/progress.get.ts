/**
 * GET /api/rhythms/:id/progress - Get calculated progress data for a rhythm
 *
 * Returns tier calculations, chain statistics, day-by-day data,
 * totals, journey stage, and encouragement message.
 *
 * Uses caching: if no new entries since last calculation, returns cached data.
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "~/server/db";
import { rhythms, entries } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import {
  getMatchingEntries,
  entriesToDayStatuses,
  calculateTypedChainStats,
  calculateTotals,
  getJourneyStage,
  selectEncouragement,
} from "~/server/utils/rhythmCalculator";
import {
  calculateWeeklyProgress,
  generateNudgeMessage,
  getChainConfig,
  type TierName,
  type ChainType,
  type ChainStat,
} from "~/utils/tierCalculator";
import type {
  RhythmTotals,
  CachedChainData,
} from "~/server/utils/rhythmCalculator";

const logger = createLogger("api:rhythms:progress");

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
  const rhythmId = getRouterParam(event, "id");

  if (!rhythmId) {
    throw createError({
      statusCode: 400,
      message: "Rhythm ID is required",
    });
  }

  try {
    // Fetch the rhythm
    const [rhythm] = await db
      .select()
      .from(rhythms)
      .where(and(eq(rhythms.id, rhythmId), eq(rhythms.userId, userId)));

    if (!rhythm) {
      throw createError({
        statusCode: 404,
        message: "Rhythm not found",
      });
    }

    // Date range for visualization (trailing 365 days)
    const visualEndDate = new Date();
    visualEndDate.setHours(23, 59, 59, 999);
    const visualStartDate = new Date(visualEndDate);
    visualStartDate.setDate(visualStartDate.getDate() - 365);
    visualStartDate.setHours(0, 0, 0, 0);

    // Build conditions to find latest matching entry
    const matchConditions = [eq(entries.userId, userId)];
    if (rhythm.matchCategory) {
      matchConditions.push(eq(entries.category, rhythm.matchCategory));
    }
    if (rhythm.matchSubcategory) {
      matchConditions.push(eq(entries.subcategory, rhythm.matchSubcategory));
    }
    if (rhythm.matchType) {
      matchConditions.push(eq(entries.type, rhythm.matchType));
    }
    if (rhythm.matchName) {
      matchConditions.push(eq(entries.name, rhythm.matchName));
    }

    // Get the latest matching entry timestamp
    const [latestEntry] = await db
      .select({
        timestamp: entries.timestamp,
        durationSeconds: entries.durationSeconds,
      })
      .from(entries)
      .where(and(...matchConditions))
      .orderBy(desc(entries.timestamp))
      .limit(1);

    const latestEntryTimestamp = latestEntry?.timestamp || null;

    // Get rhythm's chain type configuration
    const chainType = (rhythm.chainType as ChainType) || "weekly_low";
    const chainConfig = getChainConfig(chainType);

    // Check if we can use cached data
    const cached = rhythm.cachedChainStats as CachedChainData | null;
    const cacheValid =
      cached &&
      cached.lastEntryTimestamp === latestEntryTimestamp &&
      cached.chains &&
      cached.chains.length > 0 &&
      cached.totals;

    let chain: ChainStat;
    let totals: RhythmTotals;

    if (cacheValid) {
      // Cache is up to date - use it directly
      const cachedChain = cached.chains.find((c) => c.type === chainType);
      if (cachedChain) {
        chain = {
          type: cachedChain.type as ChainType,
          current: cachedChain.current,
          longest: cachedChain.longest,
          unit: cachedChain.unit as "days" | "weeks" | "months",
        };
      } else {
        // Chain type changed, need recalc
        chain = {
          type: chainType,
          current: 0,
          longest: 0,
          unit: chainConfig.unit,
        };
      }
      totals = cached.totals;
      logger.debug("Using cached chain stats", { rhythmId, chainType });
    } else {
      // Need full recalculation
      logger.debug("Calculating chain stats", {
        rhythmId,
        chainType,
        reason: cached ? "new entries" : "no cache",
      });

      // Fetch ALL entries for complete chain calculations
      const allTimeStartDate = new Date("2000-01-01");
      const allMatchingEntries = await getMatchingEntries(
        db,
        rhythm,
        userId,
        allTimeStartDate,
        visualEndDate,
      );

      // Convert ALL entries to day statuses for chain calculations
      const allDayStatuses = entriesToDayStatuses(
        allMatchingEntries,
        rhythm.durationThresholdSeconds,
      );

      // Calculate the typed chain statistic
      chain = calculateTypedChainStats(
        allDayStatuses,
        chainType,
        rhythm.chainTargetMinutes || undefined,
      );

      // Calculate totals using ALL data
      totals = calculateTotals(allMatchingEntries, allDayStatuses);

      // Cache the results
      const newCache: CachedChainData = {
        chains: [chain],
        currentChain: {
          lastCompleteDate: null,
          lastPeriodKey: null,
          thisPeriodDays: 0,
          thisPeriodSeconds: 0,
        },
        totals,
        lastCalculatedAt: new Date().toISOString(),
        lastEntryTimestamp: latestEntryTimestamp,
      };

      // Update cache in background
      db.update(rhythms)
        .set({
          cachedChainStats: newCache,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rhythms.id, rhythmId))
        .run();
    }

    // Always fetch recent entries for visualization (lightweight - only 365 days)
    const recentEntries = await getMatchingEntries(
      db,
      rhythm,
      userId,
      visualStartDate,
      visualEndDate,
    );

    const visualDayStatuses = entriesToDayStatuses(
      recentEntries,
      rhythm.durationThresholdSeconds,
    );

    // Calculate current week progress (uses recent data)
    const weekProgress = calculateWeeklyProgress(visualDayStatuses, new Date());

    // Generate nudge message if applicable
    const targetTier: TierName =
      rhythm.frequency === "daily" ? "daily" : "weekly";
    const nudgeMessage = generateNudgeMessage(weekProgress, targetTier);

    // Determine journey stage
    const journeyStage = getJourneyStage(totals.weeksActive);

    // Select encouragement message
    const activityType = rhythm.matchCategory || "general";
    const encouragement = await selectEncouragement(
      db,
      journeyStage,
      weekProgress.daysCompleted > 0 ? "tier_achieved" : "general",
      activityType,
      weekProgress.achievedTier !== "starting"
        ? weekProgress.achievedTier
        : undefined,
    );

    return {
      rhythmId,
      currentWeek: {
        startDate: weekProgress.startDate,
        daysCompleted: weekProgress.daysCompleted,
        achievedTier: weekProgress.achievedTier,
        bestPossibleTier: weekProgress.bestPossibleTier,
        daysRemaining: weekProgress.daysRemaining,
        nudgeMessage: nudgeMessage || undefined,
      },
      // Chain stat based on rhythm's configured chain type
      chain: {
        type: chain.type,
        current: chain.current,
        longest: chain.longest,
        unit: chain.unit,
        label: chainConfig.label,
        description: chainConfig.description,
      },
      days: visualDayStatuses,
      totals: {
        totalSessions: totals.totalSessions,
        totalSeconds: totals.totalSeconds,
        totalHours: totals.totalHours,
        firstEntryDate: totals.firstEntryDate,
        weeksActive: totals.weeksActive,
        monthsActive: totals.monthsActive,
      },
      journeyStage,
      encouragement,
    };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error;
    }
    logger.error("Failed to calculate rhythm progress", {
      error,
      rhythmId,
      userId,
    });
    throw createError({
      statusCode: 500,
      message: "Failed to calculate rhythm progress",
    });
  }
});
