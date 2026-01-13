import { defineEventHandler, getQuery, createError } from "h3";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:get");

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

    // Query entries - order by most relevant timestamp field (prefer startedAt, then timestamp, then createdAt)
    const userEntries = await db
      .select()
      .from(entries)
      .where(and(...conditions))
      .orderBy(
        desc(
          // Use COALESCE to try fields in order: startedAt > timestamp > createdAt
          sql`COALESCE(${entries.startedAt}, ${entries.timestamp}, ${entries.createdAt})`
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
