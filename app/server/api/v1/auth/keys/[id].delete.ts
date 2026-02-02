/**
 * DELETE /api/v1/auth/keys/[id]
 *
 * Revoke an API key (soft delete)
 *
 * User Story 3: API Key Management
 */

import { success, apiError } from "~/server/utils/response";
import { revokeApiKey } from "~/server/utils/api-key";

export default defineEventHandler(async (event) => {
  const auth = event.context.auth;

  // This endpoint requires session authentication (not API key auth)
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

  // Get API key ID from route params
  const keyId = getRouterParam(event, "id");

  if (!keyId) {
    throw createError(
      apiError(event, "INVALID_ID", "API key ID is required", 400),
    );
  }

  try {
    // Revoke the API key (soft delete)
    await revokeApiKey(keyId, userId);

    // Return success response
    return success(event, { id: keyId }, { revoked: true });
  } catch (error) {
    console.error("Error revoking API key:", error);
    throw createError(
      apiError(
        event,
        "REVOKE_KEY_FAILED",
        "Failed to revoke API key",
        500,
      ),
    );
  }
});
