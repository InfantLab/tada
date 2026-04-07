/**
 * GET /api/ourmoji/experiments
 *
 * List Ourmoji experiment runs visible to the authenticated user.
 * Phase 4 returns all runs (no per-user scoping yet) — refinement to
 * "runs the user participates in" can land in Phase 5/8 alongside the
 * stats endpoint where participant scoping is more meaningful.
 */

import { defineEventHandler, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { listExperiments } from "~/server/services/ourmoji/experiments";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError(unauthorized(event));

  if (!(await isOurmojiEnabledForUser(user.id))) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const runs = await listExperiments();
  return { runs };
});
