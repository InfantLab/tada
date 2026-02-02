/**
 * Cloud Mode Detection Utilities
 *
 * Determines whether the app is running in cloud mode (tada.living)
 * vs self-hosted mode. Cloud mode enables:
 * - Email verification requirement
 * - Usage limits (1-year retention for free tier)
 * - Stripe billing integration
 * - Subscription tier UI
 *
 * @see design/commercial.md for full architecture
 */

/**
 * Check if the app is running in cloud mode.
 *
 * Cloud mode is enabled when:
 * - TADA_CLOUD_MODE=true explicitly, OR
 * - Stripe secret key is configured (implies cloud deployment)
 */
export function isCloudMode(): boolean {
  return (
    process.env["TADA_CLOUD_MODE"] === "true" ||
    !!process.env["STRIPE_SECRET_KEY"]
  );
}

/**
 * Check if Stripe billing is enabled.
 *
 * Billing requires the Stripe secret key to be configured.
 * This can be true even in self-hosted mode if the user
 * wants to accept payments.
 */
export function isBillingEnabled(): boolean {
  return !!process.env["STRIPE_SECRET_KEY"];
}

/**
 * Check if email verification is required.
 *
 * Email verification is required when:
 * - Running in cloud mode (always), OR
 * - TADA_REQUIRE_EMAIL_VERIFICATION=true explicitly
 *
 * Self-hosted deployments default to optional verification.
 */
export function isEmailVerificationRequired(): boolean {
  return (
    isCloudMode() ||
    process.env["TADA_REQUIRE_EMAIL_VERIFICATION"] === "true"
  );
}

/**
 * Get the email verification grace period in days.
 *
 * Users can use the app for this many days before
 * email verification is enforced.
 */
export function getVerificationGracePeriodDays(): number {
  const envValue = process.env["TADA_VERIFICATION_GRACE_DAYS"];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 7; // Default: 7 days
}

/**
 * Get the data retention period for free tier in days.
 *
 * Free tier users can access entries from this rolling window.
 * Entries outside this window are "archived" (hidden but not deleted).
 */
export function getFreeRetentionDays(): number {
  const envValue = process.env["TADA_FREE_RETENTION_DAYS"];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 365; // Default: 1 year
}

/**
 * Subscription tier type
 */
export type SubscriptionTier = "free" | "premium";

/**
 * Subscription status type
 */
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "expired";
