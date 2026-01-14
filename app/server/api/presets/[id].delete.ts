/**
 * DELETE /api/presets/[id]
 * Delete a timer preset
 */

import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";
import { timerPresets } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";

const logger = createLogger("api:presets:delete");

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = event.context.user;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Authentication required",
    });
  }

  const userId = user.id;
  const presetId = getRouterParam(event, "id");

  if (!presetId) {
    throw createError({
      statusCode: 400,
      message: "Preset ID is required",
    });
  }

  logger.debug("Deleting preset", { userId, presetId });

  try {
    // Verify ownership and delete
    const result = await db
      .delete(timerPresets)
      .where(
        and(eq(timerPresets.id, presetId), eq(timerPresets.userId, userId))
      )
      .returning({ id: timerPresets.id });

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Preset not found",
      });
    }

    logger.debug("Preset deleted", { userId, presetId });
    return { success: true, id: presetId };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error;
    }
    logger.error("Failed to delete preset", error as Error, {
      userId,
      presetId,
    });
    throw createError({
      statusCode: 500,
      message: "Failed to delete preset",
    });
  }
});
