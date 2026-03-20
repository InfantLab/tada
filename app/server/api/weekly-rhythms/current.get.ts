/**
 * GET /api/weekly-rhythms/current
 * Fetches the current user-visible weekly content for in-app surfaces.
 */

import { getActiveMessages } from "~/server/services/weekly-rhythms/messages";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:weekly-rhythms:current:get");

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  try {
    const messages = await getActiveMessages(user.id);

    // Find latest encouragement and celebration
    const encouragement = messages.find((m) => m.kind === "encouragement") ?? null;
    const celebration = messages.find((m) => m.kind === "celebration") ?? null;

    return {
      encouragement: encouragement
        ? {
            id: encouragement.id,
            weekStartDate: encouragement.weekStartDate,
            title: encouragement.title,
            summaryBlocks: encouragement.summaryBlocks,
            dismissedAt: encouragement.dismissedAt,
          }
        : null,
      celebration: celebration
        ? {
            id: celebration.id,
            weekStartDate: celebration.weekStartDate,
            title: celebration.title,
            summaryBlocks: celebration.summaryBlocks,
            narrativeText: celebration.narrativeText,
          }
        : null,
    };
  } catch (error) {
    logger.error("Failed to fetch current weekly content", error as Error);
    throw createError(
      internalError(event, "Failed to fetch current weekly content"),
    );
  }
});
