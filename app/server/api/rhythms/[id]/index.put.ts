/**
 * PUT /api/rhythms/:id
 * Update a rhythm
 */

import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";
import { rhythms } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:rhythms:update");

interface UpdateRhythmBody {
  name?: string;
  emoji?: string;
  durationThresholdSeconds?: number;
  countThreshold?: number | null;
  completionMode?: "threshold" | "session";
  chainType?: string;
  chainTargetMinutes?: number | null;
  journeyThresholdType?: "hours" | "sessions" | "count";
  journeyThresholds?: { building: number; becoming: number; being: number } | null;
  frequency?: string;
  panelPreferences?: {
    showYearTracker?: boolean;
    showMonthCalendar?: boolean;
    showChainStats?: boolean;
    monthViewMode?: "calendar" | "linear";
    expandedByDefault?: boolean;
  };
}

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

  const body = await readBody<UpdateRhythmBody>(event);

  if (!body || Object.keys(body).length === 0) {
    throw createError(
      apiError(event, "BODY_REQUIRED", "Request body is required", 400)
    );
  }

  try {
    // Verify rhythm exists and belongs to user
    const [existing] = await db
      .select()
      .from(rhythms)
      .where(and(eq(rhythms.id, rhythmId), eq(rhythms.userId, userId)));

    if (!existing) {
      throw createError(notFound(event, "Rhythm"));
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        throw createError(
          apiError(event, "NAME_EMPTY", "Name cannot be empty", 400)
        );
      }
      updateData["name"] = body.name.trim();
    }

    if (body.emoji !== undefined) {
      updateData["emoji"] = body.emoji;
    }

    if (body.durationThresholdSeconds !== undefined) {
      if (body.durationThresholdSeconds < 0) {
        throw createError(
          apiError(event, "INVALID_DURATION", "Duration threshold must be non-negative", 400)
        );
      }
      updateData["durationThresholdSeconds"] = body.durationThresholdSeconds;
    }

    if (body.frequency !== undefined) {
      const validFrequencies = ["daily", "weekly", "flexible"];
      if (!validFrequencies.includes(body.frequency)) {
        throw createError(
          apiError(event, "INVALID_FREQUENCY", `Invalid frequency. Must be one of: ${validFrequencies.join(", ")}`, 400)
        );
      }
      updateData["frequency"] = body.frequency;
    }

    if (body.countThreshold !== undefined) {
      if (body.countThreshold !== null && (body.countThreshold < 1 || body.countThreshold > 10000)) {
        throw createError(
          apiError(event, "INVALID_COUNT_THRESHOLD", "Count threshold must be between 1 and 10000", 400)
        );
      }
      updateData["countThreshold"] = body.countThreshold;
    }

    if (body.completionMode !== undefined) {
      const validModes = ["threshold", "session"];
      if (!validModes.includes(body.completionMode)) {
        throw createError(
          apiError(event, "INVALID_COMPLETION_MODE", "Invalid completion mode", 400)
        );
      }
      updateData["completionMode"] = body.completionMode;
    }

    if (body.chainType !== undefined) {
      const validChainTypes = [
        "daily",
        "weekly_high",
        "weekly_low",
        "weekly_target",
        "monthly_target",
      ];
      if (!validChainTypes.includes(body.chainType)) {
        throw createError(
          apiError(event, "INVALID_CHAIN_TYPE", "Invalid chain type", 400)
        );
      }
      updateData["chainType"] = body.chainType;
      // Invalidate cached chain stats when chain type changes
      updateData["cachedChainStats"] = null;
    }

    if (body.chainTargetMinutes !== undefined) {
      updateData["chainTargetMinutes"] = body.chainTargetMinutes;
    }

    if (body.journeyThresholdType !== undefined) {
      const validTypes = ["hours", "sessions", "count"];
      if (!validTypes.includes(body.journeyThresholdType)) {
        throw createError(
          apiError(event, "INVALID_JOURNEY_THRESHOLD_TYPE", "Invalid journey threshold type", 400)
        );
      }
      updateData["journeyThresholdType"] = body.journeyThresholdType;
    }

    if (body.journeyThresholds !== undefined) {
      if (body.journeyThresholds !== null) {
        const { building, becoming, being } = body.journeyThresholds;
        if (building >= becoming || becoming >= being) {
          throw createError(
            apiError(event, "INVALID_THRESHOLDS", "Thresholds must be in ascending order", 400)
          );
        }
      }
      updateData["journeyThresholds"] = body.journeyThresholds;
    }

    if (body.panelPreferences !== undefined) {
      // Merge with existing preferences
      const existingPrefs = (existing.panelPreferences || {}) as Record<
        string,
        unknown
      >;
      updateData["panelPreferences"] = {
        ...existingPrefs,
        ...body.panelPreferences,
      };
    }

    // Perform update
    const [updated] = await db
      .update(rhythms)
      .set(updateData)
      .where(eq(rhythms.id, rhythmId))
      .returning();

    if (!updated) {
      throw createError(notFound(event, "Rhythm"));
    }

    logger.info("Rhythm updated", {
      rhythmId,
      userId,
      changes: Object.keys(body),
    });

    return {
      id: updated.id,
      name: updated.name,
      matchCategory: updated.matchCategory,
      durationThresholdSeconds: updated.durationThresholdSeconds,
      frequency: updated.frequency,
      panelPreferences: updated.panelPreferences,
      updatedAt: updated.updatedAt,
    };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error;
    }
    logger.error("Failed to update rhythm", { error, rhythmId, userId });
    throw createError(internalError(event, "Failed to update rhythm"));
  }
});
