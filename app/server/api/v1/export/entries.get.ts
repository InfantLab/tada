/**
 * GET /api/v1/export/entries
 *
 * Export entries in multiple formats (JSON, CSV, Markdown)
 *
 * User Story 5: Obsidian Export
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { apiError, validationError } from "~/server/utils/response";
import { getEntries } from "~/server/services/entries";
import { toJSON, toCSV, toMarkdown } from "~/server/services/export";
import type { EntryQueryParams } from "~/types/api";

// Query parameter validation
const exportQuerySchema = z.object({
  // Date filters
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),

  // Field filters
  type: z.string().optional(),
  category: z.string().optional(),

  // Format
  format: z.enum(["json", "csv", "markdown"]).default("json"),

  // Options
  include: z.string().optional(), // comma-separated: rhythms,insights,summary
});

export default defineEventHandler(async (event) => {
  // Require export:read permission
  requirePermission(event, "export:read");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Parse and validate query parameters
  const rawQuery = getQuery(event);
  const parseResult = exportQuerySchema.safeParse(rawQuery);

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

  const { format, date, start, end, type, category } = parseResult.data;

  try {
    // Build query params for getEntries
    const queryParams: EntryQueryParams = {
      date,
      start,
      end,
      type,
      category,
      limit: 10000, // Export can handle large datasets
      offset: 0,
      sort: "timestamp",
      order: "desc",
    };

    // Get entries
    const result = await getEntries(userId, queryParams);

    // Set appropriate Content-Type header
    if (format === "json") {
      setResponseHeader(event, "Content-Type", "application/json");
      return toJSON(result.entries);
    } else if (format === "csv") {
      setResponseHeader(event, "Content-Type", "text/csv");
      setResponseHeader(
        event,
        "Content-Disposition",
        `attachment; filename="entries-${date || "export"}.csv"`,
      );
      return toCSV(result.entries);
    } else if (format === "markdown") {
      setResponseHeader(event, "Content-Type", "text/markdown");
      return toMarkdown(result.entries);
    }

    throw new Error("Invalid format");
  } catch (error) {
    // Re-throw if already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Error exporting entries:", error);
    throw createError(
      apiError(
        event,
        "EXPORT_FAILED",
        "Failed to export entries",
        500,
      ),
    );
  }
});
