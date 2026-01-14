/**
 * GET /api/subcategories
 * Returns previously used subcategories for autocomplete suggestions
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { createLogger } from "~/utils/logger";

const logger = createLogger("api:subcategories");

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
  const category = query["category"] as string | undefined;

  logger.debug("Fetching subcategories", { userId, category });

  try {
    // Query distinct subcategories used by this user
    // Optionally filtered by category
    const dbQuery = db
      .selectDistinct({
        subcategory: entries.subcategory,
        category: entries.category,
      })
      .from(entries)
      .where(eq(entries.userId, userId));

    const results = await dbQuery;

    // Group subcategories by category
    const grouped: Record<string, string[]> = {};

    for (const row of results) {
      if (!row.subcategory || !row.category) continue;

      const cat = row.category;
      if (!grouped[cat]) {
        grouped[cat] = [];
      }

      const catArray = grouped[cat];
      if (catArray && !catArray.includes(row.subcategory)) {
        catArray.push(row.subcategory);
      }
    }

    // If a specific category was requested, return just that array
    if (category) {
      return grouped[category] || [];
    }

    // Otherwise return the grouped object
    return grouped;
  } catch (error) {
    logger.error("Failed to fetch subcategories", error as Error, { userId });
    throw createError({
      statusCode: 500,
      message: "Failed to fetch subcategories",
    });
  }
});
