/**
 * POST /api/v1/webhooks
 *
 * Register a new webhook
 *
 * User Story 4: Real-time Webhooks
 */

import { z } from "zod";
import { created, apiError, validationError } from "~/server/utils/response";
import { registerWebhook } from "~/server/services/webhooks";

// Validation schema for webhook registration
const webhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(8, "Secret must be at least 8 characters"),
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
    .min(1, "At least one event must be selected"),
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

  // Parse and validate request body
  const body = await readBody(event);
  const parseResult = webhookSchema.safeParse(body);

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
    const webhook = await registerWebhook(userId, parseResult.data);

    return created(event, webhook);
  } catch (error) {
    // Check for URL validation errors
    if (error instanceof Error) {
      if (
        error.message.includes("HTTPS required") ||
        error.message.includes("Private IP")
      ) {
        throw createError(
          apiError(event, "INVALID_WEBHOOK_URL", error.message, 400),
        );
      }
    }

    console.error("Error registering webhook:", error);
    throw createError(
      apiError(
        event,
        "REGISTER_WEBHOOK_FAILED",
        "Failed to register webhook",
        500,
      ),
    );
  }
});
