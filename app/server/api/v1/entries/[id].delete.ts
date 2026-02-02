/**
 * DELETE /api/v1/entries/[id]
 *
 * Delete an entry (soft delete)
 *
 * User Story 2: Voice Entry Creation
 */

import { requirePermission } from "~/server/utils/permissions";
import { success, apiError } from "~/server/utils/response";
import { deleteEntry } from "~/server/services/entries";
import { triggerWebhooks } from "~/server/services/webhooks";

export default defineEventHandler(async (event) => {
  // Require entries:write permission
  requirePermission(event, "entries:write");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Get entry ID from route params
  const entryId = getRouterParam(event, "id");

  if (!entryId) {
    throw createError(
      apiError(event, "INVALID_ID", "Entry ID is required", 400),
    );
  }

  try {
    // Delete entry (soft delete)
    const deleted = await deleteEntry(entryId, userId);

    if (!deleted) {
      throw createError(
        apiError(event, "ENTRY_NOT_FOUND", "Entry not found", 404),
      );
    }

    // Trigger webhooks for entry.deleted event (fire and forget)
    triggerWebhooks(userId, "entry.deleted", {
      id: entryId,
    }).catch((error) => {
      console.error("Error triggering webhooks:", error);
    });

    // Return success response
    return success(event, { id: entryId }, { deleted: true });
  } catch (error) {
    // Re-throw if already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Error deleting entry:", error);
    throw createError(
      apiError(
        event,
        "DELETE_ENTRY_FAILED",
        "Failed to delete entry",
        500,
      ),
    );
  }
});
