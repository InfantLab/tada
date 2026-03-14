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

interface CustomCategory {
  slug: string;
  label: string;
  emoji: string;
  subcategories: Array<{ slug: string; label: string; emoji: string }>;
  createdAt: string;
}

interface PreferencesUpdate {
  hiddenCategories?: string[];
  hiddenEntryTypes?: string[];
  customEmojis?: Record<string, string>;
  customEntryTypes?: Array<{ name: string; emoji: string }>;
  tallyPresets?: Array<{ name: string; category?: string; emoji?: string }>;
  customCategories?: CustomCategory[];
}

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  const userId = user.id;
  const body = await readBody<PreferencesUpdate>(event);

  logger.debug("Updating preferences", { userId, fields: Object.keys(body) });

  // Validate arrays
  if (body.hiddenCategories && !Array.isArray(body.hiddenCategories)) {
    throw createError(
      apiError(event, "INVALID_FIELD", "hiddenCategories must be an array", 400)
    );
  }
  if (body.hiddenEntryTypes && !Array.isArray(body.hiddenEntryTypes)) {
    throw createError(
      apiError(event, "INVALID_FIELD", "hiddenEntryTypes must be an array", 400)
    );
  }
  if (body.customEntryTypes && !Array.isArray(body.customEntryTypes)) {
    throw createError(
      apiError(event, "INVALID_FIELD", "customEntryTypes must be an array", 400)
    );
  }
  if (body.tallyPresets && !Array.isArray(body.tallyPresets)) {
    throw createError(
      apiError(event, "INVALID_FIELD", "tallyPresets must be an array", 400)
    );
  }
  if (body.customCategories && !Array.isArray(body.customCategories)) {
    throw createError(
      apiError(event, "INVALID_FIELD", "customCategories must be an array", 400)
    );
  }

  // Validate customEmojis is an object
  if (body.customEmojis && typeof body.customEmojis !== "object") {
    throw createError(
      apiError(event, "INVALID_FIELD", "customEmojis must be an object", 400)
    );
  }

  // Validate customEntryTypes structure
  if (body.customEntryTypes) {
    for (const entry of body.customEntryTypes) {
      if (typeof entry.name !== "string" || typeof entry.emoji !== "string") {
        throw createError(
          apiError(event, "INVALID_FIELD", "customEntryTypes entries must have name and emoji strings", 400)
        );
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
      if (body.customCategories !== undefined) {
        updateData["customCategories"] = body.customCategories;
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
        customCategories: body.customCategories || [],
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
    throw createError(internalError(event, "Failed to update preferences"));
  }
});
