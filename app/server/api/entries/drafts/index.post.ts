/**
 * POST /api/entries/drafts
 *
 * Create a new draft entry. Used when user abandons voice/quick entry
 * or when parsed entry needs confirmation.
 *
 * Request body:
 * - input: Partial entry data (required)
 * - parsedFrom: Original transcribed text (optional)
 * - confidence: Parsing confidence 0-1 (optional)
 * - expiresInHours: Hours until draft expires (default: 24, max: 168)
 *
 * Response:
 * - id: Created draft ID
 * - expiresAt: When the draft will be auto-deleted
 */

import { createLogger } from "~/utils/logger";
import { db } from "~/server/db";
import { entryDrafts } from "~/server/db/schema";
import { z } from "zod";
import { randomUUID } from "crypto";

const logger = createLogger("api:entries:drafts:post");

// Request body validation
const createDraftSchema = z.object({
  input: z.record(z.unknown()).refine(
    (obj) => Object.keys(obj).length > 0,
    { message: "Input must not be empty" }
  ),
  parsedFrom: z.string().max(1000).optional(),
  confidence: z.number().min(0).max(1).optional(),
  expiresInHours: z.number().min(1).max(168).default(24),
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

  // Parse request body
  const body = await readBody(event);
  const validation = createDraftSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid request: ${validation.error.issues[0]?.message}`,
    });
  }

  const { input, parsedFrom, confidence, expiresInHours } = validation.data;

  logger.debug("Creating draft", { userId, hasInput: !!input, parsedFrom: !!parsedFrom });

  try {
    const id = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    await db.insert(entryDrafts).values({
      id,
      userId,
      input,
      parsedFrom: parsedFrom ?? null,
      confidence: confidence ? Math.round(confidence * 100) : null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    logger.debug("Draft created", { userId, draftId: id, expiresAt: expiresAt.toISOString() });

    return {
      id,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    logger.error("Failed to create draft", { userId, error });
    throw createError({
      statusCode: 500,
      message: "Failed to create draft",
    });
  }
});
