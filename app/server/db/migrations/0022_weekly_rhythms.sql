-- Weekly Rhythms: Encouragement & Celebration (v0.6.0)
-- Tables: weekly_rhythm_settings, weekly_stats_snapshots, weekly_messages, weekly_delivery_attempts

CREATE TABLE IF NOT EXISTS weekly_rhythm_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  celebration_enabled INTEGER NOT NULL DEFAULT 0,
  encouragement_enabled INTEGER NOT NULL DEFAULT 0,

  celebration_tier TEXT NOT NULL DEFAULT 'stats_only',

  delivery_channels TEXT NOT NULL, -- JSON
  generation_schedule TEXT NOT NULL, -- JSON

  onboarding_completed_at TEXT,
  cloud_privacy_acknowledged_at TEXT,
  private_ai_unavailable_dismissed_at TEXT,

  email_unsubscribed_at TEXT,
  email_unsubscribe_source TEXT,
  consecutive_email_failures INTEGER NOT NULL DEFAULT 0,
  last_email_failure_at TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS weekly_stats_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  kind TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  week_end_date TEXT NOT NULL,
  timezone TEXT NOT NULL,

  period_range TEXT NOT NULL, -- JSON
  general_progress TEXT NOT NULL, -- JSON
  rhythm_wins TEXT NOT NULL, -- JSON
  encouragement_context TEXT, -- JSON (nullable, only for encouragement kind)

  generated_at TEXT NOT NULL
);

-- Idempotency: one snapshot per user/kind/week
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_snapshots_user_kind_week
  ON weekly_stats_snapshots(user_id, kind, week_start_date);

-- Scheduler catch-up and history queries
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_kind_generated
  ON weekly_stats_snapshots(kind, generated_at);

CREATE TABLE IF NOT EXISTS weekly_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_id TEXT NOT NULL REFERENCES weekly_stats_snapshots(id) ON DELETE CASCADE,

  kind TEXT NOT NULL,
  week_start_date TEXT NOT NULL,

  tier_requested TEXT NOT NULL,
  tier_applied TEXT NOT NULL,
  fallback_reason TEXT,

  status TEXT NOT NULL DEFAULT 'generated',

  title TEXT NOT NULL,
  summary_blocks TEXT NOT NULL, -- JSON
  narrative_text TEXT,
  email_subject TEXT,
  email_html TEXT,
  email_text TEXT,

  in_app_visible_from TEXT NOT NULL,
  scheduled_delivery_at TEXT,
  delivered_at TEXT,
  dismissed_at TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One message per user/kind/week
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_messages_user_kind_week
  ON weekly_messages(user_id, kind, week_start_date);

-- Due-send scanning
CREATE INDEX IF NOT EXISTS idx_weekly_messages_status_scheduled
  ON weekly_messages(status, scheduled_delivery_at);

CREATE TABLE IF NOT EXISTS weekly_delivery_attempts (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES weekly_messages(id) ON DELETE CASCADE,

  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,

  scheduled_for TEXT NOT NULL,
  attempted_at TEXT,
  retry_after TEXT,

  provider TEXT,
  provider_message_id TEXT,
  failure_code TEXT,
  failure_message TEXT,
  raw_response TEXT, -- JSON

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Look up attempts by message
CREATE INDEX IF NOT EXISTS idx_weekly_delivery_message
  ON weekly_delivery_attempts(message_id);

-- Find retryable attempts
CREATE INDEX IF NOT EXISTS idx_weekly_delivery_retry
  ON weekly_delivery_attempts(status, retry_after);
