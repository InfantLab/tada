-- Rate Limits table for persistent SQLite-backed rate limiting
-- Replaces in-memory Map that reset on server restart

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL
);

-- Index for cleanup of expired windows
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits(window_end);
