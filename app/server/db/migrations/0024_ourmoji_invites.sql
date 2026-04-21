-- Ourmoji invites (pairing flow)
-- A pending invite from one ourmoji user to another. On accept, the invite
-- transitions to 'accepted' and run_id points at the experiment run created
-- via the existing createExperiment service.

CREATE TABLE IF NOT EXISTS ourmoji_invites (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  run_id TEXT REFERENCES ourmoji_experiment_runs(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  responded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ourmoji_invites_to_status
  ON ourmoji_invites(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_ourmoji_invites_from_status
  ON ourmoji_invites(from_user_id, status);
