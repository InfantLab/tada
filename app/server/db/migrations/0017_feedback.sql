-- Migration: Feedback Storage (v0.4.0)
-- Adds database storage for user feedback, bug reports, and feature requests

-- ============================================================================
-- Feedback table
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Feedback type and content
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_behavior TEXT,

  -- Contact info (optional)
  email TEXT,

  -- System context (JSON, with user consent)
  system_info TEXT,

  -- Status tracking (for cloud mode support management)
  status TEXT NOT NULL DEFAULT 'new',
  internal_notes TEXT,
  resolved_at TEXT,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
