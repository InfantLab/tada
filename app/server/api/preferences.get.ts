/**
 * GET /api/preferences
 * Retrieve user preferences for customisation settings
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { userPreferences } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";

const logger = createLogger("api:preferences:get");

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
  logger.debug("Fetching preferences", { userId });

  try {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (!prefs) {
      // Return default empty preferences if none exist
      logger.debug("No preferences found, returning defaults", { userId });
      return {
        id: null,
        userId,
        hiddenCategories: [],
        hiddenEntryTypes: [],
        customEmojis: {},
        customEntryTypes: [],
        createdAt: null,
        updatedAt: null,
      };
    }

    logger.debug("Preferences found", { userId, id: prefs.id });
    return prefs;
  } catch (error) {
    logger.error("Failed to fetch preferences", { userId, error });
    throw createError({
      statusCode: 500,
      message: "Failed to fetch preferences",
    });
  }
});
