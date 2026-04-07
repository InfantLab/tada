/**
 * POST /api/ourmoji/submissions/{assignmentId}/guess
 *
 * Lock the user's guess and reveal the result. The reveal payload
 * exposes the target emoji ONLY when the night was a send condition.
 */

import { defineEventHandler, getRouterParam, readBody, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { submitGuess } from "~/server/services/ourmoji/submissions";
import { parseOrThrow } from "~/server/services/ourmoji/validation";
import { isSacredSetEmoji } from "~/utils/ourmoji/sacredSet";
import { guessSubmissionSchema } from "../../schemas";

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
    guessSubmissionSchema,
    body,
    "guess submission",
  );
  if (!isSacredSetEmoji(payload.guessEmoji)) {
    throw createError({
      statusCode: 400,
      statusMessage: "guessEmoji must be a member of the Sacred Set",
    });
  }

  const reveal = await submitGuess({
    assignmentId,
    userId: user.id,
    guessEmoji: payload.guessEmoji,
    guessConfidence: payload.guessConfidence,
  });

  return reveal;
});
