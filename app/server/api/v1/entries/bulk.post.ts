/**
 * POST /api/v1/entries/bulk
 *
 * Perform bulk operations on entries (create, update, delete)
 *
 * User Story 2: Voice Entry Creation
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, validationError } from "~/server/utils/response";
import {
  bulkCreateEntries,
  bulkUpdateEntries,
  bulkDeleteEntries,
} from "~/server/services/entries";
import type { NewEntry } from "~/server/db/schema";

// Schema for entry data (same as POST /entries)
const entryDataSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  emoji: z.string().optional(),
  timestamp: z.string().datetime(),
  durationSeconds: z.number().int().positive().optional(),
  timezone: z.string().default("UTC"),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
  data: z.record(z.any()).optional().default({}),
});

// Schema for update data
const updateDataSchema = z.object({
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
});

// Schema for individual operations
const operationSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("create"),
    data: entryDataSchema,
  }),
  z.object({
    operation: z.literal("update"),
    id: z.string().uuid(),
    data: updateDataSchema,
  }),
  z.object({
    operation: z.literal("delete"),
    id: z.string().uuid(),
  }),
]);

// Schema for bulk request
const bulkRequestSchema = z.object({
  operations: z.array(operationSchema).min(1).max(100), // Max 100 operations per request
});

interface OperationResult {
  operation: string;
  id?: string;
  success: boolean;
  error?: string;
}

export default defineEventHandler(async (event) => {
  // Require entries:write permission
  requirePermission(event, "entries:write");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Parse and validate request body
  const body = await readBody(event);
  const parseResult = bulkRequestSchema.safeParse(body);

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

  const { operations } = parseResult.data;

  try {
    const results: OperationResult[] = [];
    let successful = 0;
    let failed = 0;

    // Separate operations by type
    const createOps = operations.filter((op) => op.operation === "create");
    const updateOps = operations.filter((op) => op.operation === "update");
    const deleteOps = operations.filter((op) => op.operation === "delete");

    // Handle create operations
    if (createOps.length > 0) {
      const entries: NewEntry[] = createOps.map((op) => {
        if (op.operation !== "create") throw new Error("Invalid operation");
        const data = op.data;
        return {
          id: crypto.randomUUID(),
          userId,
          type: data.type,
          name: data.name,
          category: data.category || null,
          subcategory: data.subcategory || null,
          emoji: data.emoji || null,
          timestamp: data.timestamp,
          durationSeconds: data.durationSeconds || null,
          timezone: data.timezone,
          data: data.data,
          tags: data.tags,
          notes: data.notes || null,
          source: "api",
          externalId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        };
      });

      const createResult = await bulkCreateEntries(entries);
      successful += createResult.created;
      failed += createResult.failed;

      // Add results for each create operation
      entries.forEach((entry, index) => {
        results.push({
          operation: "create",
          id: entry.id,
          success: index < createResult.created,
          error: index >= createResult.created ? "Creation failed" : undefined,
        });
      });
    }

    // Handle update operations
    if (updateOps.length > 0) {
      const updates = updateOps.map((op) => {
        if (op.operation !== "update") throw new Error("Invalid operation");
        return {
          id: op.id,
          data: op.data,
        };
      });

      const updateResult = await bulkUpdateEntries(userId, updates);
      successful += updateResult.updated;
      failed += updateResult.failed;

      // Add results for each update operation
      updates.forEach((update, index) => {
        results.push({
          operation: "update",
          id: update.id,
          success: index < updateResult.updated,
          error: index >= updateResult.updated ? "Update failed" : undefined,
        });
      });
    }

    // Handle delete operations
    if (deleteOps.length > 0) {
      const ids = deleteOps.map((op) => {
        if (op.operation !== "delete") throw new Error("Invalid operation");
        return op.id;
      });

      const deleteResult = await bulkDeleteEntries(userId, ids);
      successful += deleteResult.deleted;
      failed += deleteResult.failed;

      // Add results for each delete operation
      ids.forEach((id, index) => {
        results.push({
          operation: "delete",
          id,
          success: index < deleteResult.deleted,
          error: index >= deleteResult.deleted ? "Delete failed" : undefined,
        });
      });
    }

    // Return summary and detailed results
    return success(event, {
      summary: {
        total: operations.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error("Error performing bulk operations:", error);
    throw createError(
      apiError(
        event,
        "BULK_OPERATION_FAILED",
        "Failed to perform bulk operations",
        500,
      ),
    );
  }
});
