/**
 * GET /api/v1/entries/[id]
 *
 * Get a single entry by ID
 *
 * User Story 1: OpenClaw Daily Summary
 */

import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, notFound } from "~/server/utils/response";
import { getEntryById } from "~/server/services/entries";
import { computeContentHash } from "~/server/utils/contentHash";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:v1:entries:get");

export default defineEventHandler(async (event) => {
  // Require entries:read permission
  requirePermission(event, "entries:read");

  const auth = event.context['auth']!;
  const userId = auth.userId;

  // Get entry ID from route params
  const entryId = getRouterParam(event, "id");

  if (!entryId) {
    throw createError(
      apiError(event, "INVALID_ID", "Entry ID is required", 400),
    );
  }

  try {
    // Get entry from service
    const entry = await getEntryById(entryId, userId);

    if (!entry) {
      throw createError(notFound(event, "Entry"));
    }

    // Return success response with contentHash for sync
    return success(event, {
      ...entry,
      contentHash: computeContentHash(entry),
    });
  } catch (error) {
    // Re-throw if already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    logger.error("Error fetching entry", error instanceof Error ? error : new Error(String(error)), { userId: event.context.user?.id, requestId: event.context.requestId });
    throw createError(
      apiError(
        event,
        "FETCH_ENTRY_FAILED",
        "Failed to fetch entry",
        500,
      ),
    );
  }
});
