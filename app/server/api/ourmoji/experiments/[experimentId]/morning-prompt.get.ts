/**
 * GET /api/ourmoji/experiments/{experimentId}/morning-prompt
 *
 * Returns the receiver's open assignment for the run, if any. Used by
 * the client banner. Blinded — never reveals target or condition.
 */

import { defineEventHandler, getRouterParam, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { getMorningPrompt } from "~/server/services/ourmoji/morningPrompt";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError(unauthorized(event));

  if (!(await isOurmojiEnabledForUser(user.id))) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const id = getRouterParam(event, "experimentId");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "experimentId required" });
  }

  const prompt = await getMorningPrompt(id, user.id);
  return { prompt };
});
