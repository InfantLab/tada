/**
 * Weekly Rhythms scheduler plugin.
 *
 * Bootstraps the scheduler sweep on server startup and sets up a periodic
 * interval to process due generation and delivery work.
 * Auto-creates tables if they don't exist yet.
 */

import { createLogger } from "~/server/utils/logger";
import { sql } from "drizzle-orm";
import { db } from "~/server/db";

const logger = createLogger("plugin:weekly-rhythms");

const SWEEP_INTERVAL_MS = 60 * 1000; // 1 minute

/** Ensure weekly-rhythms tables exist (safe for repeated calls) */
async function ensureTables(): Promise<boolean> {
  try {
    const result = await db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name='weekly_rhythm_settings'`,
    );
    if (result.length > 0) return true;

    // Tables missing — create them
    logger.info("Creating weekly-rhythms tables");
    const ddl = [
      sql`CREATE TABLE IF NOT EXISTS weekly_rhythm_settings (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        celebration_enabled INTEGER NOT NULL DEFAULT 0, encouragement_enabled INTEGER NOT NULL DEFAULT 0,
        celebration_tier TEXT NOT NULL DEFAULT 'stats_only', delivery_channels TEXT NOT NULL,
        generation_schedule TEXT NOT NULL, onboarding_completed_at TEXT, cloud_privacy_acknowledged_at TEXT,
        private_ai_unavailable_dismissed_at TEXT, email_unsubscribed_at TEXT, email_unsubscribe_source TEXT,
        consecutive_email_failures INTEGER NOT NULL DEFAULT 0, last_email_failure_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      sql`CREATE TABLE IF NOT EXISTS weekly_stats_snapshots (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL, week_start_date TEXT NOT NULL, week_end_date TEXT NOT NULL, timezone TEXT NOT NULL,
        period_range TEXT NOT NULL, general_progress TEXT NOT NULL, rhythm_wins TEXT NOT NULL,
        encouragement_context TEXT, generated_at TEXT NOT NULL
      )`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_snapshots_user_kind_week ON weekly_stats_snapshots(user_id, kind, week_start_date)`,
      sql`CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_kind_generated ON weekly_stats_snapshots(kind, generated_at)`,
      sql`CREATE TABLE IF NOT EXISTS weekly_messages (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        snapshot_id TEXT NOT NULL REFERENCES weekly_stats_snapshots(id) ON DELETE CASCADE,
        kind TEXT NOT NULL, week_start_date TEXT NOT NULL, tier_requested TEXT NOT NULL, tier_applied TEXT NOT NULL,
        fallback_reason TEXT, status TEXT NOT NULL DEFAULT 'generated', title TEXT NOT NULL,
        summary_blocks TEXT NOT NULL, narrative_text TEXT, email_subject TEXT, email_html TEXT, email_text TEXT,
        in_app_visible_from TEXT NOT NULL, scheduled_delivery_at TEXT, delivered_at TEXT, dismissed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_messages_user_kind_week ON weekly_messages(user_id, kind, week_start_date)`,
      sql`CREATE INDEX IF NOT EXISTS idx_weekly_messages_status_scheduled ON weekly_messages(status, scheduled_delivery_at)`,
      sql`CREATE TABLE IF NOT EXISTS weekly_delivery_attempts (
        id TEXT PRIMARY KEY, message_id TEXT NOT NULL REFERENCES weekly_messages(id) ON DELETE CASCADE,
        channel TEXT NOT NULL, status TEXT NOT NULL, attempt_number INTEGER NOT NULL,
        scheduled_for TEXT NOT NULL, attempted_at TEXT, retry_after TEXT, provider TEXT,
        provider_message_id TEXT, failure_code TEXT, failure_message TEXT, raw_response TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      sql`CREATE INDEX IF NOT EXISTS idx_weekly_delivery_message ON weekly_delivery_attempts(message_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_weekly_delivery_retry ON weekly_delivery_attempts(status, retry_after)`,
    ];
    for (const stmt of ddl) {
      await db.run(stmt);
    }
    logger.info("Weekly-rhythms tables created");
    return true;
  } catch (err) {
    logger.error("Failed to ensure weekly-rhythms tables", err as Error);
    return false;
  }
}

export default defineNitroPlugin((nitroApp) => {
  logger.info("Weekly rhythms plugin initializing");

  let sweepTimer: ReturnType<typeof setInterval> | null = null;

  // Delay first sweep to let the server fully start
  const startupDelay = setTimeout(async () => {
    // Ensure tables exist before first sweep
    const tablesReady = await ensureTables();
    if (!tablesReady) {
      logger.warn("Weekly rhythms tables not available, skipping scheduler");
      return;
    }

    try {
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
