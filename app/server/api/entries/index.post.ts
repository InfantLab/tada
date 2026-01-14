import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { entries, type NewEntry } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:post");

interface CreateEntryBody {
  type: string;
  name: string;
  timestamp?: string; // THE timeline position - required (defaults to now)
  durationSeconds?: number | null;
  timezone?: string;
  category?: string | null;
  subcategory?: string | null;
  emoji?: string | null;
  data?: Record<string, unknown>;
  tags?: string[];
  notes?: string | null;
  source?: string;
  externalId?: string | null;
}

export default defineEventHandler(async (event) => {
  let body: unknown;
  try {
    body = await readBody(event);

    // Require authentication
    if (!event.context.user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const userId = event.context.user.id;

    // Type guard: ensure body is an object
    if (!body || typeof body !== "object") {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request body",
      });
    }

    const typedBody = body as Partial<CreateEntryBody>;

    logger.debug("Creating entry", { type: typedBody.type, userId });

    // Validate required fields
    if (!typedBody.type || !typedBody.name) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required fields: type and name are required",
      });
    }

    // Prepare entry data
    const now = new Date().toISOString();

    // timestamp is THE canonical timeline field - always set
    // Use provided timestamp, or default to now
    const timestamp = typedBody.timestamp || now;

    const newEntry: NewEntry = {
      id: nanoid(),
      userId,
      type: typedBody.type,
      name: typedBody.name,
      timestamp, // THE timeline position - never null
      durationSeconds: typedBody.durationSeconds || null,
      timezone: typedBody.timezone || "UTC",
      category: typedBody.category || null,
      subcategory: typedBody.subcategory || null,
      emoji: typedBody.emoji || null,
      data: typedBody.data || {},
      tags: typedBody.tags || [],
      notes: typedBody.notes || null,
      source: typedBody.source || "manual",
      externalId: typedBody.externalId || null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    // Insert entry
    await db.insert(entries).values(newEntry);

    // Return created entry
    const [created] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, newEntry.id))
      .limit(1);

    logger.info("Entry created successfully", {
      entryId: newEntry.id,
      type: newEntry.type,
    });
    return created || newEntry;
  } catch (error: unknown) {
    const bodyType =
      body && typeof body === "object" && "type" in body
        ? (body as { type?: unknown }).type
        : undefined;
    logger.error("Failed to create entry", error, { type: bodyType });

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create entry",
      data: { error: message },
    });
  }
});
