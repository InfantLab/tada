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
import type {
  RhythmTotals,
  CachedChainData,
  JourneyThresholdType,
} from "~/server/utils/rhythmCalculator";
import {
  getMatchingEntries,
  entriesToDayStatuses,
  calculateTypedChainStats,
  calculateTotals,
  getJourneyStage,
  getDefaultThresholdType,
  getJourneyMetric,
  selectEncouragement,
} from "~/server/utils/rhythmCalculator";

import {
  calculateWeeklyProgress,
  generateChainNudge,
  getChainConfig,
  CHAIN_TYPE_ORDER,
  formatDate,
  type ChainType,
  type ChainStat,
} from "~/utils/tierCalculator";


const logger = createLogger("api:rhythms:progress");

export default defineEventHandler(async (event) => {
  // Require authentication
  const session = event.context.session;
  if (!session?.userId) {
    throw createError(unauthorized(event));
  }

  const userId = session.userId;
  const rhythmId = getRouterParam(event, "id");

  if (!rhythmId) {
    throw createError(
      apiError(event, "RHYTHM_ID_REQUIRED", "Rhythm ID is required", 400)
    );
  }

  try {
    // Fetch the rhythm
    const [rhythm] = await db
      .select()
      .from(rhythms)
      .where(and(eq(rhythms.id, rhythmId), eq(rhythms.userId, userId)));

    if (!rhythm) {
      throw createError(notFound(event, "Rhythm"));
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
    const sessionBased = rhythm.completionMode === "session";
    const allDayStatuses = entriesToDayStatuses(
      allMatchingEntries,
      rhythm.durationThresholdSeconds,
      rhythm.countThreshold,
      sessionBased,
    );

    // Check if we can use cached chain/totals data
    // Compare both latest timestamp AND entry count to catch historical inserts
    const cached = rhythm.cachedChainStats as CachedChainData | null;
    const entryCount = allMatchingEntries.length;
    const cacheValid =
      cached &&
      cached.lastEntryTimestamp === latestEntryTimestamp &&
      cached.entryCount === entryCount &&
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
        entryCount,
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

    // Generate chain-aware nudge message
    const primaryChainStat = chains.find(c => c.type === primaryChainType);
    const todayStr = formatDate(new Date());
    const completedToday = allDayStatuses.some(d => d.date === todayStr && d.isComplete);
    const nudgeMessage = generateChainNudge(
      primaryChainType,
      weekProgress.daysCompleted,
      weekProgress.daysRemaining,
      primaryChainStat?.current ?? 0,
      completedToday,
    );

    // Determine journey stage using rhythm's configured threshold type
    const thresholdType =
      (rhythm.journeyThresholdType as JourneyThresholdType) ||
      getDefaultThresholdType(rhythm.matchType);
    const customThresholds = rhythm.journeyThresholds as {
      building: number;
      becoming: number;
      being: number;
    } | null;
    const journeyMetric = getJourneyMetric(thresholdType, totals);
    const journeyStage = getJourneyStage(journeyMetric, thresholdType, customThresholds);

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
          gaps: chain.gaps,
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
    throw createError(internalError(event, "Failed to calculate rhythm progress"));
  }
});
