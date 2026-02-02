/**
 * GET /api/v1/webhooks
 *
 * List user's webhooks with delivery statistics
 *
 * User Story 4: Real-time Webhooks
 */

import { success, apiError } from "~/server/utils/response";
import { listWebhooks } from "~/server/services/webhooks";

export default defineEventHandler(async (event) => {
  const auth = event.context.auth;

  // This endpoint requires session authentication (not API key auth)
  // Users manage their webhooks through the web interface
  if (!auth || auth.type !== "session") {
    throw createError(
      apiError(
        event,
        "SESSION_REQUIRED",
        "This endpoint requires session authentication",
        401,
      ),
    );
  }

  const userId = auth.userId;

  try {
    const webhooks = await listWebhooks(userId);

    return success(event, webhooks);
  } catch (error) {
    console.error("Error listing webhooks:", error);
    throw createError(
      apiError(
        event,
        "LIST_WEBHOOKS_FAILED",
        "Failed to list webhooks",
        500,
      ),
    );
  }
});
