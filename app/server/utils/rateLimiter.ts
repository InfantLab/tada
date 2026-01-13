/**
 * Simple in-memory rate limiter for API endpoints
 * Tracks request timestamps per user ID
 */

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if user is within rate limit
 * @param userId - User identifier
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if within limit, false if exceeded
 */
export function checkRateLimit(
  userId: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Get or create user entry
  let entry = rateLimitStore.get(userId);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(userId, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  // Check if limit exceeded
  if (entry.timestamps.length >= maxRequests) {
    return false;
  }

  // Add current timestamp
  entry.timestamps.push(now);
  return true;
}

/**
 * Get remaining requests for user
 */
export function getRemainingRequests(
  userId: string,
  maxRequests: number,
  windowMs: number
): number {
  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = rateLimitStore.get(userId);
  if (!entry) {
    return maxRequests;
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  return Math.max(0, maxRequests - entry.timestamps.length);
}

/**
 * Clean up old entries (run periodically)
 * Removes entries with no recent activity
 */
export function cleanupRateLimiter(maxAgeMs: number = 3600000) {
  const now = Date.now();
  const cutoff = now - maxAgeMs;

  for (const [userId, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(userId);
    }
  }
}

// Clean up every hour
setInterval(() => cleanupRateLimiter(), 3600000);
