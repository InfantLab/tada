import { defineEventHandler, getRouterParam, createError } from "h3";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:delete");

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");

    // Require authentication
    if (!event.context.user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const userId = event.context.user.id;

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Entry ID is required",
      });
    }

    // Check if entry exists and belongs to user
    const [existing] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .limit(1);

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Entry not found",
      });
    }

    // Soft delete by setting deletedAt
    await db
      .update(entries)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(entries.id, id), eq(entries.userId, userId)));

    return { success: true, id };
  } catch (error: unknown) {
    logger.error("Failed to delete entry", error, { entryId: id });

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete entry",
      data: { error: message },
    });
  }
});
