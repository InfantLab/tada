/**
 * GET /api/v1/rhythms
 *
 * List all rhythms with streak data and statistics
 *
 * User Story 1: OpenClaw Daily Summary
 */

import { requirePermission } from "~/server/utils/permissions";
import { success, apiError } from "~/server/utils/response";
import { getRhythmsWithStats } from "~/server/services/rhythms";

export default defineEventHandler(async (event) => {
  // Require rhythms:read permission
  requirePermission(event, "rhythms:read");

  const auth = event.context.auth;
  const userId = auth.userId;

  try {
    // Get rhythms with calculated stats
    const rhythms = await getRhythmsWithStats(userId);

    // Return success response
    return success(event, rhythms);
  } catch (error) {
    console.error("Error fetching rhythms:", error);
    throw createError(
      apiError(
        event,
        "FETCH_RHYTHMS_FAILED",
        "Failed to fetch rhythms",
        500,
      ),
    );
  }
});
