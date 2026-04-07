/**
 * Ourmoji repository — thin DB access helpers around Drizzle ORM.
 *
 * Phase 2 foundation: only the queries needed by services in later phases.
 * Each helper is intentionally small and side-effect free so it can be
 * composed inside transactions or batched in the scheduler sweep.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "~/server/db";
import {
  ourmojiExperimentParticipants,
  ourmojiExperimentRuns,
  ourmojiNightAssignments,
  ourmojiNotificationDeliveries,
  ourmojiSubmissions,
  type NewOurmojiExperimentParticipant,
  type NewOurmojiExperimentRun,
  type NewOurmojiNightAssignment,
  type NewOurmojiNotificationDelivery,
  type NewOurmojiSubmission,
  type OurmojiExperimentRun,
  type OurmojiExperimentStatus,
  type OurmojiNightAssignment,
  type OurmojiSubmission,
} from "~/server/db/schema";

// ---------------------------------------------------------------------------
// Experiment runs
// ---------------------------------------------------------------------------

export async function insertExperimentRun(
  row: NewOurmojiExperimentRun,
): Promise<OurmojiExperimentRun> {
  const [created] = await db
    .insert(ourmojiExperimentRuns)
    .values(row)
    .returning();
  return created!;
}

export async function getExperimentRunById(
  id: string,
): Promise<OurmojiExperimentRun | undefined> {
  const rows = await db
    .select()
    .from(ourmojiExperimentRuns)
    .where(eq(ourmojiExperimentRuns.id, id))
    .limit(1);
  return rows[0];
}

export async function listExperimentRunsByStatus(
  statuses: OurmojiExperimentStatus[],
): Promise<OurmojiExperimentRun[]> {
  if (statuses.length === 0) return [];
  return db
    .select()
    .from(ourmojiExperimentRuns)
    .where(inArray(ourmojiExperimentRuns.status, statuses));
}

export async function updateExperimentRunStatus(
  id: string,
  status: OurmojiExperimentStatus,
): Promise<void> {
  await db
    .update(ourmojiExperimentRuns)
    .set({ status, updatedAt: sql`(datetime('now'))` })
    .where(eq(ourmojiExperimentRuns.id, id));
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export async function insertParticipants(
  rows: NewOurmojiExperimentParticipant[],
) {
  if (rows.length === 0) return [];
  return db.insert(ourmojiExperimentParticipants).values(rows).returning();
}

export async function getParticipantsForRun(experimentRunId: string) {
  return db
    .select()
    .from(ourmojiExperimentParticipants)
    .where(eq(ourmojiExperimentParticipants.experimentRunId, experimentRunId));
}

export async function findActiveParticipationForUser(userId: string) {
  return db
    .select({
      participant: ourmojiExperimentParticipants,
      run: ourmojiExperimentRuns,
    })
    .from(ourmojiExperimentParticipants)
    .innerJoin(
      ourmojiExperimentRuns,
      eq(
        ourmojiExperimentParticipants.experimentRunId,
        ourmojiExperimentRuns.id,
      ),
    )
    .where(
      and(
        eq(ourmojiExperimentParticipants.userId, userId),
        inArray(ourmojiExperimentRuns.status, ["scheduled", "active", "paused"]),
      ),
    );
}

// ---------------------------------------------------------------------------
// Night assignments
// ---------------------------------------------------------------------------

export async function insertNightAssignmentsIfMissing(
  rows: NewOurmojiNightAssignment[],
): Promise<OurmojiNightAssignment[]> {
  if (rows.length === 0) return [];
  // Idempotency relies on the unique index
  // (experiment_run_id, night_date, participant_id).
  return db
    .insert(ourmojiNightAssignments)
    .values(rows)
    .onConflictDoNothing()
    .returning();
}

export async function getAssignmentById(
  id: string,
): Promise<OurmojiNightAssignment | undefined> {
  const rows = await db
    .select()
    .from(ourmojiNightAssignments)
    .where(eq(ourmojiNightAssignments.id, id))
    .limit(1);
  return rows[0];
}

export async function getAssignmentsForRunNight(
  experimentRunId: string,
  nightDate: string,
) {
  return db
    .select()
    .from(ourmojiNightAssignments)
    .where(
      and(
        eq(ourmojiNightAssignments.experimentRunId, experimentRunId),
        eq(ourmojiNightAssignments.nightDate, nightDate),
      ),
    );
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export async function upsertSubmission(
  row: NewOurmojiSubmission,
): Promise<OurmojiSubmission> {
  const [created] = await db
    .insert(ourmojiSubmissions)
    .values(row)
    .onConflictDoUpdate({
      target: ourmojiSubmissions.assignmentId,
      set: {
        dreamText: row.dreamText ?? sql`dream_text`,
        guessEmoji: row.guessEmoji ?? sql`guess_emoji`,
        guessConfidence: row.guessConfidence ?? sql`guess_confidence`,
        submissionState: row.submissionState ?? sql`submission_state`,
        isHit: row.isHit ?? sql`is_hit`,
        revealedAt: row.revealedAt ?? sql`revealed_at`,
        dreamLockedAt: row.dreamLockedAt ?? sql`dream_locked_at`,
        guessLockedAt: row.guessLockedAt ?? sql`guess_locked_at`,
        updatedAt: sql`(datetime('now'))`,
      },
    })
    .returning();
  return created!;
}

export async function getSubmissionByAssignment(
  assignmentId: string,
): Promise<OurmojiSubmission | undefined> {
  const rows = await db
    .select()
    .from(ourmojiSubmissions)
    .where(eq(ourmojiSubmissions.assignmentId, assignmentId))
    .limit(1);
  return rows[0];
}

// ---------------------------------------------------------------------------
// Notification deliveries
// ---------------------------------------------------------------------------

export async function insertDelivery(row: NewOurmojiNotificationDelivery) {
  const [created] = await db
    .insert(ourmojiNotificationDeliveries)
    .values(row)
    .returning();
  return created!;
}
