/**
 * POST /api/ourmoji/experiments
 *
 * Phase 1 stub. Implementation arrives in Phase 4 (T035).
 */

import { defineEventHandler, readBody, createError } from "h3";
import { createExperimentSchema } from "./schemas";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = createExperimentSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid experiment payload",
      data: parsed.error.flatten(),
    });
  }
  throw createError({
    statusCode: 501,
    statusMessage: "Experiment creation not yet implemented (T035)",
  });
});
