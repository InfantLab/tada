/**
 * Ourmoji nightly assignment scheduler plugin.
 *
 * On startup runs one catch-up sweep, then sweeps every 15 minutes.
 *
 * Sweep algorithm:
 *   1. Reconcile run lifecycle state (`scheduled -> active`,
 *      `active|paused -> completed`) based on each run's local date.
 *   2. Load all `active` runs.
 *   3. For each, compute today's "night date" in the run's earliest
 *      participant timezone, and the 21:00 anchor in UTC.
 *   4. If the anchor has passed (or we're catching up after downtime),
 *      generate assignments for tonight via the assignments service —
 *      this is idempotent at the DB level.
 *   5. Dispatch notifications for each freshly-inserted assignment.
 *
 * Failures are logged but never thrown — the timer keeps ticking.
 */

import { ourmojiSchedulerLogger as logger } from "~/server/services/ourmoji/logger";
import {
  listExperimentRunsByStatus,
  getParticipantsForRun,
  updateExperimentRunStatus,
} from "~/server/services/ourmoji/repository";
import { generateAssignmentsForNight } from "~/server/services/ourmoji/assignments";
import { dispatchAssignmentNotification } from "~/server/services/ourmoji/notifications";
import {
  computeNextAnchorUtc,
  localDateInTimezone,
  nightDateForAnchor,
} from "~/server/services/ourmoji/schedule";

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function reconcileRunStatuses(now: Date): Promise<void> {
  const scheduledRuns = await listExperimentRunsByStatus(["scheduled"]);
  for (const run of scheduledRuns) {
    const localToday = localDateInTimezone(
      now,
      run.earliestParticipantTimezone || "UTC",
    );

    if (run.endDate < localToday) {
      await updateExperimentRunStatus(run.id, "completed");
      logger.info("Completed expired scheduled run", {
        runId: run.id,
        localToday,
      });
      continue;
    }

    if (run.startDate <= localToday) {
      await updateExperimentRunStatus(run.id, "active");
      logger.info("Activated scheduled run", {
        runId: run.id,
        localToday,
      });
    }
  }

  const liveRuns = await listExperimentRunsByStatus(["active", "paused"]);
  for (const run of liveRuns) {
    const localToday = localDateInTimezone(
      now,
      run.earliestParticipantTimezone || "UTC",
    );
    if (run.endDate < localToday) {
      await updateExperimentRunStatus(run.id, "completed");
      logger.info("Completed finished run", {
        runId: run.id,
        previousStatus: run.status,
        localToday,
      });
    }
  }
}

async function sweep(): Promise<void> {
  const now = new Date();
  await reconcileRunStatuses(now);

  const runs = await listExperimentRunsByStatus(["active"]);
  if (runs.length === 0) {
    logger.debug("Sweep tick — no active runs");
    return;
  }

  for (const run of runs) {
    try {
      // Today's anchor (or tomorrow's, if today's hasn't passed yet).
      const nextAnchor = computeNextAnchorUtc(run, now);
      // We only generate when the anchor has already passed; if it's
      // still in the future, the corresponding "today" anchor was
      // generated on a previous tick (or never existed if the run was
      // just activated). Compute the most recent past anchor by
      // subtracting one day from the next-anchor when needed.
      const pastAnchor =
        nextAnchor.getTime() <= now.getTime()
          ? nextAnchor
          : new Date(nextAnchor.getTime() - 24 * 60 * 60 * 1000);

      if (pastAnchor.getTime() > now.getTime()) {
        // Run was activated very recently, no past anchor yet.
        continue;
      }

      const nightDate = nightDateForAnchor(
        pastAnchor,
        run.earliestParticipantTimezone,
      );

      const { inserted } = await generateAssignmentsForNight(run, nightDate);
      if (inserted.length === 0) continue;

      const participants = await getParticipantsForRun(run.id);
      const userIdByParticipant = new Map(
        participants.map((p) => [p.id, p.userId]),
      );

      for (const assignment of inserted) {
        const recipientUserId = userIdByParticipant.get(assignment.participantId);
        if (!recipientUserId) continue;
        await dispatchAssignmentNotification({
          assignment,
          recipientUserId,
        });
      }

      logger.info("Swept run", {
        runId: run.id,
        nightDate,
        inserted: inserted.length,
      });
    } catch (err) {
      logger.error("Sweep failed for run", err as Error, { runId: run.id });
    }
  }
}

export default defineNitroPlugin(async () => {
  // Skip during static prerender — the scheduler is a runtime background task
  // and has no business querying the DB or arming a setInterval during build.
  if (import.meta.prerender) return;

  logger.info("Ourmoji scheduler plugin starting");

  try {
    await sweep();
  } catch (err) {
    logger.error("Ourmoji startup sweep failed", err as Error);
  }

  const timer = setInterval(() => {
    sweep().catch((err) => {
      logger.error("Ourmoji periodic sweep failed", err as Error);
    });
  }, SWEEP_INTERVAL_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
});
