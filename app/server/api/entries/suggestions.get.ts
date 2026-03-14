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

import { eq, and, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";
import {
  normalizeActivityName,
  calculateSimilarity,
} from "~/server/utils/activityMatcher";

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
    throw createError(unauthorized(event, "Authentication required"));
  }

  const userId = user.id;
  const queryParams = getQuery(event);
  const query = String(queryParams["query"] || "").trim();
  const type = queryParams["type"] as string | undefined;
  const limit = Math.min(
    Math.max(parseInt(String(queryParams["limit"] || "10"), 10), 1),
    50,
  );

  if (!query) {
    return { suggestions: [] };
  }

  logger.debug("Fetching activity suggestions", { userId, query, type, limit });

  try {
    // Normalize query for better matching
    const normalizedQuery = normalizeActivityName(query);

    // Build query conditions - use broader search initially
    const conditions = [eq(entries.userId, userId)];

    if (type) {
      conditions.push(eq(entries.type, type));
    }

    // Get all user activities (we'll filter with fuzzy matching)
    // Use a broader LIKE if query is short, otherwise narrow it down
    if (query.length >= 2) {
      // Use first 2 chars to narrow down the DB query
      const prefix = query.substring(0, 2).toLowerCase();
      conditions.push(
        sql`LOWER(${entries.name}) LIKE ${prefix}% OR LOWER(${entries.name}) LIKE ${"%" + prefix + "%"}`,
      );
    }

    // Get matching entries grouped by name only
    // For each name, we'll pick the most common category
    const dbResults = await db
      .select({
        name: entries.name,
        category: entries.category,
        count: sql<number>`count(*)`,
        lastUsed: sql<string>`max(${entries.timestamp})`,
      })
      .from(entries)
      .where(and(...conditions))
      .groupBy(entries.name, entries.category)
      .limit(200); // Get more results for fuzzy matching and category deduplication

    // Group by name and pick most common category for each
    const nameGroups = new Map<
      string,
      {
        categories: Map<string | null, number>;
        totalCount: number;
        lastUsed: string;
      }
    >();

    for (const row of dbResults) {
      const existing = nameGroups.get(row.name);
      if (existing) {
        const catCount = existing.categories.get(row.category) || 0;
        existing.categories.set(row.category, catCount + Number(row.count));
        existing.totalCount += Number(row.count);
        // Keep the most recent timestamp
        if (row.lastUsed > existing.lastUsed) {
          existing.lastUsed = row.lastUsed;
        }
      } else {
        const categories = new Map<string | null, number>();
        categories.set(row.category, Number(row.count));
        nameGroups.set(row.name, {
          categories,
          totalCount: Number(row.count),
          lastUsed: row.lastUsed,
        });
      }
    }

    // Apply fuzzy matching and scoring
    const scoredResults = dbResults
      .map((row) => ({
        name: row.name,
        category: row.category || undefined,
        count: Number(row.count),
        lastUsed: row.lastUsed,
        similarity: calculateSimilarity(query, row.name),
      }))
      .filter((item) => item.similarity >= 0.5) // Only keep reasonably similar matches
      .sort((a, b) => {
        // Sort by similarity first, then by usage count
        if (Math.abs(a.similarity - b.similarity) > 0.1) {
          return b.similarity - a.similarity;
        }
        return b.count - a.count;
      })
      .slice(0, limit);

    // Transform to final format (remove similarity score from response)
    const suggestions: ActivitySuggestion[] = scoredResults.map((item) => ({
      name: item.name,
      category: item.category,
      count: item.count,
      lastUsed: item.lastUsed,
    }));

    logger.debug("Activity suggestions fetched with fuzzy matching", {
      userId,
      query,
      normalizedQuery,
      dbResults: dbResults.length,
      afterFuzzy: suggestions.length,
    });

    return { suggestions };
  } catch (error) {
    logger.error("Failed to fetch activity suggestions", {
      userId,
      query,
      error,
    });
    throw createError(internalError(event));
  }
});
