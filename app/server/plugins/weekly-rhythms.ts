/**
 * Weekly Rhythms scheduler plugin.
 *
 * Bootstraps the scheduler sweep on server startup and sets up a periodic
 * interval to process due generation and delivery work.
 */

import { createLogger } from "~/server/utils/logger";

const logger = createLogger("plugin:weekly-rhythms");

const SWEEP_INTERVAL_MS = 60 * 1000; // 1 minute

export default defineNitroPlugin((nitroApp) => {
  logger.info("Weekly rhythms plugin initializing");

  let sweepTimer: ReturnType<typeof setInterval> | null = null;

  // Delay first sweep to let the server fully start
  const startupDelay = setTimeout(async () => {
    try {
      // Dynamic import to avoid circular dependency at plugin load time
      const { runSchedulerSweep } = await import(
        "~/server/services/weekly-rhythms/scheduler"
      );
      await runSchedulerSweep();
      logger.info("Initial weekly rhythms sweep complete");
    } catch (err) {
      logger.error("Initial weekly rhythms sweep failed", err as Error);
    }

    // Set up periodic sweep
    sweepTimer = setInterval(async () => {
      try {
        const { runSchedulerSweep } = await import(
          "~/server/services/weekly-rhythms/scheduler"
        );
        await runSchedulerSweep();
      } catch (err) {
        logger.error("Periodic weekly rhythms sweep failed", err as Error);
      }
    }, SWEEP_INTERVAL_MS);
  }, 5000); // 5s startup delay

  // Cleanup on shutdown
  nitroApp.hooks.hook("close", () => {
    logger.info("Weekly rhythms plugin shutting down");
    clearTimeout(startupDelay);
    if (sweepTimer) {
      clearInterval(sweepTimer);
    }
  });
});
