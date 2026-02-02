-- Migration: Cloud Subscriptions (v0.4.0)
-- Adds subscription support for tada.living cloud platform
-- See design/commercial.md for full documentation

-- ============================================================================
-- Add subscription fields to users table
-- ============================================================================

-- Subscription tier: 'free' (default) or 'premium'
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';

-- Subscription status: 'active', 'past_due', 'cancelled', 'expired'
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'active';

-- Stripe customer ID for billing integration
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

-- When the current subscription period expires (ISO 8601)
ALTER TABLE users ADD COLUMN subscription_expires_at TEXT;

-- ============================================================================
-- Subscription Events - Audit log for billing activities
-- ============================================================================

CREATE TABLE subscription_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'created', 'renewed', 'upgraded', 'cancelled', 'expired', 'payment_failed', 'payment_succeeded'
  stripe_event_id TEXT,      -- Stripe event ID for deduplication
  data TEXT,                 -- JSON blob with event details
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX idx_subscription_events_stripe ON subscription_events(stripe_event_id);

-- ============================================================================
-- Email Verification Tokens - For cloud mode email verification
-- ============================================================================
-- Follows the same pattern as password_reset_tokens

CREATE TABLE email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,   -- SHA-256 hash of the token (never store plaintext)
  expires_at TEXT NOT NULL,   -- ISO 8601 - 24 hours from creation
  used_at TEXT,               -- When token was used (null if unused)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_email_verification_tokens_user ON email_verification_tokens(user_id);

-- ============================================================================
-- Index for Stripe customer lookups
-- ============================================================================

CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
