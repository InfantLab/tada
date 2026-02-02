/**
 * PATCH /api/v1/entries/[id]
 *
 * Update an existing entry (partial update)
 *
 * User Story 2: Voice Entry Creation
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, notFound, validationError } from "~/server/utils/response";
import { updateEntry } from "~/server/services/entries";
import { triggerWebhooks } from "~/server/services/webhooks";

// Schema for partial updates (all fields optional except what's not updatable)
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  emoji: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  durationSeconds: z.number().int().positive().optional(),
  timezone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  data: z.record(z.any()).optional(),
}).strict(); // Reject unknown fields

export default defineEventHandler(async (event) => {
  // Require entries:write permission
  requirePermission(event, "entries:write");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Get entry ID from route params
  const entryId = getRouterParam(event, "id");

  if (!entryId) {
    throw createError(
      apiError(event, "INVALID_ID", "Entry ID is required", 400),
    );
  }

  // Parse and validate request body
  const body = await readBody(event);
  const parseResult = updateSchema.safeParse(body);

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

  const updates = parseResult.data;

  try {
    // Update entry
    const entry = await updateEntry(entryId, userId, updates);

    if (!entry) {
      throw createError(notFound(event, "Entry"));
    }

    // Trigger webhooks for entry.updated event (fire and forget)
    triggerWebhooks(userId, "entry.updated", {
      id: entry.id,
      type: entry.type,
      name: entry.name,
      category: entry.category,
      timestamp: entry.timestamp,
      updates,
    }).catch((error) => {
      console.error("Error triggering webhooks:", error);
    });

    // Return success response
    return success(event, entry, { updated: true });
  } catch (error) {
    // Re-throw if already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Error updating entry:", error);
    throw createError(
      apiError(
        event,
        "UPDATE_ENTRY_FAILED",
        "Failed to update entry",
        500,
      ),
    );
  }
});
