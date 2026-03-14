/**
 * PUT /api/presets/[id]
 * Update a timer preset
 */

import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";
import { timerPresets } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";

const logger = createLogger("api:presets:put");

interface BellConfig {
  startBell?: string;
  endBell?: string;
  intervalBells?: Array<{ minutes: number; sound: string }>;
}

interface PresetUpdate {
  name?: string;
  category?: string;
  subcategory?: string;
  durationSeconds?: number | null;
  bellConfig?: BellConfig | null;
  backgroundAudio?: string | null;
  isDefault?: boolean;
}

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

  const body = await readBody<PresetUpdate>(event);

  logger.debug("Updating preset", { userId, presetId });

  try {
    // Verify ownership
    const [existing] = await db
      .select({ id: timerPresets.id })
      .from(timerPresets)
      .where(
        and(eq(timerPresets.id, presetId), eq(timerPresets.userId, userId))
      )
      .limit(1);

    if (!existing) {
      throw createError(notFound(event, "Preset"));
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (body.name !== undefined) updateData["name"] = body.name.trim();
    if (body.category !== undefined) updateData["category"] = body.category;
    if (body.subcategory !== undefined)
      updateData["subcategory"] = body.subcategory;
    if (body.durationSeconds !== undefined)
      updateData["durationSeconds"] = body.durationSeconds;
    if (body.bellConfig !== undefined)
      updateData["bellConfig"] = body.bellConfig;
    if (body.backgroundAudio !== undefined)
      updateData["backgroundAudio"] = body.backgroundAudio;
    if (body.isDefault !== undefined) updateData["isDefault"] = body.isDefault;

    const [preset] = await db
      .update(timerPresets)
      .set(updateData)
      .where(eq(timerPresets.id, presetId))
      .returning();

    logger.debug("Preset updated", { userId, presetId });
    return preset;
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error;
    }
    logger.error("Failed to update preset", error as Error, {
      userId,
      presetId,
    });
    throw createError(internalError(event, "Failed to update preset"));
  }
});
