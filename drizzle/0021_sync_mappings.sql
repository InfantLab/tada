-- Sync Mappings: per-provider external ID tracking for sync (v0.5.0)

CREATE TABLE sync_mappings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  external_hash TEXT,
  internal_hash TEXT,
  last_synced_at TEXT NOT NULL,
  last_sync_direction TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One mapping per provider per entry
CREATE UNIQUE INDEX idx_sync_mappings_provider_entry
  ON sync_mappings(provider, entry_id);

-- Look up by external ID (for pull phase)
CREATE UNIQUE INDEX idx_sync_mappings_provider_external
  ON sync_mappings(provider, external_id, user_id);

-- List all mappings for a user+provider
CREATE INDEX idx_sync_mappings_user_provider
  ON sync_mappings(user_id, provider);

-- Efficient updated_since queries on entries
CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at);
CREATE INDEX IF NOT EXISTS idx_entries_deleted_at ON entries(deleted_at);
