/**
 * PUT /api/rhythms/:id
 * Update a rhythm
 */

import { eq, and } from "drizzle-orm";
import { rhythms } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:rhythms:update");

interface UpdateRhythmBody {
  name?: string;
  emoji?: string;
  durationThresholdSeconds?: number;
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

  const body = await readBody<UpdateRhythmBody>(event);

  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      message: "Request body is required",
    });
  }

  const db = event.context["db"];

  try {
    // Verify rhythm exists and belongs to user
    const [existing] = await db
      .select()
      .from(rhythms)
      .where(and(eq(rhythms.id, rhythmId), eq(rhythms.userId, userId)));

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: "Rhythm not found",
      });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        throw createError({
          statusCode: 400,
          message: "Name cannot be empty",
        });
      }
      updateData["name"] = body.name.trim();
    }

    if (body.emoji !== undefined) {
      updateData["emoji"] = body.emoji;
    }

    if (body.durationThresholdSeconds !== undefined) {
      if (body.durationThresholdSeconds < 0) {
        throw createError({
          statusCode: 400,
          message: "Duration threshold must be non-negative",
        });
      }
      updateData["durationThresholdSeconds"] = body.durationThresholdSeconds;
    }

    if (body.frequency !== undefined) {
      const validFrequencies = ["daily", "weekly", "flexible"];
      if (!validFrequencies.includes(body.frequency)) {
        throw createError({
          statusCode: 400,
          message: `Invalid frequency. Must be one of: ${validFrequencies.join(", ")}`,
        });
      }
      updateData["frequency"] = body.frequency;
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

    logger.info("Rhythm updated", {
      rhythmId,
      userId,
      changes: Object.keys(body),
    });

    return {
      id: updated.id,
      name: updated.name,
      emoji: updated.emoji,
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
    throw createError({
      statusCode: 500,
      message: "Failed to update rhythm",
    });
  }
});
