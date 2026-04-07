/**
 * GET /api/ourmoji/experiments
 *
 * Phase 1 stub. Implementation arrives in Phase 4 (T036).
 */

import { defineEventHandler, createError } from "h3";

export default defineEventHandler(async () => {
  throw createError({
    statusCode: 501,
    statusMessage: "Experiment list not yet implemented (T036)",
  });
});
