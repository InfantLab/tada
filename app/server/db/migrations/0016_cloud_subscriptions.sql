-- Migration: Cloud Subscriptions (v0.4.0)
-- Adds subscription support for tada.living cloud platform
-- See design/commercial.md for full documentation

-- ============================================================================
-- Add subscription fields to users table (idempotent - may already exist from 0015)
-- ============================================================================

-- These ALTER TABLEs may fail with "duplicate column" if 0015 already ran.
-- migrate.js handles this gracefully.
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN subscription_expires_at TEXT;

-- ============================================================================
-- Subscription Events - Audit log for billing activities
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe ON subscription_events(stripe_event_id);

-- ============================================================================
-- Email Verification Tokens - For cloud mode email verification
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);

-- ============================================================================
-- Index for Stripe customer lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
