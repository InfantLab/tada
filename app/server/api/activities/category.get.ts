/**
 * GET /api/activities/category
 *
 * Returns the most commonly used category for a given activity name.
 * Used to enforce category consistency when users re-use activity names.
 *
 * Query params:
 * - name: Activity name (required)
 * - type: Filter by entry type (optional)
 */

import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";
import { normalizeActivityName } from "~/server/utils/activityMatcher";

const logger = createLogger("api:activities:category");

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
  const activityName = String(queryParams["name"] || "").trim();
  const type = queryParams["type"] as string | undefined;

  if (!activityName) {
    return { category: null, count: 0 };
  }

  logger.debug("Fetching most common category for activity", {
    userId,
    activityName,
    type,
  });

  try {
    // Normalize activity name for comparison
    const normalized = normalizeActivityName(activityName);

    // Build query conditions - match by normalized name
    const conditions = [
      eq(entries.userId, userId),
      sql`LOWER(TRIM(${entries.name})) = ${normalized}`,
    ];

    if (type) {
      conditions.push(eq(entries.type, type));
    }

    // Get category usage counts for this activity
    const results = await db
      .select({
        category: entries.category,
        count: sql<number>`count(*)`,
      })
      .from(entries)
      .where(and(...conditions))
      .groupBy(entries.category)
      .orderBy(desc(sql`count(*)`))
      .limit(1); // Get only the most common

    if (results.length === 0) {
      return { category: null, count: 0 };
    }

    const mostCommon = results[0]!;

    logger.debug("Most common category found", {
      userId,
      activityName,
      category: mostCommon.category,
      count: mostCommon.count,
    });

    return {
      category: mostCommon.category || null,
      count: Number(mostCommon.count),
    };
  } catch (error) {
    logger.error("Failed to fetch category for activity", {
      userId,
      activityName,
      error,
    });
    throw createError({
      statusCode: 500,
      message: "Failed to fetch activity category",
    });
  }
});
