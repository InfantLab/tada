/**
 * POST /api/v1/webhooks/[id]/test
 *
 * Test webhook delivery
 *
 * User Story 4: Real-time Webhooks
 */

import { success, apiError } from "~/server/utils/response";
import { testWebhook } from "~/server/services/webhooks";

export default defineEventHandler(async (event) => {
  const auth = event.context.auth;

  // This endpoint requires session authentication
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
  const webhookId = getRouterParam(event, "id");

  if (!webhookId) {
    throw createError(
      apiError(event, "INVALID_WEBHOOK_ID", "Webhook ID is required", 400),
    );
  }

  try {
    const result = await testWebhook(webhookId, userId);

    return success(event, {
      webhookId,
      testResult: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw createError(
        apiError(event, "WEBHOOK_NOT_FOUND", "Webhook not found", 404),
      );
    }

    console.error("Error testing webhook:", error);
    throw createError(
      apiError(event, "TEST_WEBHOOK_FAILED", "Failed to test webhook", 500),
    );
  }
});
