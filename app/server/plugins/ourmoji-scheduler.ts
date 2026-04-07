/**
 * Ourmoji nightly assignment scheduler plugin.
 *
 * On startup runs one catch-up sweep, then sweeps every 15 minutes.
 *
 * Sweep algorithm:
 *   1. Load all `active` runs.
 *   2. For each, compute today's "night date" in the run's earliest
 *      participant timezone, and the 21:00 anchor in UTC.
 *   3. If the anchor has passed (or we're catching up after downtime),
 *      generate assignments for tonight via the assignments service —
 *      this is idempotent at the DB level.
 *   4. Dispatch notifications for each freshly-inserted assignment.
 *
 * Failures are logged but never thrown — the timer keeps ticking.
 */

import { ourmojiSchedulerLogger as logger } from "~/server/services/ourmoji/logger";
import { listExperimentRunsByStatus, getParticipantsForRun } from "~/server/services/ourmoji/repository";
import { generateAssignmentsForNight } from "~/server/services/ourmoji/assignments";
import { dispatchAssignmentNotification } from "~/server/services/ourmoji/notifications";
import {
  computeNextAnchorUtc,
  nightDateForAnchor,
} from "~/server/services/ourmoji/schedule";

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function sweep(): Promise<void> {
  const now = new Date();
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
