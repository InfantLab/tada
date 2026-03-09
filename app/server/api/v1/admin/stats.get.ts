/**
 * GET /api/v1/admin/stats
 *
 * Site-wide statistics for dashboards and weekly reports.
 * Replaces the shell-script approach to gathering stats.
 */

import { z } from "zod";
import { requireAdmin } from "~/server/utils/admin";
import { success, validationError } from "~/server/utils/response";
import { getAdminStats } from "~/server/services/admin-stats";
import { logAuthEvent } from "~/server/utils/authEvents";

const querySchema = z.object({
  period: z.enum(["24h", "7d", "30d", "90d", "all"]).default("7d"),
});

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:stats");

  const rawQuery = getQuery(event);
  const parseResult = querySchema.safeParse(rawQuery);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    throw createError(validationError(event, errors));
  }

  const { period } = parseResult.data;
  const auth = event.context.auth!;

  await logAuthEvent({
    event,
    userId: auth.userId,
    eventType: "admin:stats_accessed",
    metadata: { period },
  });

  const stats = await getAdminStats(period);
  return success(event, stats);
});
