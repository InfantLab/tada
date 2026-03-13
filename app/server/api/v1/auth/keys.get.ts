/**
 * GET /api/v1/auth/keys
 *
 * List user's API keys (masked for security)
 *
 * User Story 3: API Key Management
 */

import { success, apiError } from "~/server/utils/response";
import { listApiKeys } from "~/server/utils/api-key";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:v1:auth:keys:list");

export default defineEventHandler(async (event) => {
  const auth = event.context['auth']!;

  // This endpoint requires session authentication (not API key auth)
  // Users manage their API keys through the web interface
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
    // Get masked API keys for user
    const keys = await listApiKeys(userId);

    // Return success response
    return success(event, keys);
  } catch (error) {
    logger.error("Error listing API keys", error instanceof Error ? error : new Error(String(error)), { userId: event.context.user?.id, requestId: event.context.requestId });
    throw createError(
      apiError(
        event,
        "LIST_KEYS_FAILED",
        "Failed to list API keys",
        500,
      ),
    );
  }
});
