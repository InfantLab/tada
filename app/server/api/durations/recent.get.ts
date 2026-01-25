/**
 * GET /api/durations/recent
 *
 * Returns the user's recently used durations for quick picks.
 * Aggregates unique durations from recent timed entries and returns
 * the most frequently used ones.
 *
 * Query params:
 * - limit: Number of recent durations to return (default: 10)
 * - category: Filter by category (optional)
 */

import { eq, desc, and, isNotNull } from "drizzle-orm";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";

const logger = createLogger("api:durations:recent");

interface RecentDuration {
  /** Duration in seconds */
  duration: number;
  /** How many times this duration was used */
  count: number;
  /** Formatted display string (e.g., "20m", "1h 30m") */
  display: string;
  /** Last used timestamp */
  lastUsed: string;
}

/**
 * Format duration for display
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && hours === 0) parts.push(`${secs}s`);

  return parts.length > 0 ? parts.join(" ") : "0s";
}

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = event.context.user;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Authentication required",
    });
  }

  const userId = user.id;
  const query = getQuery(event);
  const limit = Math.min(Math.max(parseInt(String(query["limit"] || "10"), 10), 1), 50);
  const category = query["category"] as string | undefined;

  logger.debug("Fetching recent durations", { userId, limit, category });

  try {
    // Build query conditions
    const conditions = [
      eq(entries.userId, userId),
      eq(entries.type, "timed"),
      isNotNull(entries.durationSeconds),
    ];

    if (category) {
      conditions.push(eq(entries.category, category));
    }

    // Get recent timed entries
    const recentEntries = await db
      .select({
        durationSeconds: entries.durationSeconds,
        timestamp: entries.timestamp,
      })
      .from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.timestamp))
      .limit(100); // Get more for aggregation

    // Aggregate by duration
    const durationMap = new Map<number, { count: number; lastUsed: string }>();

    for (const entry of recentEntries) {
      if (entry.durationSeconds === null) continue;
      
      const existing = durationMap.get(entry.durationSeconds);
      if (existing) {
        existing.count++;
        // Keep the most recent
        if (entry.timestamp > existing.lastUsed) {
          existing.lastUsed = entry.timestamp;
        }
      } else {
        durationMap.set(entry.durationSeconds, {
          count: 1,
          lastUsed: entry.timestamp,
        });
      }
    }

    // Convert to array and sort by frequency, then recency
    const durations: RecentDuration[] = Array.from(durationMap.entries())
      .map(([duration, data]) => ({
        duration,
        count: data.count,
        display: formatDuration(duration),
        lastUsed: data.lastUsed,
      }))
      .sort((a, b) => {
        // Primary: frequency (descending)
        if (b.count !== a.count) return b.count - a.count;
        // Secondary: recency (descending)
        return b.lastUsed.localeCompare(a.lastUsed);
      })
      .slice(0, limit);

    logger.debug("Recent durations fetched", {
      userId,
      count: durations.length,
    });

    return {
      durations,
      total: durationMap.size,
    };
  } catch (error) {
    logger.error("Failed to fetch recent durations", { userId, error });
    throw createError({
      statusCode: 500,
      message: "Failed to fetch recent durations",
    });
  }
});
