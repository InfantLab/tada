/**
 * POST /api/ourmoji/experiments/{experimentId}/pause
 *
 * Transition an active experiment run to `paused`. Idempotent against
 * the scheduler — assignment idempotency is handled at the DB level.
 */

import { defineEventHandler, getRouterParam, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { pauseExperiment } from "~/server/services/ourmoji/experiments";

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

  await pauseExperiment(id);
  return { ok: true, status: "paused" };
});
