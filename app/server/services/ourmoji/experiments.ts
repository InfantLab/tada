/**
 * Ourmoji experiment run lifecycle service.
 *
 * Handles create, list, pause, resume, and (implicitly) complete
 * transitions. Pause/resume only flip status — they do NOT touch
 * already-generated assignment rows. The scheduler's idempotency
 * guarantee means resume is safe.
 */

import { nanoid } from "nanoid";

import {
  getExperimentRunById,
  insertExperimentRun,
  insertParticipants,
  listExperimentRunsByStatus,
  updateExperimentRunStatus,
} from "./repository";
import {
  assertNoActiveParticipation,
  anonymousLabelForIndex,
} from "./participants";
import { forbidden, notFound } from "./validation";
import { DEFAULT_ROLE_WEIGHTS } from "~/utils/ourmoji/constants";
import type {
  NewOurmojiExperimentParticipant,
  NewOurmojiExperimentRun,
  OurmojiExperimentRun,
  OurmojiExperimentStatus,
} from "~/server/db/schema";

export interface CreateExperimentInput {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  participantUserIds: string[];
  participantTimezones?: Record<string, string>;
  roleWeights?: { send: number; control: number; rest: number };
  randomizationSeed?: string;
  createdBy: string;
}

export interface CreateExperimentResult {
  run: OurmojiExperimentRun;
  participantIds: string[];
}

export async function createExperiment(
  input: CreateExperimentInput,
): Promise<CreateExperimentResult> {
  if (input.startDate > input.endDate) {
    forbidden("startDate must be on or before endDate");
  }
  if (input.participantUserIds.length === 0) {
    forbidden("at least one participant is required");
  }

  // Cross-run exclusivity guard.
  await assertNoActiveParticipation(input.participantUserIds);

  // Earliest participant timezone — caller may not yet know all of these
  // (e.g. when creating a run from an admin UI). Fall back to UTC.
  const tzs = Object.values(input.participantTimezones ?? {});
  const earliestParticipantTimezone = tzs[0] ?? "UTC";

  const newRun: NewOurmojiExperimentRun = {
    id: nanoid(),
    name: input.name,
    status: "scheduled",
    startDate: input.startDate,
    endDate: input.endDate,
    earliestParticipantTimezone,
    roleWeights: input.roleWeights ?? { ...DEFAULT_ROLE_WEIGHTS },
    randomizationSeed: input.randomizationSeed ?? nanoid(),
    createdBy: input.createdBy,
  };

  const run = await insertExperimentRun(newRun);

  const participantRows: NewOurmojiExperimentParticipant[] =
    input.participantUserIds.map((userId, index) => ({
      id: nanoid(),
      experimentRunId: run.id,
      userId,
      anonymousLabel: anonymousLabelForIndex(index),
      timezoneAtJoin: input.participantTimezones?.[userId] ?? "UTC",
    }));

  const participants = await insertParticipants(participantRows);
  return { run, participantIds: participants.map((p) => p.id) };
}

export async function listExperiments(): Promise<OurmojiExperimentRun[]> {
  return listExperimentRunsByStatus(["scheduled", "active", "paused", "completed"]);
}

export async function pauseExperiment(id: string): Promise<void> {
  const run = await getExperimentRunById(id);
  if (!run) notFound("Experiment run");
  if (run.status !== "active") {
    forbidden(`Cannot pause an experiment in status "${run.status}"`);
  }
  await updateExperimentRunStatus(id, "paused");
}

export async function resumeExperiment(id: string): Promise<void> {
  const run = await getExperimentRunById(id);
  if (!run) notFound("Experiment run");
  if (run.status !== "paused") {
    forbidden(`Cannot resume an experiment in status "${run.status}"`);
  }
  await updateExperimentRunStatus(id, "active");
}

export async function transitionStatus(
  id: string,
  next: OurmojiExperimentStatus,
): Promise<void> {
  await updateExperimentRunStatus(id, next);
}
