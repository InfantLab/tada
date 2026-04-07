/**
 * POST /api/ourmoji/experiments/{experimentId}/assignments/trigger
 *
 * Manually generate the night's assignments for a single run. Used by
 * tests and ops; the scheduler sweep covers production. Idempotent —
 * a second call for the same night returns the existing rows without
 * creating duplicates.
 */

import { defineEventHandler, getRouterParam, readBody, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { generateAssignmentsForNight } from "~/server/services/ourmoji/assignments";
import { dispatchAssignmentNotification } from "~/server/services/ourmoji/notifications";
import { getExperimentRunById, getParticipantsForRun } from "~/server/services/ourmoji/repository";
import { nightDateForAnchor } from "~/server/services/ourmoji/schedule";
import { notFound } from "~/server/services/ourmoji/validation";

interface TriggerBody {
  /** YYYY-MM-DD; defaults to today in the run's earliest tz. */
  nightDate?: string;
  /** Skip notification dispatch (useful for tests). */
  skipDispatch?: boolean;
}

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

  const run = await getExperimentRunById(id);
  if (!run) notFound("Experiment run");

  const body = ((await readBody(event)) ?? {}) as TriggerBody;
  const nightDate =
    body.nightDate ??
    nightDateForAnchor(new Date(), run!.earliestParticipantTimezone);

  const result = await generateAssignmentsForNight(run!, nightDate);

  let dispatched = 0;
  if (!body.skipDispatch) {
    const participants = await getParticipantsForRun(run!.id);
    const userIdByParticipant = new Map(
      participants.map((p) => [p.id, p.userId]),
    );
    for (const assignment of result.inserted) {
      const recipientUserId = userIdByParticipant.get(assignment.participantId);
      if (!recipientUserId) continue;
      const ok = await dispatchAssignmentNotification({
        assignment,
        recipientUserId,
      });
      if (ok) dispatched++;
    }
  }

  return {
    nightDate,
    assignments: result.assignments.length,
    inserted: result.inserted.length,
    dispatched,
  };
});
