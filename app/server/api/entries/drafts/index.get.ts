/**
 * GET /api/entries/drafts
 *
 * List all draft entries for the authenticated user.
 * Drafts are auto-saved incomplete entries from voice/quick entry flows.
 *
 * Query params:
 * - limit: Max number of drafts to return (default: 10, max: 50)
 * - includeExpired: Include expired drafts (default: false)
 *
 * Response:
 * - drafts: Array of draft entries with parsed data
 * - total: Total count of drafts
 */

import { createLogger } from "~/utils/logger";
import { db } from "~/server/db";
import { entryDrafts } from "~/server/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { z } from "zod";

const logger = createLogger("api:entries:drafts:get");

// Query params validation
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  includeExpired: z.coerce.boolean().default(false),
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

  // Parse query params
  const query = getQuery(event);
  const validation = querySchema.safeParse(query);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid query params: ${validation.error.issues[0]?.message}`,
    });
  }

  const { limit, includeExpired } = validation.data;
  const now = new Date().toISOString();

  logger.debug("Fetching drafts", { userId, limit, includeExpired });

  try {
    // Build query conditions
    const conditions = includeExpired
      ? eq(entryDrafts.userId, userId)
      : and(eq(entryDrafts.userId, userId), gte(entryDrafts.expiresAt, now));

    // Fetch drafts
    const drafts = await db
      .select()
      .from(entryDrafts)
      .where(conditions)
      .orderBy(desc(entryDrafts.createdAt))
      .limit(limit);

    // Transform for response
    const transformedDrafts = drafts.map((draft) => ({
      id: draft.id,
      input: draft.input,
      parsedFrom: draft.parsedFrom,
      confidence: draft.confidence ? draft.confidence / 100 : null,
      createdAt: draft.createdAt,
      expiresAt: draft.expiresAt,
      isExpired: draft.expiresAt < now,
    }));

    logger.debug("Drafts fetched", { userId, count: drafts.length });

    return {
      drafts: transformedDrafts,
      total: drafts.length,
    };
  } catch (error) {
    logger.error("Failed to fetch drafts", { userId, error });
    throw createError({
      statusCode: 500,
      message: "Failed to fetch drafts",
    });
  }
});
