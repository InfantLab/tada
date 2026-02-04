-- Newsletter Subscribers table for email list signups
-- v0.4.0: Cloud platform marketing support

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'blog',
  verified_at TEXT,
  unsubscribed_at TEXT,
  unsubscribe_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);

-- Index for active subscriber queries
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);
