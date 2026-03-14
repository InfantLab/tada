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
    throw createError(unauthorized(event));
  }

  const userId = user.id;
  const presetId = getRouterParam(event, "id");

  if (!presetId) {
    throw createError(
      apiError(event, "PRESET_ID_REQUIRED", "Preset ID is required", 400)
    );
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
      throw createError(notFound(event, "Preset"));
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
    throw createError(internalError(event, "Failed to delete preset"));
  }
});
