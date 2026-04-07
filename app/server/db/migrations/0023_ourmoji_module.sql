-- Ourmoji module (013-ourmoji-module)
-- Adds:
--   * `enabled_modules` column on user_preferences (per-user feature flags)
--   * Five Ourmoji experiment tables for run lifecycle, nightly assignment,
--     morning submission flow, and notification delivery audit.
--
-- Daily Ourmoji entries themselves live in the existing `entries` table
-- (type = 'ourmoji'), so no additional table is needed for that slice.

-- ---------------------------------------------------------------------------
-- 1) Per-user feature flag column
-- ---------------------------------------------------------------------------
ALTER TABLE user_preferences
  ADD COLUMN enabled_modules TEXT DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 2) Experiment runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ourmoji_experiment_runs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  earliest_participant_timezone TEXT NOT NULL,
  role_weights TEXT NOT NULL,
  randomization_seed TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ourmoji_runs_status ON ourmoji_experiment_runs(status);
CREATE INDEX IF NOT EXISTS idx_ourmoji_runs_dates ON ourmoji_experiment_runs(start_date, end_date);

-- ---------------------------------------------------------------------------
-- 3) Experiment participants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ourmoji_experiment_participants (
  id TEXT PRIMARY KEY,
  experiment_run_id TEXT NOT NULL REFERENCES ourmoji_experiment_runs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anonymous_label TEXT NOT NULL,
  timezone_at_join TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  left_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ourmoji_participants_run_user
  ON ourmoji_experiment_participants(experiment_run_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ourmoji_participants_user
  ON ourmoji_experiment_participants(user_id);

-- ---------------------------------------------------------------------------
-- 4) Nightly assignments (immutable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ourmoji_night_assignments (
  id TEXT PRIMARY KEY,
  experiment_run_id TEXT NOT NULL REFERENCES ourmoji_experiment_runs(id) ON DELETE CASCADE,
  night_date TEXT NOT NULL,
  participant_id TEXT NOT NULL REFERENCES ourmoji_experiment_participants(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  target_emoji TEXT,
  condition TEXT NOT NULL,
  assignment_seed TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ourmoji_assign_run_night_participant
  ON ourmoji_night_assignments(experiment_run_id, night_date, participant_id);
CREATE INDEX IF NOT EXISTS idx_ourmoji_assign_night
  ON ourmoji_night_assignments(night_date);

-- ---------------------------------------------------------------------------
-- 5) Morning submissions (dream + guess + reveal)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ourmoji_submissions (
  id TEXT PRIMARY KEY,
  experiment_run_id TEXT NOT NULL REFERENCES ourmoji_experiment_runs(id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL UNIQUE REFERENCES ourmoji_night_assignments(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES ourmoji_experiment_participants(id) ON DELETE CASCADE,
  dream_text TEXT,
  guess_emoji TEXT,
  guess_confidence INTEGER,
  submission_state TEXT NOT NULL DEFAULT 'none',
  is_hit INTEGER,
  revealed_at TEXT,
  dream_locked_at TEXT,
  guess_locked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ourmoji_submissions_state
  ON ourmoji_submissions(submission_state);
CREATE INDEX IF NOT EXISTS idx_ourmoji_submissions_run
  ON ourmoji_submissions(experiment_run_id);

-- ---------------------------------------------------------------------------
-- 6) Notification delivery audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ourmoji_notification_deliveries (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES ourmoji_night_assignments(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempt_number INTEGER NOT NULL DEFAULT 1,
  scheduled_for TEXT NOT NULL,
  attempted_at TEXT,
  failure_code TEXT,
  failure_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ourmoji_deliveries_assignment
  ON ourmoji_notification_deliveries(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ourmoji_deliveries_status
  ON ourmoji_notification_deliveries(status, scheduled_for);
