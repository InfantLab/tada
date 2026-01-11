import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:get-by-id");

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    logger.warn("Missing entry ID");
    throw createError({
      statusCode: 400,
      statusMessage: "Entry ID is required",
    });
  }

  // Require authentication
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  try {
    const result = await db
      .select()
      .from(entries)
      .where(eq(entries.id, id))
      .limit(1);

    if (result.length === 0) {
      logger.warn("Entry not found", { id });
      throw createError({
        statusCode: 404,
        statusMessage: "Entry not found",
      });
    }

    const entry = result[0];

    // Ensure entry exists
    if (!entry) {
      logger.error("Entry unexpectedly undefined after query", { id });
      throw createError({
        statusCode: 404,
        statusMessage: "Entry not found",
      });
    }

    // Check ownership
    if (entry.userId !== event.context.user.id) {
      logger.warn("Unauthorized access attempt", {
        id,
        userId: event.context.user.id,
      });
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden",
      });
    }

    logger.info("Entry fetched", { id });
    return result[0];
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    logger.error("Failed to fetch entry", { id, error });
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch entry",
    });
  }
});
