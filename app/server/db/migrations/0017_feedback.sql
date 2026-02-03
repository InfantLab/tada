-- Migration: Feedback Storage (v0.4.0)
-- Adds database storage for user feedback, bug reports, and feature requests
-- Replaces console.log-based feedback handling with persistent storage

-- ============================================================================
-- Feedback table
-- ============================================================================

CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,  -- Optional - anonymous allowed

  -- Feedback type and content
  type TEXT NOT NULL,                  -- 'bug', 'feedback', 'question'
  description TEXT NOT NULL,           -- Main feedback content
  expected_behavior TEXT,              -- For bug reports: what should have happened

  -- Contact info (optional)
  email TEXT,                          -- For follow-up (if user provided)

  -- System context (JSON, with user consent)
  system_info TEXT,                    -- JSON: userAgent, platform, language, screenSize, appVersion, timestamp

  -- Status tracking (for cloud mode support management)
  status TEXT NOT NULL DEFAULT 'new',  -- 'new', 'reviewed', 'in_progress', 'resolved', 'closed'
  internal_notes TEXT,                 -- Admin notes (never shown to user)
  resolved_at TEXT,                    -- When feedback was resolved

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for efficient querying
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created ON feedback(created_at);
