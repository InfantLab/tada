/**
 * POST /api/ourmoji/submissions/{assignmentId}/guess
 *
 * Phase 1 stub. Implementation arrives in Phase 7 (T065).
 */

import { defineEventHandler, readBody, createError } from "h3";
import { guessSubmissionSchema } from "../../schemas";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = guessSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid guess submission",
      data: parsed.error.flatten(),
    });
  }
  throw createError({
    statusCode: 501,
    statusMessage: "Guess submission not yet implemented (T065)",
  });
});
