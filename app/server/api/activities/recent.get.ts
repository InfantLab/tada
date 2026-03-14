/**
 * GET /api/activities/recent
 *
 * Returns recently used activities based on user's entry history.
 * Used for activity preset buttons in tally forms.
 *
 * Query params:
 * - type: Filter by entry type (optional, e.g., "tally")
 * - limit: Maximum activities to return (default: 8)
 */

import { eq, desc, and, sql, isNotNull } from "drizzle-orm";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";

const logger = createLogger("api:activities:recent");

interface ActivitySuggestion {
  /** Activity name */
  name: string;
  /** Category (if available) */
  category?: string;
  /** How many times this activity was logged */
  count: number;
}

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  const userId = user.id;
  const queryParams = getQuery(event);
  const type = queryParams["type"] as string | undefined;
  const limit = Math.min(
    Math.max(parseInt(String(queryParams["limit"] || "8"), 10), 1),
    50,
  );

  logger.debug("Fetching recent activities", { userId, type, limit });

  try {
    // Build query conditions
    const conditions = [eq(entries.userId, userId), isNotNull(entries.name)];

    if (type) {
      conditions.push(eq(entries.type, type));
    }

    // Get recent activities grouped by name and category
    // Order by most recent usage, then by usage count
    const results = await db
      .select({
        name: entries.name,
        category: entries.category,
        count: sql<number>`count(*)`,
        lastUsed: sql<string>`max(${entries.timestamp})`,
      })
      .from(entries)
      .where(and(...conditions))
      .groupBy(entries.name, entries.category)
      .orderBy(desc(sql`max(${entries.timestamp})`), desc(sql`count(*)`))
      .limit(limit);

    // Transform results
    const suggestions: ActivitySuggestion[] = results.map((row) => ({
      name: row.name,
      category: row.category || undefined,
      count: Number(row.count),
    }));

    logger.debug("Recent activities fetched", {
      userId,
      count: suggestions.length,
    });

    return { suggestions };
  } catch (error) {
    logger.error("Failed to fetch recent activities", {
      userId,
      error,
    });
    throw createError(internalError(event, "Failed to fetch recent activities"));
  }
});
