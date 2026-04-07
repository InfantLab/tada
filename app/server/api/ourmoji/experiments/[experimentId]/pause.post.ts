/**
 * POST /api/ourmoji/experiments/{experimentId}/pause
 *
 * Phase 1 stub. Implementation arrives in Phase 4 (T037).
 */

import { defineEventHandler, createError } from "h3";

export default defineEventHandler(async () => {
  throw createError({
    statusCode: 501,
    statusMessage: "Experiment pause not yet implemented (T037)",
  });
});
