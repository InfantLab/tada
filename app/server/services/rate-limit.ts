/**
 * Rate Limiting Service
 *
 * Implements SQLite-backed persistent rate limiting.
 * Uses fixed-window algorithm stored in the database so limits
 * survive server restarts.
 */

import type { RateLimitInfo } from "~/types/api";
import { db } from "~/server/db";
import { rateLimits } from "~/server/db/schema";
import { eq, lt } from "drizzle-orm";

// Rate limit configurations (requests per minute)
const RATE_LIMITS = {
  standard: 100, // Standard API endpoints
  export: 10, // Export endpoints (more expensive)
  pattern: 5, // Pattern detection (very expensive)
  webhook: 20, // Webhook endpoints
  admin: 100, // Admin endpoints
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

// Window duration in milliseconds
const WINDOW_DURATION = 60 * 1000; // 1 minute

// Cleanup expired entries periodically (not every call)
let lastCleanup = 0;
const CLEANUP_INTERVAL = 60 * 1000; // Run cleanup at most once per minute

function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  // Fire and forget — don't block the request
  db.delete(rateLimits).where(lt(rateLimits.windowEnd, now)).run();
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier Unique identifier for the client (user ID or API key ID)
 * @param type Type of rate limit to apply
 * @returns RateLimitInfo with limit status
 */
export function checkRateLimit(
  identifier: string,
  type: RateLimitType = "standard",
): { allowed: boolean; info: RateLimitInfo } {
  const limit = RATE_LIMITS[type];
  const now = Date.now();
  const cacheKey = `${identifier}:${type}`;

  // Periodically clean up expired entries
  maybeCleanup();

  // Look up current window
  const existing = db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, cacheKey))
    .get();

  // Guard against corrupt data — treat non-finite values as expired
  if (
    existing &&
    (!Number.isFinite(existing.windowEnd) ||
      !Number.isFinite(existing.windowStart) ||
      !Number.isFinite(existing.count))
  ) {
    db.delete(rateLimits).where(eq(rateLimits.key, cacheKey)).run();
  }

  if (!existing || !Number.isFinite(existing.windowEnd) || existing.windowEnd <= now) {
    // No entry or window has expired — start a new window
    const windowEnd = now + WINDOW_DURATION;

    db.insert(rateLimits)
      .values({ key: cacheKey, count: 1, windowStart: now, windowEnd })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: 1, windowStart: now, windowEnd },
      })
      .run();

    return {
      allowed: true,
      info: {
        limit,
        remaining: limit - 1,
        reset: Math.floor(windowEnd / 1000),
      },
    };
  }

  // Window is still active — increment count
  const newCount = existing.count + 1;

  db.update(rateLimits)
    .set({ count: newCount })
    .where(eq(rateLimits.key, cacheKey))
    .run();

  const allowed = newCount <= limit;
  const remaining = Math.max(0, limit - newCount);
  const resetTime = Math.floor(existing.windowEnd / 1000);

  const retryAfter = allowed
    ? undefined
    : Math.ceil((existing.windowEnd - now) / 1000);

  return {
    allowed,
    info: {
      limit,
      remaining,
      reset: resetTime,
      retryAfter,
    },
  };
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or manual override
 *
 * @param identifier Unique identifier for the client
 * @param type Type of rate limit to reset (optional, resets all if not specified)
 */
export function resetRateLimit(
  identifier: string,
  type?: RateLimitType,
): void {
  if (type) {
    const cacheKey = `${identifier}:${type}`;
    db.delete(rateLimits).where(eq(rateLimits.key, cacheKey)).run();
  } else {
    for (const limitType of Object.keys(RATE_LIMITS)) {
      const cacheKey = `${identifier}:${limitType}`;
      db.delete(rateLimits).where(eq(rateLimits.key, cacheKey)).run();
    }
  }
}

/**
 * Get current rate limit status without incrementing
 *
 * @param identifier Unique identifier for the client
 * @param type Type of rate limit to check
 * @returns RateLimitInfo with current status
 */
export function getRateLimitStatus(
  identifier: string,
  type: RateLimitType = "standard",
): RateLimitInfo {
  const limit = RATE_LIMITS[type];
  const now = Date.now();
  const cacheKey = `${identifier}:${type}`;

  const existing = db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, cacheKey))
    .get();

  if (!existing || existing.windowEnd <= now) {
    return {
      limit,
      remaining: limit,
      reset: Math.floor((now + WINDOW_DURATION) / 1000),
    };
  }

  const remaining = Math.max(0, limit - existing.count);
  const resetTime = Math.floor(existing.windowEnd / 1000);

  return {
    limit,
    remaining,
    reset: resetTime,
  };
}

/**
 * Clear all rate limit data
 * Useful for testing or maintenance
 */
export function clearAllRateLimits(): void {
  db.delete(rateLimits).run();
}

/**
 * Get rate limit statistics
 * Useful for monitoring
 */
export function getRateLimitStats() {
  return {
    limits: RATE_LIMITS,
    windowDuration: WINDOW_DURATION,
  };
}
