/**
 * PUT /api/preferences
 * Update user preferences for customisation settings
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { userPreferences } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";
import { generateId } from "~/server/utils/tokens";

const logger = createLogger("api:preferences:put");

interface PreferencesUpdate {
  hiddenCategories?: string[];
  hiddenEntryTypes?: string[];
  customEmojis?: Record<string, string>;
  customEntryTypes?: Array<{ name: string; emoji: string }>;
  tallyPresets?: Array<{ name: string; category?: string; emoji?: string }>;
}

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
  const body = await readBody<PreferencesUpdate>(event);

  logger.debug("Updating preferences", { userId, fields: Object.keys(body) });

  // Validate arrays
  if (body.hiddenCategories && !Array.isArray(body.hiddenCategories)) {
    throw createError({
      statusCode: 400,
      message: "hiddenCategories must be an array",
    });
  }
  if (body.hiddenEntryTypes && !Array.isArray(body.hiddenEntryTypes)) {
    throw createError({
      statusCode: 400,
      message: "hiddenEntryTypes must be an array",
    });
  }
  if (body.customEntryTypes && !Array.isArray(body.customEntryTypes)) {
    throw createError({
      statusCode: 400,
      message: "customEntryTypes must be an array",
    });
  }
  if (body.tallyPresets && !Array.isArray(body.tallyPresets)) {
    throw createError({
      statusCode: 400,
      message: "tallyPresets must be an array",
    });
  }

  // Validate customEmojis is an object
  if (body.customEmojis && typeof body.customEmojis !== "object") {
    throw createError({
      statusCode: 400,
      message: "customEmojis must be an object",
    });
  }

  // Validate customEntryTypes structure
  if (body.customEntryTypes) {
    for (const entry of body.customEntryTypes) {
      if (typeof entry.name !== "string" || typeof entry.emoji !== "string") {
        throw createError({
          statusCode: 400,
          message: "customEntryTypes entries must have name and emoji strings",
        });
      }
    }
  }

  try {
    // Check if preferences exist
    const [existing] = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const now = new Date().toISOString();

    if (existing) {
      // Update existing preferences
      const updateData: Record<string, unknown> = { updatedAt: now };

      if (body.hiddenCategories !== undefined) {
        updateData["hiddenCategories"] = body.hiddenCategories;
      }
      if (body.hiddenEntryTypes !== undefined) {
        updateData["hiddenEntryTypes"] = body.hiddenEntryTypes;
      }
      if (body.customEmojis !== undefined) {
        updateData["customEmojis"] = body.customEmojis;
      }
      if (body.customEntryTypes !== undefined) {
        updateData["customEntryTypes"] = body.customEntryTypes;
      }
      if (body.tallyPresets !== undefined) {
        updateData["tallyPresets"] = body.tallyPresets;
      }

      await db
        .update(userPreferences)
        .set(updateData)
        .where(eq(userPreferences.id, existing.id));

      logger.debug("Preferences updated", { userId, id: existing.id });
    } else {
      // Create new preferences
      await db.insert(userPreferences).values({
        id: generateId(),
        userId,
        hiddenCategories: body.hiddenCategories || [],
        hiddenEntryTypes: body.hiddenEntryTypes || [],
        customEmojis: body.customEmojis || {},
        customEntryTypes: body.customEntryTypes || [],
        tallyPresets: body.tallyPresets || [],
        createdAt: now,
        updatedAt: now,
      });

      logger.debug("Preferences created", { userId });
    }

    // Return updated preferences
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return prefs;
  } catch (error) {
    logger.error("Failed to update preferences", { userId, error });
    throw createError({
      statusCode: 500,
      message: "Failed to update preferences",
    });
  }
});
