/**
 * GET /api/v1/entries
 *
 * List entries with filtering, sorting, and pagination
 *
 * User Story 1: OpenClaw Daily Summary
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { paginated, apiError, validationError } from "~/server/utils/response";
import { getEntries } from "~/server/services/entries";
import type { EntryQueryParams } from "~/types/api";

// Query parameter validation schema
const querySchema = z.object({
  // Date filters
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  start: z.string().datetime().optional(), // ISO 8601
  end: z.string().datetime().optional(), // ISO 8601

  // Field filters
  type: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  search: z.string().optional(),

  // Pagination
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),

  // Sorting
  sort: z.enum(["timestamp", "createdAt", "durationSeconds"]).default("timestamp"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export default defineEventHandler(async (event) => {
  // Require entries:read permission
  requirePermission(event, "entries:read");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Parse and validate query parameters
  const rawQuery = getQuery(event);
  const parseResult = querySchema.safeParse(rawQuery);

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

  const queryParams: EntryQueryParams = parseResult.data;

  try {
    // Get entries from service
    const result = await getEntries(userId, queryParams);

    // Return paginated response
    return paginated(
      event,
      result.entries,
      result.total,
      queryParams.limit,
      queryParams.offset,
    );
  } catch (error) {
    console.error("Error fetching entries:", error);
    throw createError(
      apiError(
        event,
        "FETCH_ENTRIES_FAILED",
        "Failed to fetch entries",
        500,
      ),
    );
  }
});
