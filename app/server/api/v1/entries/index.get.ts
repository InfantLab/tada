/**
 * GET /api/v1/entries
 *
 * List entries with filtering, sorting, and pagination
 *
 * User Story 1: OpenClaw Daily Summary
 */

import * as z from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { paginated, apiError, validationError } from "~/server/utils/response";
import { getEntries } from "~/server/services/entries";
import { computeContentHash } from "~/server/utils/contentHash";
import { createLogger } from "~/server/utils/logger";
import type { EntryQueryParams } from "~/types/api";

const logger = createLogger("api:v1:entries:list");

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

  // Sync filters
  updated_since: z.string().datetime().optional(), // ISO 8601 - entries changed after this
  include_deleted: z.preprocess(
    (v) => v === "true" || v === "1" || v === true,
    z.boolean().optional(),
  ),

  // Pagination
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),

  // Sorting
  sort: z.enum(["timestamp", "createdAt", "updatedAt", "durationSeconds"]).default("timestamp"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export default defineEventHandler(async (event) => {
  // Require entries:read permission
  requirePermission(event, "entries:read");

  const auth = event.context['auth']!;
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

    // Add contentHash to each entry for sync change detection
    const entriesWithHash = result.entries.map((entry) => ({
      ...entry,
      contentHash: computeContentHash(entry),
    }));

    // Return paginated response
    return paginated(
      event,
      entriesWithHash,
      result.total,
      queryParams.limit ?? 100,
      queryParams.offset ?? 0,
    );
  } catch (error) {
    logger.error("Error fetching entries", error instanceof Error ? error : new Error(String(error)), { userId: event.context.user?.id, requestId: event.context.requestId });
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
