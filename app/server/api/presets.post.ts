/**
 * POST /api/presets
 * Create a new timer preset
 */

import { db } from "~/server/db";
import { timerPresets } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";
import { generateId } from "~/server/utils/tokens";

const logger = createLogger("api:presets:post");

interface BellConfig {
  startBell?: string;
  endBell?: string;
  intervalBells?: Array<{ minutes: number; sound: string }>;
}

interface PresetBody {
  name: string;
  category: string;
  subcategory: string;
  durationSeconds?: number | null;
  bellConfig?: BellConfig;
  backgroundAudio?: string;
  isDefault?: boolean;
}

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  const userId = user.id;
  const body = await readBody<PresetBody>(event);

  // Validate required fields
  if (!body.name || typeof body.name !== "string") {
    throw createError(
      apiError(event, "NAME_REQUIRED", "name is required", 400)
    );
  }

  if (!body.category || typeof body.category !== "string") {
    throw createError(
      apiError(event, "CATEGORY_REQUIRED", "category is required", 400)
    );
  }

  if (!body.subcategory || typeof body.subcategory !== "string") {
    throw createError(
      apiError(event, "SUBCATEGORY_REQUIRED", "subcategory is required", 400)
    );
  }

  logger.debug("Creating preset", { userId, name: body.name });

  try {
    const now = new Date().toISOString();
    const id = generateId();

    const [preset] = await db
      .insert(timerPresets)
      .values({
        id,
        userId,
        name: body.name.trim(),
        category: body.category,
        subcategory: body.subcategory,
        durationSeconds: body.durationSeconds ?? null,
        bellConfig: body.bellConfig ?? null,
        backgroundAudio: body.backgroundAudio ?? null,
        isDefault: body.isDefault ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!preset) {
      throw new Error("Failed to insert preset");
    }

    logger.debug("Preset created", { userId, presetId: preset.id });
    return preset;
  } catch (error) {
    logger.error("Failed to create preset", error as Error, { userId });
    throw createError(internalError(event, "Failed to create preset"));
  }
});
