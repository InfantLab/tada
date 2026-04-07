/**
 * Ourmoji morning prompt service (US3, T061).
 *
 * Returns the receiver's "open assignment" for an experiment run, if
 * any — i.e. tonight's assignment row in `receiver` (or control-night
 * receiver) role whose submission is not yet `complete`. Used by the
 * morning banner to deep-link the user into the dream → guess flow.
 *
 * Blinding: the response NEVER includes target_emoji or condition.
 */

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "~/server/db";
import {
  ourmojiExperimentParticipants,
  ourmojiNightAssignments,
  ourmojiSubmissions,
  type OurmojiSubmissionState,
} from "~/server/db/schema";
import type { OurmojiMorningPromptDTO } from "~/types/ourmoji";

/**
 * Find the most recent open assignment for `userId` in `experimentRunId`.
 * Returns null if there's nothing to act on (no row, or already complete).
 */
export async function getMorningPrompt(
  experimentRunId: string,
  userId: string,
): Promise<OurmojiMorningPromptDTO | null> {
  // Resolve participant.
  const participantRows = await db
    .select()
    .from(ourmojiExperimentParticipants)
    .where(
      and(
        eq(ourmojiExperimentParticipants.experimentRunId, experimentRunId),
        eq(ourmojiExperimentParticipants.userId, userId),
      ),
    )
    .limit(1);
  const participant = participantRows[0];
  if (!participant) return null;

  // Most-recent assignment in a role that requires action.
  const assignmentRows = await db
    .select()
    .from(ourmojiNightAssignments)
    .where(
      and(
        eq(ourmojiNightAssignments.experimentRunId, experimentRunId),
        eq(ourmojiNightAssignments.participantId, participant.id),
        inArray(ourmojiNightAssignments.role, ["receiver", "control"]),
      ),
    )
    .orderBy(desc(ourmojiNightAssignments.nightDate))
    .limit(1);
  const assignment = assignmentRows[0];
  if (!assignment) return null;

  // Submission state (if any).
  const submissionRows = await db
    .select()
    .from(ourmojiSubmissions)
    .where(eq(ourmojiSubmissions.assignmentId, assignment.id))
    .limit(1);
  const submission = submissionRows[0];
  const state: OurmojiSubmissionState = submission?.submissionState ?? "none";

  if (state === "complete") return null;

  return {
    assignmentId: assignment.id,
    experimentRunId,
    nightDate: assignment.nightDate,
    state,
    hasDream: !!submission?.dreamText,
    hasGuess: !!submission?.guessEmoji,
  };
}
