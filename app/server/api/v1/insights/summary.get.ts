/**
 * GET /api/v1/insights/summary
 *
 * Get aggregated summary statistics for a time period
 *
 * User Story 6: Pattern Discovery
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, validationError } from "~/server/utils/response";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and, isNull, gte, lte } from "drizzle-orm";

// Query parameter validation
const summaryQuerySchema = z.object({
  period: z.enum(["today", "week", "month", "year", "custom"]).default("week"),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export default defineEventHandler(async (event) => {
  // Require entries:read permission
  requirePermission(event, "entries:read");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Parse and validate query parameters
  const rawQuery = getQuery(event);
  const parseResult = summaryQuerySchema.safeParse(rawQuery);

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

  const { period, start, end } = parseResult.data;

  try {
    // Calculate date range based on period
    let startDate: Date;
    let endDate: Date = new Date();

    if (period === "custom") {
      if (!start || !end) {
        throw createError(
          apiError(
            event,
            "MISSING_DATES",
            "Start and end dates required for custom period",
            400,
          ),
        );
      }
      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      startDate = new Date();

      switch (period) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "year":
          startDate.setDate(startDate.getDate() - 365);
          break;
      }
    }

    // Fetch entries in date range
    const userEntries = await db.query.entries.findMany({
      where: and(
        eq(entries.userId, userId),
        gte(entries.timestamp, startDate.toISOString()),
        lte(entries.timestamp, endDate.toISOString()),
        isNull(entries.deletedAt),
      ),
    });

    // Aggregate statistics
    const totalEntries = userEntries.length;
    const uniqueCategories = new Set(userEntries.map((e) => e.category).filter(Boolean));
    const uniqueTypes = new Set(userEntries.map((e) => e.type));

    // Calculate total duration
    const totalDurationSeconds = userEntries.reduce(
      (sum, e) => sum + (e.durationSeconds || 0),
      0,
    );
    const totalMinutes = Math.round(totalDurationSeconds / 60);
    const totalHours = Math.round(totalMinutes / 60);

    // Group by type
    const byType: Record<string, number> = {};
    for (const entry of userEntries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
    }

    // Group by category
    const byCategory: Record<string, any> = {};
    for (const entry of userEntries) {
      const cat = entry.category || "uncategorized";
      if (!byCategory[cat]) {
        byCategory[cat] = {
          count: 0,
          totalDuration: 0,
          entries: [],
        };
      }
      byCategory[cat].count++;
      byCategory[cat].totalDuration += entry.durationSeconds || 0;
      byCategory[cat].entries.push(entry.name);
    }

    // Calculate averages
    const avgDurationMinutes =
      totalEntries > 0 ? Math.round(totalMinutes / totalEntries) : 0;

    // Calculate daily average
    const daysDiff =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) || 1;
    const avgEntriesPerDay = (totalEntries / daysDiff).toFixed(1);

    // Calculate category percentages
    const categoryBreakdown = Object.entries(byCategory).map(([category, data]) => ({
      category,
      count: data.count,
      percentage: ((data.count / totalEntries) * 100).toFixed(1),
      totalMinutes: Math.round(data.totalDuration / 60),
      topActivities: [...new Set(data.entries)].slice(0, 3),
    }));

    return success(event, {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalEntries,
        uniqueCategories: uniqueCategories.size,
        uniqueTypes: uniqueTypes.size,
        totalMinutes,
        totalHours,
        avgDurationMinutes,
        avgEntriesPerDay: parseFloat(avgEntriesPerDay),
      },
      byType,
      byCategory: categoryBreakdown,
    });
  } catch (error) {
    // Re-throw if already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Error generating summary:", error);
    throw createError(
      apiError(
        event,
        "SUMMARY_GENERATION_FAILED",
        "Failed to generate summary",
        500,
      ),
    );
  }
});
