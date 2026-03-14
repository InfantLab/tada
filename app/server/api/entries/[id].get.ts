import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:get-by-id");

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    logger.warn("Missing entry ID");
    throw createError(
      apiError(event, "INVALID_ID", "Entry ID is required", 400)
    );
  }

  // Require authentication
  if (!event.context.user) {
    throw createError(unauthorized(event));
  }

  try {
    const result = await db
      .select()
      .from(entries)
      .where(eq(entries.id, id))
      .limit(1);

    if (result.length === 0) {
      logger.warn("Entry not found", { id });
      throw createError(notFound(event, "Entry"));
    }

    const entry = result[0];

    // Ensure entry exists
    if (!entry) {
      logger.error("Entry unexpectedly undefined after query", { id });
      throw createError(notFound(event, "Entry"));
    }

    // Check ownership
    if (entry.userId !== event.context.user.id) {
      logger.warn("Unauthorized access attempt", {
        id,
        userId: event.context.user.id,
      });
      throw createError(forbidden(event));
    }

    logger.info("Entry fetched", { id });
    return result[0];
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    logger.error("Failed to fetch entry", { id, error });
    throw createError(internalError(event));
  }
});
