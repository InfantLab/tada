/**
 * POST /api/ourmoji/experiments
 *
 * Create a new Ourmoji experiment run. Requires authentication and the
 * Ourmoji feature flag. Enforces one-active-run-per-participant.
 */

import { defineEventHandler, readBody, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { createExperiment } from "~/server/services/ourmoji/experiments";
import { parseOrThrow } from "~/server/services/ourmoji/validation";
import { createExperimentSchema } from "./schemas";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError(unauthorized(event));

  if (!(await isOurmojiEnabledForUser(user.id))) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const body = await readBody(event);
  const payload = parseOrThrow(
    createExperimentSchema,
    body,
    "experiment payload",
  );

  const result = await createExperiment({
    name: payload.name,
    startDate: payload.startDate,
    endDate: payload.endDate,
    participantUserIds: payload.participantUserIds,
    roleWeights: payload.roleWeights,
    randomizationSeed: payload.randomizationSeed,
    createdBy: user.id,
  });

  return { run: result.run, participantIds: result.participantIds };
});
