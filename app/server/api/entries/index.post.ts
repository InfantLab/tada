import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { entries, type NewEntry } from "~/server/db/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
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
  resolution?: "allow-both" | "replace"; // Conflict resolution strategy
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

    // Handle conflict resolution for timed entries
    if (
      typedBody.resolution === "replace" &&
      typedBody.type === "timed" &&
      typedBody.durationSeconds &&
      typedBody.durationSeconds > 0
    ) {
      // Find and soft-delete overlapping entries
      const newStart = new Date(timestamp);
      const newEnd = new Date(
        newStart.getTime() + typedBody.durationSeconds * 1000,
      );

      // Fetch entries within a reasonable time window
      const windowStart = new Date(newStart.getTime() - 24 * 60 * 60 * 1000);
      const windowEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000);

      const potentialOverlaps = await db
        .select({
          id: entries.id,
          timestamp: entries.timestamp,
          durationSeconds: entries.durationSeconds,
        })
        .from(entries)
        .where(
          and(
            eq(entries.userId, userId),
            eq(entries.type, "timed"),
            isNull(entries.deletedAt),
            gte(entries.timestamp, windowStart.toISOString()),
            lte(entries.timestamp, windowEnd.toISOString()),
          ),
        );

      // Check each entry for actual overlap and soft-delete
      for (const existing of potentialOverlaps) {
        if (!existing.durationSeconds || existing.durationSeconds <= 0) {
          continue;
        }

        const existingStart = new Date(existing.timestamp);
        const existingEnd = new Date(
          existingStart.getTime() + existing.durationSeconds * 1000,
        );

        // Check for overlap
        const overlaps = newStart < existingEnd && newEnd > existingStart;

        if (overlaps) {
          // Soft-delete the overlapping entry
          await db
            .update(entries)
            .set({ deletedAt: now })
            .where(eq(entries.id, existing.id));

          logger.info("Replaced overlapping entry", {
            replacedId: existing.id,
            newEntryTimestamp: timestamp,
          });
        }
      }
    }

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
    const bodyName =
      body && typeof body === "object" && "name" in body
        ? (body as { name?: unknown }).name
        : undefined;
    logger.error("Failed to create entry", error, {
      type: bodyType,
      name: bodyName,
    });

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create entry: ${message}`,
      data: { error: message, type: bodyType, name: bodyName },
    });
  }
});
