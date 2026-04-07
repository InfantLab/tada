/**
 * POST /api/ourmoji/experiments/{experimentId}/resume
 *
 * Phase 1 stub. Implementation arrives in Phase 4 (T038).
 */

import { defineEventHandler, createError } from "h3";

export default defineEventHandler(async () => {
  throw createError({
    statusCode: 501,
    statusMessage: "Experiment resume not yet implemented (T038)",
  });
});
