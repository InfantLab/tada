/**
 * POST /api/ourmoji/experiments/{experimentId}/assignments/trigger
 *
 * Phase 1 stub. Implementation arrives in Phase 5 (T049).
 */

import { defineEventHandler, createError } from "h3";

export default defineEventHandler(async () => {
  throw createError({
    statusCode: 501,
    statusMessage: "Manual assignment trigger not yet implemented (T049)",
  });
});
