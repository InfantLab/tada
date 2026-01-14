import { defineEventHandler, getQuery, createError } from "h3";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and, isNull, sql, gte, lte } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:entries:summary");

type Period = "year" | "month" | "week";

interface PeriodSummary {
  label: string;
  period: string; // YYYY, YYYY-MM, or YYYY-Www
  entryCount: number;
  totalSeconds: number;
  totalHours: number;
}

interface SummaryResponse {
  periods: PeriodSummary[];
  totals: {
    entryCount: number;
    totalSeconds: number;
    totalHours: number;
  };
}

export default defineEventHandler(async (event): Promise<SummaryResponse> => {
  try {
    // Get authenticated user from context
    const user = event.context.user;
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const query = getQuery(event);
    const userId = user.id;
    const period = (query["period"] as Period) || "month";
    const year = query["year"] as string | undefined;

    logger.debug("Fetching entry summary", { userId, period, year });

    // timestamp is THE canonical timeline field - always set, never null

    // Build grouping expression based on period
    let groupExpr;
    let labelExpr;

    switch (period) {
      case "year":
        groupExpr = sql`strftime('%Y', ${entries.timestamp})`;
        labelExpr = sql`strftime('%Y', ${entries.timestamp})`;
        break;
      case "week":
        // ISO week: YYYY-Www
        groupExpr = sql`strftime('%Y-W%W', ${entries.timestamp})`;
        labelExpr = sql`strftime('%Y-W%W', ${entries.timestamp})`;
        break;
      case "month":
      default:
        groupExpr = sql`strftime('%Y-%m', ${entries.timestamp})`;
        labelExpr = sql`strftime('%Y-%m', ${entries.timestamp})`;
        break;
    }

    // Build conditions
    const conditions = [eq(entries.userId, userId), isNull(entries.deletedAt)];

    // Filter by year if provided
    if (year) {
      conditions.push(gte(entries.timestamp, `${year}-01-01`));
      conditions.push(lte(entries.timestamp, `${year}-12-31T23:59:59`));
    }

    // Get aggregated stats grouped by period
    const periodStats = await db
      .select({
        period: groupExpr,
        label: labelExpr,
        entryCount: sql<number>`COUNT(*)`,
        totalSeconds: sql<number>`COALESCE(SUM(${entries.durationSeconds}), 0)`,
      })
      .from(entries)
      .where(and(...conditions))
      .groupBy(groupExpr)
      .orderBy(sql`${groupExpr} DESC`);

    // Get overall totals
    const totalsResult = await db
      .select({
        entryCount: sql<number>`COUNT(*)`,
        totalSeconds: sql<number>`COALESCE(SUM(${entries.durationSeconds}), 0)`,
      })
      .from(entries)
      .where(and(...conditions));

    // Format period labels for display, filtering out null/empty periods
    const periods: PeriodSummary[] = periodStats
      .filter((row) => row.period && row.label && String(row.period) !== "null")
      .map((row) => {
        let label = String(row.label);

        // Convert YYYY-MM to "Month YYYY"
        if (period === "month" && label.match(/^\d{4}-\d{2}$/)) {
          const parts = label.split("-");
          const y = parts[0] ?? "1970";
          const m = parts[1] ?? "01";
          const date = new Date(parseInt(y), parseInt(m) - 1, 1);
          label = date.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
        }

        // Convert YYYY-Www to "Week X, YYYY"
        if (period === "week" && label.match(/^\d{4}-W\d{2}$/)) {
          const parts = label.split("-W");
          const y = parts[0] ?? "1970";
          const w = parts[1] ?? "01";
          label = `Week ${parseInt(w)}, ${y}`;
        }

        return {
          period: String(row.period),
          label,
          entryCount: row.entryCount,
          totalSeconds: row.totalSeconds,
          totalHours: Math.round((row.totalSeconds / 3600) * 10) / 10,
        };
      });

    const totalSeconds = totalsResult[0]?.totalSeconds || 0;

    const response: SummaryResponse = {
      periods,
      totals: {
        entryCount: totalsResult[0]?.entryCount || 0,
        totalSeconds,
        totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
      },
    };

    logger.info("Entry summary fetched successfully", {
      periodCount: periods.length,
      totals: response.totals,
    });

    return response;
  } catch (error: unknown) {
    logger.error("Failed to fetch entry summary", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch entry summary",
      data: { error: message },
    });
  }
});
