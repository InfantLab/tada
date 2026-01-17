/**
 * GET /api/rhythms/:id/progress - Get calculated progress data for a rhythm
 *
 * Returns tier calculations, chain statistics, day-by-day data,
 * totals, journey stage, and encouragement message.
 */

import { eq, and } from "drizzle-orm";
import { rhythms } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import {
  getMatchingEntries,
  entriesToDayStatuses,
  calculateChainStats,
  calculateTotals,
  getJourneyStage,
  selectEncouragement,
} from "~/server/utils/rhythmCalculator";
import {
  calculateWeeklyProgress,
  generateNudgeMessage,
  type TierName,
} from "~/utils/tierCalculator";

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
  const query = getQuery(event);
  const yearParam = query["year"];
  const year = yearParam
    ? parseInt(yearParam as string)
    : new Date().getFullYear();

  if (!rhythmId) {
    throw createError({
      statusCode: 400,
      message: "Rhythm ID is required",
    });
  }

  const db = event.context["db"];

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

    // Calculate date range for the requested year
    const startDate = new Date(year, 0, 1); // Jan 1
    const endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31

    // Get matching entries
    const matchingEntries = await getMatchingEntries(
      db,
      rhythm,
      userId,
      startDate,
      endDate,
    );

    // Convert to day statuses
    const dayStatuses = entriesToDayStatuses(
      matchingEntries,
      rhythm.durationThresholdSeconds,
    );

    // Calculate current week progress
    const weekProgress = calculateWeeklyProgress(dayStatuses, new Date());

    // Generate nudge message if applicable
    const targetTier: TierName =
      rhythm.frequency === "daily" ? "daily" : "weekly";
    const nudgeMessage = generateNudgeMessage(weekProgress, targetTier);

    // Calculate chain statistics
    const chains = calculateChainStats(dayStatuses);

    // Calculate totals
    const totals = calculateTotals(matchingEntries, dayStatuses);

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
      chains,
      days: dayStatuses,
      totals: {
        totalSessions: totals.totalSessions,
        totalSeconds: totals.totalSeconds,
        totalHours: totals.totalHours,
        firstEntryDate: totals.firstEntryDate,
        weeksActive: totals.weeksActive,
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
