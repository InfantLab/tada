/**
 * GET /api/v1/export/obsidian
 *
 * Export entries in Obsidian format with YAML frontmatter
 *
 * User Story 5: Obsidian Export
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { apiError, validationError } from "~/server/utils/response";
import { getEntries } from "~/server/services/entries";
import {
  toObsidianDaily,
  toObsidianWeekly,
  toObsidianMonthly,
} from "~/server/services/export";
import type { EntryQueryParams } from "~/types/api";

// Query parameter validation
const obsidianQuerySchema = z.object({
  // Date filter (for daily template)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  // Date range (for weekly template)
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),

  // Month (for monthly template)
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // YYYY-MM

  // Template type
  template: z.enum(["daily", "weekly", "monthly"]).default("daily"),

  // Optional sections filter
  sections: z.string().optional(), // comma-separated
});

export default defineEventHandler(async (event) => {
  // Require export:read permission
  requirePermission(event, "export:read");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Parse and validate query parameters
  const rawQuery = getQuery(event);
  const parseResult = obsidianQuerySchema.safeParse(rawQuery);

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

  const { template, date, start, end, month } = parseResult.data;

  try {
    // Set Content-Type header
    setResponseHeader(event, "Content-Type", "text/markdown; charset=utf-8");

    // Build query based on template type
    let queryParams: EntryQueryParams;
    let markdown: string;

    if (template === "daily") {
      if (!date) {
        throw createError(
          apiError(
            event,
            "DATE_REQUIRED",
            "Date parameter required for daily template",
            400,
          ),
        );
      }

      queryParams = {
        date,
        limit: 1000,
        offset: 0,
        sort: "timestamp",
        order: "asc",
      };

      const result = await getEntries(userId, queryParams);
      markdown = toObsidianDaily(result.entries, date);
    } else if (template === "weekly") {
      if (!start || !end) {
        throw createError(
          apiError(
            event,
            "DATE_RANGE_REQUIRED",
            "Start and end parameters required for weekly template",
            400,
          ),
        );
      }

      queryParams = {
        start,
        end,
        limit: 1000,
        offset: 0,
        sort: "timestamp",
        order: "asc",
      };

      const result = await getEntries(userId, queryParams);
      markdown = toObsidianWeekly(result.entries, start.split("T")[0], end.split("T")[0]);
    } else if (template === "monthly") {
      if (!month) {
        throw createError(
          apiError(
            event,
            "MONTH_REQUIRED",
            "Month parameter required for monthly template (YYYY-MM)",
            400,
          ),
        );
      }

      // Calculate start and end of month
      const startOfMonth = `${month}-01T00:00:00.000Z`;
      const endOfMonth = new Date(
        new Date(month).getFullYear(),
        new Date(month).getMonth() + 1,
        0,
      ).toISOString();

      queryParams = {
        start: startOfMonth,
        end: endOfMonth,
        limit: 1000,
        offset: 0,
        sort: "timestamp",
        order: "asc",
      };

      const result = await getEntries(userId, queryParams);
      markdown = toObsidianMonthly(result.entries, month);
    } else {
      throw new Error("Invalid template type");
    }

    // Return markdown content
    return markdown;
  } catch (error) {
    // Re-throw if already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Error exporting to Obsidian:", error);
    throw createError(
      apiError(
        event,
        "OBSIDIAN_EXPORT_FAILED",
        "Failed to export to Obsidian format",
        500,
      ),
    );
  }
});
