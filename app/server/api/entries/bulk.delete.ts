import { defineEventHandler, createError, readBody } from "h3";
import { db } from "~/server/db";
import { entries, type Entry } from "~/server/db/schema";
import { eq, and, isNull, inArray, like } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:bulk:delete");

/**
 * Bulk delete entries by category or type
 * Supports soft-delete and returns deleted entries for undo support
 */
export default defineEventHandler(async (event) => {
  // Require authentication
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const userId = event.context.user.id;

  const body = await readBody(event);
  const { category, type, ids } = body as {
    category?: string;
    type?: string;
    ids?: string[];
  };

  // Validate input - at least one filter required
  if (!category && !type && (!ids || ids.length === 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: "At least one of category, type, or ids is required",
    });
  }

  logger.info("Bulk delete request", {
    userId,
    category,
    type,
    idsCount: ids?.length,
  });

  try {
    // Build conditions
    const conditions = [
      eq(entries.userId, userId),
      isNull(entries.deletedAt), // Only non-deleted entries
    ];

    if (ids && ids.length > 0) {
      conditions.push(inArray(entries.id, ids));
    }

    if (type) {
      conditions.push(eq(entries.type, type));
    }

    if (category) {
      // Category is stored in the name field as "Category: Name" format
      // or in the data field for some entry types
      conditions.push(like(entries.name, `${category}:%`));
    }

    // First, fetch the entries to be deleted (for undo support)
    const entriesToDelete = await db
      .select()
      .from(entries)
      .where(and(...conditions));

    if (entriesToDelete.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        entries: [],
      };
    }

    const entryIds = entriesToDelete.map((e) => e.id);

    // Soft delete all matching entries
    const now = new Date().toISOString();
    await db
      .update(entries)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(eq(entries.userId, userId), inArray(entries.id, entryIds)));

    logger.info("Bulk delete completed", {
      userId,
      deletedCount: entriesToDelete.length,
    });

    return {
      success: true,
      deletedCount: entriesToDelete.length,
      entries: entriesToDelete as Entry[],
    };
  } catch (error) {
    logger.error("Bulk delete failed", { userId, error });
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete entries",
    });
  }
});
