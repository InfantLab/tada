/**
 * POST /api/entries/drafts/[id]/commit
 *
 * Commit a draft entry, converting it to a real entry.
 * Optionally allows overriding/merging additional data.
 *
 * Path params:
 * - id: Draft ID to commit
 *
 * Request body (optional):
 * - overrides: Additional fields to merge into the draft input
 *
 * Response:
 * - entryId: Created entry ID
 * - draftDeleted: boolean
 */

import { createLogger } from "~/utils/logger";
import { db } from "~/server/db";
import { entries, entryDrafts } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";

const logger = createLogger("api:entries:drafts:commit");

// Path params validation
const paramsSchema = z.object({
  id: z.string().uuid(),
});

// Request body validation
const commitBodySchema = z
  .object({
    overrides: z.record(z.unknown()).optional(),
  })
  .optional();

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
  const paramsValidation = paramsSchema.safeParse(params);

  if (!paramsValidation.success) {
    throw createError({
      statusCode: 400,
      message: "Invalid draft ID",
    });
  }

  const { id: draftId } = paramsValidation.data;

  // Parse optional body
  const body = await readBody(event);
  const bodyValidation = commitBodySchema.safeParse(body);
  const overrides = bodyValidation.success
    ? bodyValidation.data?.overrides
    : undefined;

  logger.debug("Committing draft", {
    userId,
    draftId,
    hasOverrides: !!overrides,
  });

  try {
    // Fetch the draft
    const [draft] = await db
      .select()
      .from(entryDrafts)
      .where(and(eq(entryDrafts.id, draftId), eq(entryDrafts.userId, userId)))
      .limit(1);

    if (!draft) {
      throw createError({
        statusCode: 404,
        message: "Draft not found",
      });
    }

    // Merge draft input with overrides
    const mergedInput = {
      ...draft.input,
      ...overrides,
    };

    // Validate required fields for entry creation
    const name = mergedInput["name"] as string | undefined;
    if (!name) {
      throw createError({
        statusCode: 400,
        message: "Draft is missing required 'name' field",
      });
    }

    // Extract fields using bracket notation (required for index signatures)
    const count = mergedInput["count"] as number | undefined;
    const dataField = (mergedInput["data"] as Record<string, unknown>) || {};

    // If count exists but not in data, add it to data
    const entryData =
      count && !dataField["count"] ? { ...dataField, count } : dataField;

    // Create the entry
    const entryId = randomUUID();
    const now = new Date().toISOString();

    await db.insert(entries).values({
      id: entryId,
      userId,
      name: name,
      emoji: (mergedInput["emoji"] as string) || null,
      category: (mergedInput["category"] as string) || null,
      subcategory: (mergedInput["subcategory"] as string) || null,
      durationSeconds: (mergedInput["durationSeconds"] as number) || null,
      type: (mergedInput["type"] as string) || "log",
      source: "draft",
      data: entryData,
      notes: (mergedInput["notes"] as string) || null,
      timestamp: (mergedInput["timestamp"] as string) || now,
      createdAt: now,
      updatedAt: now,
    });

    // Delete the draft
    await db.delete(entryDrafts).where(eq(entryDrafts.id, draftId));

    logger.debug("Draft committed", { userId, draftId, entryId });

    return {
      entryId,
      draftDeleted: true,
    };
  } catch (error) {
    // Re-throw HTTP errors
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    logger.error("Failed to commit draft", { userId, draftId, error });
    throw createError({
      statusCode: 500,
      message: "Failed to commit draft",
    });
  }
});
