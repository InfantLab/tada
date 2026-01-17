/**
 * GET /api/rhythms/:id
 * Get a single rhythm by ID
 */

import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";
import { rhythms } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:rhythms:get-one");

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

    logger.info("Rhythm fetched", { rhythmId, userId });

    return {
      id: rhythm.id,
      name: rhythm.name,
      emoji: rhythm.emoji,
      matchCategory: rhythm.matchCategory,
      matchSubcategory: rhythm.matchSubcategory,
      matchType: rhythm.matchType,
      durationThresholdSeconds: rhythm.durationThresholdSeconds,
      frequency: rhythm.frequency,
      goalType: rhythm.goalType,
      goalValue: rhythm.goalValue,
      goalUnit: rhythm.goalUnit,
      panelPreferences: rhythm.panelPreferences,
      createdAt: rhythm.createdAt,
      updatedAt: rhythm.updatedAt,
    };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error;
    }
    logger.error("Failed to fetch rhythm", { error, rhythmId, userId });
    throw createError({
      statusCode: 500,
      message: "Failed to fetch rhythm",
    });
  }
});
