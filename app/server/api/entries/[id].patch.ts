import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:patch");

interface UpdateEntryBody {
  type?: string;
  name?: string;
  timestamp?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  date?: string | null;
  timezone?: string;
  data?: Record<string, unknown>;
  tags?: string[];
  notes?: string | null;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  try {
    const userId = "default-user"; // TODO: Get from auth context once Lucia is implemented

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Entry ID is required",
      });
    }

    const body = await readBody(event) as UpdateEntryBody;

    // Check if entry exists and belongs to user
    const [existing] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .limit(1);

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Entry not found",
      });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    // Only update provided fields
    if (body.type !== undefined) updateData["type"] = body.type;
    if (body.name !== undefined) updateData["name"] = body.name;
    if (body.timestamp !== undefined) updateData["timestamp"] = body.timestamp;
    if (body.startedAt !== undefined) updateData["startedAt"] = body.startedAt;
    if (body.endedAt !== undefined) updateData["endedAt"] = body.endedAt;
    if (body.durationSeconds !== undefined)
      updateData["durationSeconds"] = body.durationSeconds;
    if (body.date !== undefined) updateData["date"] = body.date;
    if (body.timezone !== undefined) updateData["timezone"] = body.timezone;
    if (body.data !== undefined) updateData["data"] = body.data;
    if (body.tags !== undefined) updateData["tags"] = body.tags;
    if (body.notes !== undefined) updateData["notes"] = body.notes;

    logger.debug("Updating entry", { id, fields: Object.keys(updateData) });

    // Update entry
    await db
      .update(entries)
      .set(updateData)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)));

    // Return updated entry
    const [updated] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, id))
      .limit(1);

    logger.info("Entry updated successfully", { id });
    return updated;
  } catch (error: unknown) {
    logger.error("Failed to update entry", error, { id });

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update entry",
      data: { error: message },
    });
  }
});
