import { defineEventHandler, createError, readBody } from "h3";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:bulk:restore");

/**
 * Bulk restore soft-deleted entries (undo bulk delete)
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
  const { ids } = body as { ids: string[] };

  if (!ids || ids.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Entry IDs are required",
    });
  }

  logger.info("Bulk restore request", {
    userId,
    idsCount: ids.length,
  });

  try {
    // Restore by clearing deletedAt
    const now = new Date().toISOString();
    await db
      .update(entries)
      .set({
        deletedAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(entries.userId, userId),
          inArray(entries.id, ids),
          isNotNull(entries.deletedAt) // Only restore deleted entries
        )
      );

    logger.info("Bulk restore completed", {
      userId,
      restoredCount: ids.length,
    });

    return {
      success: true,
      restoredCount: ids.length,
    };
  } catch (error) {
    logger.error("Bulk restore failed", { userId, error });
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to restore entries",
    });
  }
});
