import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { entries, type NewEntry } from "~/server/db/schema";
import { nanoid } from "nanoid";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:post");

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const userId = "default-user"; // TODO: Get from auth context once Lucia is implemented
    
    logger.debug("Creating entry", { type: body.type, userId });

    // Validate required fields
    if (!body.type || !body.name) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required fields: type and name are required",
      });
    }

    // Prepare entry data
    const now = new Date().toISOString();
    const newEntry: NewEntry = {
      id: nanoid(),
      userId,
      type: body.type,
      name: body.name,
      timestamp: body.timestamp || now,
      startedAt: body.startedAt || null,
      endedAt: body.endedAt || null,
      durationSeconds: body.durationSeconds || null,
      date: body.date || null,
      timezone: body.timezone || "UTC",
      data: body.data || {},
      tags: body.tags || [],
      notes: body.notes || null,
      source: body.source || "manual",
      externalId: body.externalId || null,
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

    logger.info("Entry created successfully", { entryId: newEntry.id, type: newEntry.type });
    return created || newEntry;
  } catch (error: unknown) {
    logger.error("Failed to create entry", error, { type: body?.type });

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
