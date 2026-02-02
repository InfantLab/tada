/**
 * Rate Limiting Service
 *
 * Implements in-memory rate limiting with LRU cache for API requests.
 * Uses sliding window algorithm for accurate rate limiting.
 */

import type { RateLimitInfo } from "~/types/api";

interface RateLimitEntry {
  count: number;
  windowStart: number; // Unix timestamp in milliseconds
  requests: number[]; // Array of request timestamps for sliding window
}

// Rate limit configurations (requests per minute)
const RATE_LIMITS = {
  standard: 100, // Standard API endpoints
  export: 10, // Export endpoints (more expensive)
  pattern: 5, // Pattern detection (very expensive)
  webhook: 20, // Webhook endpoints
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

// Window duration in milliseconds
const WINDOW_DURATION = 60 * 1000; // 1 minute

// LRU Cache implementation
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists (to re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If at capacity, remove least recently used (first item)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Global rate limit cache
const rateLimitCache = new LRUCache<string, RateLimitEntry>();

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
  const windowStart = now - WINDOW_DURATION;

  const cacheKey = `${identifier}:${type}`;
  let entry = rateLimitCache.get(cacheKey);

  if (!entry) {
    // First request in window
    entry = {
      count: 1,
      windowStart: now,
      requests: [now],
    };
    rateLimitCache.set(cacheKey, entry);

    return {
      allowed: true,
      info: {
        limit,
        remaining: limit - 1,
        reset: Math.floor((now + WINDOW_DURATION) / 1000),
      },
    };
  }

  // Remove requests outside the sliding window
  entry.requests = entry.requests.filter((timestamp) => timestamp > windowStart);

  // Add current request
  entry.requests.push(now);
  entry.count = entry.requests.length;

  // Update window start
  entry.windowStart = now;

  // Save updated entry
  rateLimitCache.set(cacheKey, entry);

  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  // Calculate reset time (when oldest request in window will expire)
  const oldestRequest = entry.requests[0] || now;
  const resetTime = Math.floor((oldestRequest + WINDOW_DURATION) / 1000);

  // Calculate retry after (seconds until a request slot frees up)
  const retryAfter = allowed
    ? undefined
    : Math.ceil((oldestRequest + WINDOW_DURATION - now) / 1000);

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
    rateLimitCache.delete(cacheKey);
  } else {
    // Reset all rate limits for this identifier
    for (const limitType of Object.keys(RATE_LIMITS)) {
      const cacheKey = `${identifier}:${limitType}`;
      rateLimitCache.delete(cacheKey);
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
  const windowStart = now - WINDOW_DURATION;

  const cacheKey = `${identifier}:${type}`;
  const entry = rateLimitCache.get(cacheKey);

  if (!entry) {
    return {
      limit,
      remaining: limit,
      reset: Math.floor((now + WINDOW_DURATION) / 1000),
    };
  }

  // Count requests within window
  const activeRequests = entry.requests.filter(
    (timestamp) => timestamp > windowStart,
  ).length;
  const remaining = Math.max(0, limit - activeRequests);

  // Calculate reset time
  const oldestRequest = entry.requests[0] || now;
  const resetTime = Math.floor((oldestRequest + WINDOW_DURATION) / 1000);

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
  rateLimitCache.clear();
}

/**
 * Get cache statistics
 * Useful for monitoring
 */
export function getRateLimitStats() {
  return {
    cacheSize: rateLimitCache.size,
    limits: RATE_LIMITS,
    windowDuration: WINDOW_DURATION,
  };
}
