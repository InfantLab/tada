/**
 * Nightly assignment generation for Ourmoji experiment runs (US2).
 *
 * Idempotent: relies on the unique
 * (experiment_run_id, night_date, participant_id) index. A repeat call
 * for the same night is a no-op (returns existing rows).
 *
 * Determinism: uses the run's `randomizationSeed` keyed by night index
 * (days since startDate), so the same run + night always produces the
 * same role assignment, even after a server restart.
 */

import { nanoid } from "nanoid";

import {
  getAssignmentsForRunNight,
  getParticipantsForRun,
  insertNightAssignmentsIfMissing,
} from "./repository";
import { nightIndexForRun } from "./schedule";
import {
  assignRolesForNight,
  pickCondition,
  pickTargetEmoji,
} from "./randomization";
import { ourmojiChildLogger } from "./logger";
import type {
  NewOurmojiNightAssignment,
  OurmojiExperimentRun,
  OurmojiNightAssignment,
} from "~/server/db/schema";

const logger = ourmojiChildLogger("service:assignments");

export interface GenerateAssignmentsResult {
  /** All assignment rows for the night (existing + newly created). */
  assignments: OurmojiNightAssignment[];
  /** Subset that were inserted by this call (zero on a re-run). */
  inserted: OurmojiNightAssignment[];
}

/**
 * Generate (or return existing) assignments for a single night of a run.
 */
export async function generateAssignmentsForNight(
  run: OurmojiExperimentRun,
  nightDate: string,
): Promise<GenerateAssignmentsResult> {
  const participants = await getParticipantsForRun(run.id);
  if (participants.length === 0) {
    logger.warn("No participants for run, skipping", { runId: run.id });
    return { assignments: [], inserted: [] };
  }

  const nightIndex = nightIndexForRun(run.startDate, nightDate);
  if (nightIndex < 0) {
    logger.warn("Night date is before run start, skipping", {
      runId: run.id,
      nightDate,
      startDate: run.startDate,
    });
    return { assignments: [], inserted: [] };
  }

  // Deterministically choose tonight's condition for the run.
  const condition = pickCondition(
    run.randomizationSeed,
    nightIndex,
    run.roleWeights,
  );

  const target =
    condition === "send" ? pickTargetEmoji(run.randomizationSeed, nightIndex) : null;

  const participantIds = participants.map((p) => p.id);
  const roleMap = assignRolesForNight(
    run.randomizationSeed,
    nightIndex,
    condition,
    participantIds,
  );

  const rows: NewOurmojiNightAssignment[] = participants.map((p) => ({
    id: nanoid(),
    experimentRunId: run.id,
    nightDate,
    participantId: p.id,
    role: roleMap.get(p.id)!,
    targetEmoji: target?.emoji ?? null,
    condition,
    assignmentSeed: `${run.randomizationSeed}:${nightIndex}`,
  }));

  const inserted = await insertNightAssignmentsIfMissing(rows);
  // The unique index quietly drops dupes; fetch the canonical set so
  // callers see what's actually persisted for this night.
  const assignments = await getAssignmentsForRunNight(run.id, nightDate);

  if (inserted.length > 0) {
    logger.info("Generated nightly assignments", {
      runId: run.id,
      nightDate,
      condition,
      inserted: inserted.length,
    });
  } else {
    logger.debug("Assignments already present, no-op", {
      runId: run.id,
      nightDate,
    });
  }

  return { assignments, inserted };
}
