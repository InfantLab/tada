/**
 * GET /api/ourmoji/experiments/{experimentId}/stats
 *
 * Phase 1 stub. Implementation arrives in Phase 8 (T077).
 * Active runs: redacted progress only. Completed runs: full analytics.
 */

import { defineEventHandler, createError } from "h3";

export default defineEventHandler(async () => {
  throw createError({
    statusCode: 501,
    statusMessage: "Experiment stats not yet implemented (T077)",
  });
});
