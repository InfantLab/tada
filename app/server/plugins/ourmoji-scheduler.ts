/**
 * Ourmoji nightly assignment scheduler plugin.
 *
 * Phase 2 shell — wires up the periodic sweep timer and a startup
 * catch-up tick. The actual sweep body (assignment generation +
 * notification dispatch) is implemented in T050 (Phase 5).
 *
 * Pattern mirrors `app/server/plugins/weekly-rhythms.ts`:
 *   - sweep on startup (catch missed assignments after downtime)
 *   - then sweep on a fixed interval (15 minutes)
 *
 * The sweep MUST be idempotent: it relies on the unique index on
 * (experiment_run_id, night_date, participant_id) to prevent duplicate
 * assignment rows.
 */

import { ourmojiSchedulerLogger as logger } from "~/server/services/ourmoji/logger";

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Phase 2 sweep stub. Phase 5 (T050) replaces this with:
 *   1. Load runs in `active` status whose next-assignment due time
 *      (21:00 in earliest participant timezone) has passed.
 *   2. For each due night, deterministically generate one assignment
 *      row per participant via `randomization.ts`.
 *   3. Insert with `onConflictDoNothing` to enforce idempotency.
 *   4. Hand off the resulting assignments to the notification dispatcher.
 */
async function sweep(): Promise<void> {
  logger.debug("ourmoji scheduler sweep tick (stub — implementation in T050)");
}

export default defineNitroPlugin(async () => {
  logger.info("Ourmoji scheduler plugin starting (Phase 2 shell)");

  // Startup catch-up sweep — best-effort, never crashes the server.
  try {
    await sweep();
  } catch (err) {
    logger.error("Ourmoji startup sweep failed", err as Error);
  }

  // Periodic sweep timer.
  const timer = setInterval(() => {
    sweep().catch((err) => {
      logger.error("Ourmoji periodic sweep failed", err as Error);
    });
  }, SWEEP_INTERVAL_MS);

  // Allow the process to exit cleanly during dev hot-reload / tests.
  if (typeof timer.unref === "function") {
    timer.unref();
  }
});
