/**
 * GET /api/ourmoji/experiments/{experimentId}/morning-prompt
 *
 * Phase 1 stub. Implementation arrives in Phase 7 (T061).
 */

import { defineEventHandler, createError } from "h3";

export default defineEventHandler(async () => {
  throw createError({
    statusCode: 501,
    statusMessage: "Morning prompt not yet implemented (T061)",
  });
});
