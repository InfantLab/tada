/**
 * Usage Limits Utilities
 *
 * Implements the data retention policy for cloud mode:
 * - Free tier: 1-year rolling window
 * - Premium tier: Unlimited access
 * - Self-hosted: Unlimited (no limits enforced)
 *
 * Entries outside the retention window are "archived":
 * - Not deleted, just hidden from UI
 * - Shown with upgrade prompt
 * - Always included in exports
 * - Restored immediately on upgrade
 *
 * @see design/commercial.md for full architecture
 */

import type { User } from "~/server/db/schema";
import { isCloudMode, getFreeRetentionDays } from "./cloudMode";

/**
 * Date range for visible entries
 */
export interface VisibleDateRange {
  /** Start of visible range (inclusive) */
  from: Date;
  /** End of visible range (inclusive) */
  to: Date;
}

/**
 * Get the date range for entries visible to a user.
 *
 * - Self-hosted: All time (from epoch to now)
 * - Cloud premium: All time
 * - Cloud free: Rolling window based on retention period
 */
export function getVisibleDateRange(user: User): VisibleDateRange {
  const now = new Date();

  // Self-hosted mode or premium tier: no restrictions
  if (!isCloudMode() || user.subscriptionTier === "premium") {
    return {
      from: new Date(0), // Unix epoch
      to: now,
    };
  }

  // Free tier in cloud mode: rolling window
  const retentionDays = getFreeRetentionDays();
  const from = new Date(now);
  from.setDate(from.getDate() - retentionDays);

  return { from, to: now };
}

/**
 * Check if an entry is visible based on its timestamp and the user's subscription.
 */
export function isEntryVisible(entryTimestamp: string | Date, user: User): boolean {
  const range = getVisibleDateRange(user);
  const entryDate = typeof entryTimestamp === "string"
    ? new Date(entryTimestamp)
    : entryTimestamp;

  return entryDate >= range.from && entryDate <= range.to;
}

/**
 * Get the SQL WHERE clause for filtering visible entries.
 *
 * Returns a filter condition for the entries.timestamp field.
 * Returns null if no filtering is needed.
 */
export function getVisibleDateFilter(user: User): { from: string } | null {
  // No filter needed for self-hosted or premium
  if (!isCloudMode() || user.subscriptionTier === "premium") {
    return null;
  }

  const range = getVisibleDateRange(user);
  return { from: range.from.toISOString() };
}

/**
 * Get the count of archived (hidden) entries for a user.
 *
 * @param user - The user to check
 * @param totalEntries - Total number of entries for the user
 * @param visibleEntries - Number of entries within visible range
 */
export function getArchivedEntryCount(
  user: User,
  totalEntries: number,
  visibleEntries: number
): number {
  // No archived entries for self-hosted or premium
  if (!isCloudMode() || user.subscriptionTier === "premium") {
    return 0;
  }

  return Math.max(0, totalEntries - visibleEntries);
}

/**
 * Get a user-friendly retention warning message.
 *
 * Returns null if no warning is needed.
 */
export function getRetentionWarning(
  user: User,
  oldestVisibleDate: Date | null
): string | null {
  // No warnings for self-hosted or premium
  if (!isCloudMode() || user.subscriptionTier === "premium") {
    return null;
  }

  const retentionDays = getFreeRetentionDays();
  const monthsRetention = Math.floor(retentionDays / 30);

  if (!oldestVisibleDate) {
    return null;
  }

  // Calculate how close they are to the retention limit
  const now = new Date();
  const daysSinceOldest = Math.floor(
    (now.getTime() - oldestVisibleDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // If they have entries approaching the limit (within 30 days of cutoff)
  const daysUntilArchive = retentionDays - daysSinceOldest;

  if (daysUntilArchive <= 0) {
    // At or past limit
    return `Entries older than ${monthsRetention} months are archived. Upgrade anytime to restore access.`;
  } else if (daysUntilArchive <= 30) {
    // Approaching limit
    const monthsUntil = Math.ceil(daysUntilArchive / 30);
    const timeUnit = monthsUntil === 1 ? "month" : "months";
    return `You have ${monthsUntil} ${timeUnit} until older entries are archived. Upgrade to keep your full history.`;
  }

  return null;
}

/**
 * Check if a user can access premium features.
 */
export function hasPremiumAccess(user: User): boolean {
  // Self-hosted always has full access
  if (!isCloudMode()) {
    return true;
  }

  return user.subscriptionTier === "premium" && user.subscriptionStatus === "active";
}

/**
 * Check if a user's subscription is in a grace period (past_due but not expired).
 */
export function isInGracePeriod(user: User): boolean {
  if (!isCloudMode()) {
    return false;
  }

  return user.subscriptionStatus === "past_due";
}
