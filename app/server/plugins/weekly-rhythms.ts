/**
 * Weekly Rhythms scheduler plugin.
 *
 * On startup: ensures tables exist, migrates new columns, runs one sweep
 * to catch anything missed during downtime. Then sweeps every 15 minutes.
 * Uses pre-computed UTC due time columns for efficient queries.
 */

import { createLogger } from "~/server/utils/logger";
import { sql } from "drizzle-orm";
import { db } from "~/server/db";
import { weeklyRhythmSettings } from "~/server/db/schema";
import { withRetry } from "~/server/db/operations";
import { refreshNextDueTimes } from "~/server/services/weekly-rhythms/settings";

const logger = createLogger("plugin:weekly-rhythms");

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/** Ensure weekly-rhythms tables exist (safe for repeated calls) */
async function ensureTables(): Promise<boolean> {
  try {
    const result = await db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name='weekly_rhythm_settings'`,
    );
    if (result.length > 0) return true;

    logger.info("Creating weekly-rhythms tables");
    const ddl = [
      sql`CREATE TABLE IF NOT EXISTS weekly_rhythm_settings (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        celebration_enabled INTEGER NOT NULL DEFAULT 0, encouragement_enabled INTEGER NOT NULL DEFAULT 0,
        celebration_tier TEXT NOT NULL DEFAULT 'stats_only', delivery_channels TEXT NOT NULL,
        generation_schedule TEXT NOT NULL, onboarding_completed_at TEXT, cloud_privacy_acknowledged_at TEXT,
        private_ai_unavailable_dismissed_at TEXT, email_unsubscribed_at TEXT, email_unsubscribe_source TEXT,
        consecutive_email_failures INTEGER NOT NULL DEFAULT 0, last_email_failure_at TEXT,
        next_celebration_due_utc TEXT, next_encouragement_due_utc TEXT,
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
      sql`CREATE TABLE IF NOT EXISTS system_messages (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        snapshot_id TEXT NOT NULL REFERENCES weekly_stats_snapshots(id) ON DELETE CASCADE,
        kind TEXT NOT NULL, week_start_date TEXT NOT NULL, tier_requested TEXT NOT NULL, tier_applied TEXT NOT NULL,
        fallback_reason TEXT, status TEXT NOT NULL DEFAULT 'generated', title TEXT NOT NULL,
        summary_blocks TEXT NOT NULL, narrative_text TEXT, email_subject TEXT, email_html TEXT, email_text TEXT,
        in_app_visible_from TEXT NOT NULL, scheduled_delivery_at TEXT, delivered_at TEXT, dismissed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_system_messages_user_kind_week ON system_messages(user_id, kind, week_start_date)`,
      sql`CREATE INDEX IF NOT EXISTS idx_system_messages_status_scheduled ON system_messages(status, scheduled_delivery_at)`,
      sql`CREATE TABLE IF NOT EXISTS system_message_deliveries (
        id TEXT PRIMARY KEY, message_id TEXT NOT NULL REFERENCES system_messages(id) ON DELETE CASCADE,
        channel TEXT NOT NULL, status TEXT NOT NULL, attempt_number INTEGER NOT NULL,
        scheduled_for TEXT NOT NULL, attempted_at TEXT, retry_after TEXT, provider TEXT,
        provider_message_id TEXT, failure_code TEXT, failure_message TEXT, raw_response TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      sql`CREATE INDEX IF NOT EXISTS idx_system_message_deliveries_message ON system_message_deliveries(message_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_system_message_deliveries_retry ON system_message_deliveries(status, retry_after)`,
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

/** Add next_*_due_utc columns if they don't exist (migration for existing installs) */
async function migrateNextDueColumns(): Promise<void> {
  try {
    const cols = await db.all<{ name: string }>(
      sql`PRAGMA table_info(weekly_rhythm_settings)`,
    );
    const colNames = new Set(cols.map((c) => c.name));

    if (!colNames.has("next_celebration_due_utc")) {
      await db.run(
        sql`ALTER TABLE weekly_rhythm_settings ADD COLUMN next_celebration_due_utc TEXT`,
      );
      logger.info("Added next_celebration_due_utc column");
    }
    if (!colNames.has("next_encouragement_due_utc")) {
      await db.run(
        sql`ALTER TABLE weekly_rhythm_settings ADD COLUMN next_encouragement_due_utc TEXT`,
      );
      logger.info("Added next_encouragement_due_utc column");
    }
  } catch (err) {
    logger.error("Failed to migrate next_due columns", err as Error);
  }
}

/** Backfill pre-computed due times for users that don't have them yet */
async function backfillDueTimes(): Promise<void> {
  const needsBackfill = await withRetry(() =>
    db
      .select({ userId: weeklyRhythmSettings.userId })
      .from(weeklyRhythmSettings)
      .where(
        sql`(celebration_enabled = 1 AND next_celebration_due_utc IS NULL)
            OR (encouragement_enabled = 1 AND next_encouragement_due_utc IS NULL)`,
      ),
  );

  if (needsBackfill.length === 0) return;

  logger.info(`Backfilling due times for ${needsBackfill.length} user(s)`);
  for (const { userId } of needsBackfill) {
    try {
      await refreshNextDueTimes(userId);
    } catch (err) {
      logger.error("Failed to backfill due times for user", err as Error, { userId });
    }
  }
}

export default defineNitroPlugin((nitroApp) => {
  logger.info("Weekly rhythms plugin initializing");

  let sweepTimer: ReturnType<typeof setInterval> | null = null;

  const startupDelay = setTimeout(async () => {
    const tablesReady = await ensureTables();
    if (!tablesReady) {
      logger.warn("Weekly rhythms tables not available, skipping scheduler");
      return;
    }

    // Migrate and backfill for existing installs
    await migrateNextDueColumns();
    await backfillDueTimes();

    // Run one immediate sweep to catch anything missed during downtime
    try {
      const { runSchedulerSweep } = await import(
        "~/server/services/weekly-rhythms/scheduler"
      );
      await runSchedulerSweep();
      logger.info("Startup sweep complete");
    } catch (err) {
      logger.error("Startup sweep failed", err as Error);
    }

    // Periodic sweep every 15 minutes
    sweepTimer = setInterval(async () => {
      try {
        const { runSchedulerSweep } = await import(
          "~/server/services/weekly-rhythms/scheduler"
        );
        await runSchedulerSweep();
      } catch (err) {
        logger.error("Periodic sweep failed", err as Error);
      }
    }, SWEEP_INTERVAL_MS);

    logger.info("Scheduler running (15-minute interval)");
  }, 5000);

  nitroApp.hooks.hook("close", () => {
    logger.info("Weekly rhythms plugin shutting down");
    clearTimeout(startupDelay);
    if (sweepTimer) {
      clearInterval(sweepTimer);
    }
  });
});
