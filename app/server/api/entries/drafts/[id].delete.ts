/**
 * DELETE /api/entries/drafts/[id]
 *
 * Delete a specific draft entry. Used when user explicitly dismisses
 * a draft or when draft is committed.
 *
 * Path params:
 * - id: Draft ID to delete
 *
 * Response:
 * - success: boolean
 */

import { createLogger } from "~/utils/logger";
import { db } from "~/server/db";
import { entryDrafts } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const logger = createLogger("api:entries:drafts:delete");

// Path params validation
const paramsSchema = z.object({
  id: z.string().uuid(),
});

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

  // Validate path params
  const params = getRouterParams(event);
  const validation = paramsSchema.safeParse(params);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: "Invalid draft ID",
    });
  }

  const { id: draftId } = validation.data;

  logger.debug("Deleting draft", { userId, draftId });

  try {
    // Delete draft (only if owned by user)
    const result = await db
      .delete(entryDrafts)
      .where(and(eq(entryDrafts.id, draftId), eq(entryDrafts.userId, userId)))
      .returning({ id: entryDrafts.id });

    // Check if draft was found
    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Draft not found",
      });
    }

    logger.debug("Draft deleted", { userId, draftId });

    return {
      success: true,
    };
  } catch (error) {
    // Re-throw HTTP errors
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    logger.error("Failed to delete draft", { userId, draftId, error });
    throw createError({
      statusCode: 500,
      message: "Failed to delete draft",
    });
  }
});
