import { defineEventHandler, getQuery, createError } from "h3";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:get");

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);

    // Require authentication
    if (!event.context.user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const userId = event.context.user.id;

    logger.debug("Fetching entries", { userId, query });

    // Build where conditions
    const conditions = [
      eq(entries.userId, userId),
      isNull(entries.deletedAt), // Exclude soft-deleted entries
    ];

    // Filter by type if provided
    if (query["type"] && typeof query["type"] === "string") {
      conditions.push(eq(entries.type, query["type"]));
    }

    // Query entries - sort by whichever timestamp field is populated
    const userEntries = await db
      .select()
      .from(entries)
      .where(and(...conditions))
      .orderBy(
        desc(
          sql`COALESCE(${entries.timestamp}, ${entries.startedAt}, ${entries.date}, ${entries.createdAt})`
        )
      )
      .limit(query["limit"] ? parseInt(query["limit"] as string) : 100);

    logger.info("Entries fetched successfully", { count: userEntries.length });
    return userEntries;
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
