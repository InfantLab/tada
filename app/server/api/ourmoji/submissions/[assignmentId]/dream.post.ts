/**
 * POST /api/ourmoji/submissions/{assignmentId}/dream
 *
 * Lock the user's dream text against an assignment. Idempotent on the
 * dream_locked state.
 */

import { defineEventHandler, getRouterParam, readBody, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { submitDream } from "~/server/services/ourmoji/submissions";
import {
  enforceTextLength,
  parseOrThrow,
} from "~/server/services/ourmoji/validation";
import { dreamSubmissionSchema } from "../../schemas";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError(unauthorized(event));

  if (!(await isOurmojiEnabledForUser(user.id))) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const assignmentId = getRouterParam(event, "assignmentId");
  if (!assignmentId) {
    throw createError({ statusCode: 400, statusMessage: "assignmentId required" });
  }

  const body = await readBody(event);
  const payload = parseOrThrow(
    dreamSubmissionSchema,
    body,
    "dream submission",
  );
  const dreamText = enforceTextLength(payload.dreamText, "dreamText");

  const submission = await submitDream({
    assignmentId,
    userId: user.id,
    dreamText,
    capturedVia: payload.capturedVia,
  });

  return { submission };
});
