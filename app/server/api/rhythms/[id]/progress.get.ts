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
  CHAIN_TYPE_ORDER,
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

    // Get rhythm's primary chain type configuration
    const primaryChainType = (rhythm.chainType as ChainType) || "weekly_low";

    // Fetch ALL entries - used for visualization AND chain calculations
    const allTimeStartDate = new Date("2000-01-01");
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const allMatchingEntries = await getMatchingEntries(
      db,
      rhythm,
      userId,
      allTimeStartDate,
      endDate,
    );

    // Convert ALL entries to day statuses - used for visualization and calculations
    const allDayStatuses = entriesToDayStatuses(
      allMatchingEntries,
      rhythm.durationThresholdSeconds,
      rhythm.countThreshold,
    );

    // Check if we can use cached chain/totals data
    const cached = rhythm.cachedChainStats as CachedChainData | null;
    const cacheValid =
      cached &&
      cached.lastEntryTimestamp === latestEntryTimestamp &&
      cached.chains &&
      cached.chains.length === CHAIN_TYPE_ORDER.length &&
      cached.totals;

    let chains: ChainStat[];
    let totals: RhythmTotals;

    if (cacheValid) {
      // Cache is up to date - use cached chains and totals
      chains = cached.chains.map((c) => ({
        type: c.type as ChainType,
        current: c.current,
        longest: c.longest,
        unit: c.unit as "days" | "weeks" | "months",
      }));
      totals = cached.totals;
      logger.debug("Using cached chain stats", { rhythmId });
    } else {
      // Need full recalculation
      logger.debug("Calculating all chain stats", {
        rhythmId,
        reason: cached ? "new entries or missing types" : "no cache",
      });

      // Calculate ALL chain types
      chains = CHAIN_TYPE_ORDER.map((chainType) =>
        calculateTypedChainStats(
          allDayStatuses,
          chainType,
          rhythm.chainTargetMinutes || undefined,
        ),
      );

      // Calculate totals using ALL data
      totals = calculateTotals(allMatchingEntries, allDayStatuses);

      // Cache the results
      const newCache: CachedChainData = {
        chains,
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

    // Calculate current week progress
    const weekProgress = calculateWeeklyProgress(allDayStatuses, new Date());

    // Generate nudge message if applicable
    const targetTier: TierName =
      rhythm.frequency === "daily" ? "daily" : "weekly";
    const nudgeMessage = generateNudgeMessage(weekProgress, targetTier);

    // Determine journey stage based on metric appropriate to type (hours for timed, count for tally)
    const journeyMetric =
      rhythm.matchType === "tally" ? totals.totalCount : totals.totalHours;
    const journeyStage = getJourneyStage(journeyMetric);

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
      matchType: rhythm.matchType,
      primaryChainType,
      chainTargetMinutes: rhythm.chainTargetMinutes || null,
      durationThresholdSeconds: rhythm.durationThresholdSeconds,
      countThreshold: rhythm.countThreshold || null,
      currentWeek: {
        startDate: weekProgress.startDate,
        daysCompleted: weekProgress.daysCompleted,
        achievedTier: weekProgress.achievedTier,
        bestPossibleTier: weekProgress.bestPossibleTier,
        daysRemaining: weekProgress.daysRemaining,
        nudgeMessage: nudgeMessage || undefined,
      },
      // All chain types with their stats
      chains: chains.map((chain) => {
        const config = getChainConfig(chain.type);
        return {
          type: chain.type,
          current: chain.current,
          longest: chain.longest,
          unit: chain.unit,
          label: config.label,
          description: config.description,
        };
      }),
      days: allDayStatuses,
      totals: {
        totalSessions: totals.totalSessions,
        totalSeconds: totals.totalSeconds,
        totalHours: totals.totalHours,
        totalCount: totals.totalCount,
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
