/**
 * Ourmoji submission lifecycle (US3, T062-T063).
 *
 * State machine:
 *   none -> dream_locked   on dream submission
 *   dream_locked -> complete  on guess submission
 *
 * No reverse transitions, no edits after locking. Locking writes
 * `dream_locked_at` / `guess_locked_at` timestamps for audit and to
 * support interruption-safe resume on the client.
 */

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "~/server/db";
import {
  ourmojiExperimentParticipants,
  ourmojiNightAssignments,
  ourmojiSubmissions,
  type OurmojiSubmission,
} from "~/server/db/schema";
import { upsertSubmission, getSubmissionByAssignment } from "./repository";
import { forbidden, notFound } from "./validation";
import { ourmojiChildLogger } from "./logger";

const logger = ourmojiChildLogger("service:submissions");

export interface SubmitDreamInput {
  assignmentId: string;
  userId: string; // requester — must own the assignment
  dreamText: string;
  capturedVia: "voice" | "text";
}

export interface SubmitGuessInput {
  assignmentId: string;
  userId: string;
  guessEmoji: string;
  guessConfidence: number;
}

export interface RevealResult {
  submission: OurmojiSubmission;
  /** Hit only meaningful on send-condition nights. */
  isHit: boolean | null;
  /** Target emoji is only revealed once the guess is locked. */
  targetEmoji: string | null;
  condition: "send" | "control" | "rest";
}

/**
 * Lock the user's dream text against an assignment. Idempotent on the
 * dream_locked state — re-submitting the same dream is a no-op.
 * Once `submission_state = complete`, dream cannot be re-submitted.
 */
export async function submitDream(
  input: SubmitDreamInput,
): Promise<OurmojiSubmission> {
  const { assignment, participant } = await loadAssignmentForUser(
    input.assignmentId,
    input.userId,
  );

  const existing = await getSubmissionByAssignment(assignment.id);
  if (existing?.submissionState === "complete") {
    forbidden("Cannot edit dream after guess has been locked");
  }
  if (existing?.submissionState === "dream_locked") {
    // Idempotent — return as-is.
    return existing;
  }

  const now = new Date().toISOString();
  const row = await upsertSubmission({
    id: existing?.id ?? nanoid(),
    experimentRunId: assignment.experimentRunId,
    assignmentId: assignment.id,
    participantId: participant.id,
    dreamText: input.dreamText,
    submissionState: "dream_locked",
    dreamLockedAt: now,
  });
  logger.info("Dream locked", { assignmentId: assignment.id });
  return row;
}

/**
 * Lock the user's guess and compute hit/miss + reveal state.
 * Requires the dream to already be locked (`dream_locked` state).
 * Idempotent — second call against `complete` returns the existing row.
 */
export async function submitGuess(
  input: SubmitGuessInput,
): Promise<RevealResult> {
  const { assignment, participant } = await loadAssignmentForUser(
    input.assignmentId,
    input.userId,
  );

  const existing = await getSubmissionByAssignment(assignment.id);
  if (!existing || existing.submissionState === "none") {
    forbidden("Dream must be submitted before guess");
  }

  if (existing.submissionState === "complete") {
    return buildRevealResult(existing, assignment);
  }

  // Compute hit/miss only on send nights — control/rest are not graded.
  const isHit =
    assignment.condition === "send"
      ? assignment.targetEmoji === input.guessEmoji
      : null;

  const now = new Date().toISOString();
  const row = await upsertSubmission({
    id: existing.id,
    experimentRunId: assignment.experimentRunId,
    assignmentId: assignment.id,
    participantId: participant.id,
    guessEmoji: input.guessEmoji,
    guessConfidence: input.guessConfidence,
    submissionState: "complete",
    isHit,
    revealedAt: now,
    guessLockedAt: now,
  });

  logger.info("Guess locked + revealed", {
    assignmentId: assignment.id,
    isHit,
    condition: assignment.condition,
  });

  return buildRevealResult(row, assignment);
}

function buildRevealResult(
  submission: OurmojiSubmission,
  assignment: { condition: "send" | "control" | "rest"; targetEmoji: string | null },
): RevealResult {
  return {
    submission,
    isHit: submission.isHit ?? null,
    // Reveal target only when complete and only on send nights.
    targetEmoji:
      submission.submissionState === "complete" && assignment.condition === "send"
        ? assignment.targetEmoji
        : null,
    condition: assignment.condition,
  };
}

async function loadAssignmentForUser(assignmentId: string, userId: string) {
  const assignmentRows = await db
    .select()
    .from(ourmojiNightAssignments)
    .where(eq(ourmojiNightAssignments.id, assignmentId))
    .limit(1);
  const assignment = assignmentRows[0];
  if (!assignment) notFound("Assignment");

  const participantRows = await db
    .select()
    .from(ourmojiExperimentParticipants)
    .where(eq(ourmojiExperimentParticipants.id, assignment!.participantId))
    .limit(1);
  const participant = participantRows[0];
  if (!participant) notFound("Participant");
  if (participant!.userId !== userId) {
    forbidden("Cannot submit against an assignment you do not own");
  }
  return { assignment: assignment!, participant: participant! };
}

/** Return the row currently locked against `assignmentId`, if any. */
export async function getSubmission(
  assignmentId: string,
): Promise<OurmojiSubmission | null> {
  const rows = await db
    .select()
    .from(ourmojiSubmissions)
    .where(eq(ourmojiSubmissions.assignmentId, assignmentId))
    .limit(1);
  return rows[0] ?? null;
}
