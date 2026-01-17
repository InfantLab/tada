/**
 * DELETE /api/rhythms/:id
 * Delete a rhythm
 */

import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";
import { rhythms } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:rhythms:delete");

export default defineEventHandler(async (event) => {
  // Auth check
  const user = event.context.user;
  if (!user) {
    logger.warn("Unauthenticated rhythm delete attempt");
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }

  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Rhythm ID is required",
    });
  }

  logger.info("Deleting rhythm", { userId: user.id, rhythmId: id });

  // Verify ownership and delete
  const result = await db
    .delete(rhythms)
    .where(and(eq(rhythms.id, id), eq(rhythms.userId, user.id)))
    .returning({ id: rhythms.id });

  if (result.length === 0) {
    logger.warn("Rhythm not found or not owned", {
      userId: user.id,
      rhythmId: id,
    });
    throw createError({
      statusCode: 404,
      statusMessage: "Rhythm not found",
    });
  }

  logger.info("Rhythm deleted successfully", { userId: user.id, rhythmId: id });

  return { success: true, id };
});
