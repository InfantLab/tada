/**
 * POST /api/rhythms - Create a new rhythm
 */

import { randomUUID } from "crypto";
import { db } from "~/server/db";
import { rhythms } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:rhythms:create");

interface CreateRhythmBody {
  name: string;
  matchCategory: string;
  matchSubcategory?: string | null;
  matchType?: string | null;
  matchName?: string | null;
  durationThresholdSeconds?: number;
  frequency: string;
  frequencyTarget?: number | null;
  goalType?: string;
  goalValue?: number;
  goalUnit?: string | null;
}

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
  const body = await readBody<CreateRhythmBody>(event);

  // Validate required fields
  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    throw createError({
      statusCode: 400,
      message: "Name is required",
      data: { details: { name: "Name is required" } },
    });
  }

  if (!body.matchCategory) {
    throw createError({
      statusCode: 400,
      message: "Category is required",
      data: { details: { matchCategory: "Category is required" } },
    });
  }

  if (!body.frequency) {
    throw createError({
      statusCode: 400,
      message: "Frequency is required",
      data: { details: { frequency: "Frequency is required" } },
    });
  }

  // Validate frequency value
  const validFrequencies = ["daily", "weekly", "monthly"];
  if (!validFrequencies.includes(body.frequency)) {
    throw createError({
      statusCode: 400,
      message: "Invalid frequency",
      data: { details: { frequency: "Invalid frequency" } },
    });
  }

  // Validate duration threshold
  const durationThreshold = body.durationThresholdSeconds ?? 360; // Default 6 minutes
  if (durationThreshold < 0 || durationThreshold > 86400) {
    throw createError({
      statusCode: 400,
      message: "Duration must be between 0 and 24 hours",
      data: {
        details: {
          durationThresholdSeconds: "Duration must be between 0 and 24 hours",
        },
      },
    });
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  try {
    await db.insert(rhythms).values({
      id,
      userId,
      name: body.name.trim(),
      matchType: body.matchType || "timed",
      matchCategory: body.matchCategory,
      matchSubcategory: body.matchSubcategory || null,
      matchName: body.matchName || null,
      durationThresholdSeconds: durationThreshold,
      frequency: body.frequency,
      frequencyTarget: body.frequencyTarget || null,
      goalType: body.goalType || "duration",
      goalValue: body.goalValue || Math.floor(durationThreshold / 60),
      goalUnit: body.goalUnit || "minutes",
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      panelPreferences: {
        showYearTracker: true,
        showMonthCalendar: true,
        showChainStats: true,
        monthViewMode: "calendar" as const,
        expandedByDefault: true,
      },
      createdAt: now,
      updatedAt: now,
    });

    logger.info(`Created rhythm ${id} for user ${userId}`);

    // Return the created rhythm
    setResponseStatus(event, 201);
    return {
      id,
      name: body.name.trim(),
      matchCategory: body.matchCategory,
      durationThresholdSeconds: durationThreshold,
      frequency: body.frequency,
      createdAt: now,
    };
  } catch (error) {
    logger.error("Failed to create rhythm", { error, userId });
    throw createError({
      statusCode: 500,
      message: "Failed to create rhythm",
    });
  }
});
