/**
 * POST /api/ourmoji/submissions/{assignmentId}/dream
 *
 * Phase 1 stub. Implementation arrives in Phase 7 (T064).
 */

import { defineEventHandler, readBody, createError } from "h3";
import { dreamSubmissionSchema } from "../../schemas";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = dreamSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid dream submission",
      data: parsed.error.flatten(),
    });
  }
  throw createError({
    statusCode: 501,
    statusMessage: "Dream submission not yet implemented (T064)",
  });
});
