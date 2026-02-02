/**
 * POST /api/v1/entries
 *
 * Create a new entry
 *
 * User Story 2: Voice Entry Creation
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { created, apiError, validationError } from "~/server/utils/response";
import { createEntry } from "~/server/services/entries";
import { triggerWebhooks } from "~/server/services/webhooks";
import type { NewEntry } from "~/server/db/schema";

// Base entry schema
const baseEntrySchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  emoji: z.string().optional(),
  timestamp: z.string().datetime(),
  timezone: z.string().default("UTC"),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
  data: z.record(z.any()).optional().default({}),
});

// Type-specific validation
const timedEntrySchema = baseEntrySchema.extend({
  type: z.literal("timed"),
  durationSeconds: z.number().int().positive(),
});

const tadaEntrySchema = baseEntrySchema.extend({
  type: z.literal("tada"),
  name: z.string().min(1), // Required for tada entries
});

const tallyEntrySchema = baseEntrySchema.extend({
  type: z.literal("tally"),
  data: z.object({
    count: z.number().int().positive(),
  }),
});

const momentEntrySchema = baseEntrySchema.extend({
  type: z.literal("moment"),
});

// Union schema for all entry types
const entrySchema = z.discriminatedUnion("type", [
  timedEntrySchema,
  tadaEntrySchema,
  tallyEntrySchema,
  momentEntrySchema,
]);

export default defineEventHandler(async (event) => {
  // Require entries:write permission
  requirePermission(event, "entries:write");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Parse and validate request body
  const body = await readBody(event);
  const parseResult = entrySchema.safeParse(body);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};

    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }

    throw createError(validationError(event, errors));
  }

  const entryData = parseResult.data;

  try {
    // Create new entry with API source
    const newEntry: NewEntry = {
      id: crypto.randomUUID(),
      userId,
      type: entryData.type,
      name: entryData.name,
      category: entryData.category || null,
      subcategory: entryData.subcategory || null,
      emoji: entryData.emoji || null,
      timestamp: entryData.timestamp,
      durationSeconds: "durationSeconds" in entryData ? entryData.durationSeconds : null,
      timezone: entryData.timezone,
      data: entryData.data,
      tags: entryData.tags,
      notes: entryData.notes || null,
      source: "api", // Mark as API-created
      externalId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    // Create entry
    const entry = await createEntry(newEntry);

    // Trigger webhooks for entry.created event (fire and forget)
    triggerWebhooks(userId, "entry.created", {
      id: entry.id,
      type: entry.type,
      name: entry.name,
      category: entry.category,
      timestamp: entry.timestamp,
      durationSeconds: entry.durationSeconds,
    }).catch((error) => {
      console.error("Error triggering webhooks:", error);
      // Don't fail the request if webhook delivery fails
    });

    // Return created response
    return created(event, entry);
  } catch (error) {
    console.error("Error creating entry:", error);
    throw createError(
      apiError(
        event,
        "CREATE_ENTRY_FAILED",
        "Failed to create entry",
        500,
      ),
    );
  }
});
