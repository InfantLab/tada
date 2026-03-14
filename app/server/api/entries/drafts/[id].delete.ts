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
    throw createError(unauthorized(event, "Authentication required"));
  }

  const userId = user.id;

  // Validate path params
  const params = getRouterParams(event);
  const validation = paramsSchema.safeParse(params);

  if (!validation.success) {
    throw createError(
      apiError(event, "INVALID_ID", "Invalid draft ID", 400)
    );
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
      throw createError(notFound(event, "Draft"));
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
    throw createError(internalError(event));
  }
});
