/**
 * PATCH /api/v1/webhooks/[id]
 *
 * Update webhook configuration
 *
 * User Story 4: Real-time Webhooks
 */

import { z } from "zod";
import { success, apiError, validationError } from "~/server/utils/response";
import { updateWebhook } from "~/server/services/webhooks";

// Validation schema for webhook updates (all fields optional)
const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z
    .array(
      z.enum([
        "entry.created",
        "entry.updated",
        "entry.deleted",
        "streak.milestone",
        "rhythm.broken",
        "rhythm.completed",
        "pattern.detected",
        "import.completed",
      ]),
    )
    .min(1)
    .optional(),
  active: z.boolean().optional(),
  description: z.string().optional(),
});

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

  // Parse and validate request body
  const body = await readBody(event);
  const parseResult = updateWebhookSchema.safeParse(body);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};

    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }

    throw createError(validationError(event, errors));
  }

  try {
    const webhook = await updateWebhook(webhookId, userId, parseResult.data);

    return success(event, webhook);
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        throw createError(
          apiError(event, "WEBHOOK_NOT_FOUND", "Webhook not found", 404),
        );
      }

      if (
        error.message.includes("HTTPS required") ||
        error.message.includes("Private IP")
      ) {
        throw createError(
          apiError(event, "INVALID_WEBHOOK_URL", error.message, 400),
        );
      }
    }

    console.error("Error updating webhook:", error);
    throw createError(
      apiError(
        event,
        "UPDATE_WEBHOOK_FAILED",
        "Failed to update webhook",
        500,
      ),
    );
  }
});
