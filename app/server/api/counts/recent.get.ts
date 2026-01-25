/**
 * GET /api/counts/recent
 *
 * Returns the user's recently used counts for quick picks.
 * Aggregates unique counts from recent reps entries and returns
 * the most frequently used ones.
 *
 * Query params:
 * - limit: Number of recent counts to return (default: 10)
 * - activity: Filter by activity name (optional)
 */

import { eq, desc, and, isNotNull } from "drizzle-orm";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";

const logger = createLogger("api:counts:recent");

interface RecentCount {
  /** Count value */
  count: number;
  /** How many times this count was used */
  frequency: number;
  /** Last used timestamp */
  lastUsed: string;
  /** Activity name (if filtering) */
  activity?: string;
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
  const limit = Math.min(
    Math.max(parseInt(String(query["limit"] || "10"), 10), 1),
    50,
  );
  const activity = query["activity"] as string | undefined;

  logger.debug("Fetching recent counts", { userId, limit, activity });

  try {
    // Build query conditions
    const conditions = [
      eq(entries.userId, userId),
      eq(entries.type, "reps"),
      isNotNull(entries.data),
    ];

    if (activity) {
      conditions.push(eq(entries.name, activity));
    }

    // Get recent reps entries
    const recentEntries = await db
      .select({
        data: entries.data,
        timestamp: entries.timestamp,
        name: entries.name,
      })
      .from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.timestamp))
      .limit(100); // Get more for aggregation

    // Aggregate by count value
    const countMap = new Map<
      number,
      { frequency: number; lastUsed: string; activity?: string }
    >();

    for (const entry of recentEntries) {
      if (!entry.data || typeof entry.data !== "object") continue;

      // Get count from data field
      const dataObj = entry.data as Record<string, unknown>;
      const countValue = dataObj["count"];
      if (typeof countValue !== "number" || countValue <= 0) continue;

      const existing = countMap.get(countValue);
      if (existing) {
        existing.frequency++;
        if (entry.timestamp > existing.lastUsed) {
          existing.lastUsed = entry.timestamp;
          existing.activity = entry.name;
        }
      } else {
        countMap.set(countValue, {
          frequency: 1,
          lastUsed: entry.timestamp,
          activity: entry.name,
        });
      }
    }

    // Convert to array and sort by frequency, then recency
    const counts: RecentCount[] = Array.from(countMap.entries())
      .map(([count, data]) => ({
        count,
        frequency: data.frequency,
        lastUsed: data.lastUsed,
        activity: activity ? undefined : data.activity, // Only include if not filtering
      }))
      .sort((a, b) => {
        // Primary: frequency (descending)
        if (b.frequency !== a.frequency) return b.frequency - a.frequency;
        // Secondary: recency (descending)
        return b.lastUsed.localeCompare(a.lastUsed);
      })
      .slice(0, limit);

    logger.debug("Recent counts fetched", {
      userId,
      count: counts.length,
    });

    return {
      counts,
      total: countMap.size,
    };
  } catch (error) {
    logger.error("Failed to fetch recent counts", { userId, error });
    throw createError({
      statusCode: 500,
      message: "Failed to fetch recent counts",
    });
  }
});
