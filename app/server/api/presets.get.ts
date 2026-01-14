/**
 * GET /api/presets
 * List all timer presets for the authenticated user
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { timerPresets } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";

const logger = createLogger("api:presets:get");

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
  logger.debug("Fetching presets", { userId });

  try {
    const presets = await db
      .select()
      .from(timerPresets)
      .where(eq(timerPresets.userId, userId))
      .orderBy(timerPresets.createdAt);

    logger.debug("Presets found", { userId, count: presets.length });
    return presets;
  } catch (error) {
    logger.error("Failed to fetch presets", error as Error, { userId });
    throw createError({
      statusCode: 500,
      message: "Failed to fetch presets",
    });
  }
});
