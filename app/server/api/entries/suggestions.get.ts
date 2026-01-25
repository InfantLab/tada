/**
 * GET /api/entries/suggestions
 *
 * Returns activity name suggestions based on user's entry history.
 * Used for autocomplete in entry creation forms.
 *
 * Query params:
 * - query: Search string to match activity names (required)
 * - type: Filter by entry type (optional)
 * - limit: Maximum suggestions to return (default: 10)
 */

import { eq, desc, and, like, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";

const logger = createLogger("api:entries:suggestions");

interface ActivitySuggestion {
  /** Activity name */
  name: string;
  /** Category (if available) */
  category?: string;
  /** How many times this activity was logged */
  count: number;
  /** Last time this activity was logged */
  lastUsed: string;
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
  const queryParams = getQuery(event);
  const query = String(queryParams["query"] || "").trim();
  const type = queryParams["type"] as string | undefined;
  const limit = Math.min(
    Math.max(parseInt(String(queryParams["limit"] || "10"), 10), 1),
    50
  );

  if (!query) {
    return { suggestions: [] };
  }

  logger.debug("Fetching activity suggestions", { userId, query, type, limit });

  try {
    // Build query conditions
    const conditions = [
      eq(entries.userId, userId),
      like(entries.name, `%${query}%`),
    ];

    if (type) {
      conditions.push(eq(entries.type, type));
    }

    // Get matching entries grouped by name
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
      .orderBy(desc(sql`count(*)`), desc(sql`max(${entries.timestamp})`))
      .limit(limit);

    // Transform results
    const suggestions: ActivitySuggestion[] = results.map((row) => ({
      name: row.name,
      category: row.category || undefined,
      count: Number(row.count),
      lastUsed: row.lastUsed,
    }));

    logger.debug("Activity suggestions fetched", {
      userId,
      query,
      count: suggestions.length,
    });

    return { suggestions };
  } catch (error) {
    logger.error("Failed to fetch activity suggestions", {
      userId,
      query,
      error,
    });
    throw createError({
      statusCode: 500,
      message: "Failed to fetch activity suggestions",
    });
  }
});
