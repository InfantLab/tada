import { defineEventHandler, getQuery, createError } from "h3";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and, desc, isNull, sql, gte, lte } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:get");

// timestamp is THE canonical timeline field - always set, never null

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user from context
    const user = event.context.user;
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const query = getQuery(event);
    const userId = user.id;

    // Pagination parameters
    const limit = Math.min(
      Math.max(1, parseInt(query["limit"] as string) || 50),
      100
    );
    const cursor = query["cursor"] as string | undefined;

    // Filter parameters
    const fromDate = query["from"] as string | undefined;
    const toDate = query["to"] as string | undefined;
    const category = query["category"] as string | undefined;
    const type = query["type"] as string | undefined;
    const search = query["search"] as string | undefined;

    logger.debug("Fetching entries", {
      userId,
      limit,
      cursor,
      fromDate,
      toDate,
      category,
      type,
      search,
    });

    // Build where conditions
    const conditions = [
      eq(entries.userId, userId),
      isNull(entries.deletedAt), // Exclude soft-deleted entries
    ];

    // Filter by type if provided
    if (type) {
      conditions.push(eq(entries.type, type));
    }

    // Filter by category if provided
    if (category) {
      conditions.push(eq(entries.category, category));
    }

    // Date range filter (from/to as ISO strings or YYYY-MM-DD)
    if (fromDate) {
      conditions.push(gte(entries.timestamp, fromDate));
    }
    if (toDate) {
      // Add a day to include the entire 'to' date
      const toDateEnd = toDate.includes("T") ? toDate : `${toDate}T23:59:59`;
      conditions.push(lte(entries.timestamp, toDateEnd));
    }

    // Simple search in name and notes
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        sql`(${entries.name} LIKE ${searchPattern} OR ${entries.notes} LIKE ${searchPattern})`
      );
    }

    // Cursor-based pagination: fetch entries older than the cursor timestamp
    if (cursor) {
      // Cursor format: "timestamp|id" for stable pagination
      const [cursorTimestamp, cursorId] = cursor.split("|");
      if (cursorTimestamp) {
        // Get entries with timestamp < cursor, or same timestamp but id < cursor
        conditions.push(
          sql`(${entries.timestamp} < ${cursorTimestamp} OR (${entries.timestamp} = ${cursorTimestamp} AND ${entries.id} < ${cursorId}))`
        );
      }
    }

    // Query entries - order by timestamp desc, then by id for stability
    const userEntries = await db
      .select()
      .from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.timestamp), desc(entries.id))
      .limit(limit + 1); // Fetch one extra to check if there are more

    // Determine if there are more entries
    const hasMore = userEntries.length > limit;
    const resultEntries = hasMore ? userEntries.slice(0, limit) : userEntries;

    // Generate next cursor from the last entry
    let nextCursor: string | null = null;
    if (hasMore && resultEntries.length > 0) {
      const lastEntry = resultEntries[resultEntries.length - 1];
      if (lastEntry) {
        nextCursor = `${lastEntry.timestamp}|${lastEntry.id}`;
      }
    }

    logger.info("Entries fetched successfully", {
      count: resultEntries.length,
      hasMore,
    });

    return {
      entries: resultEntries,
      nextCursor,
      hasMore,
    };
  } catch (error: unknown) {
    logger.error("Failed to fetch entries", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch entries",
      data: { error: message },
    });
  }
});
