/**
 * POST /api/weekly-rhythms/messages/:id/dismiss
 * Marks an in-app encouragement banner or celebration card as dismissed.
 */

import { dismissMessage } from "~/server/services/weekly-rhythms/messages";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:weekly-rhythms:messages:dismiss");

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  const messageId = getRouterParam(event, "id");
  if (!messageId) {
    throw createError(
      apiError(event, "MISSING_ID", "Message ID is required", 400),
    );
  }

  try {
    await dismissMessage(messageId, user.id);

    return {
      dismissed: true,
      messageId,
    };
  } catch (error) {
    logger.error("Failed to dismiss message", error as Error);
    throw createError(internalError(event, "Failed to dismiss message"));
  }
});
