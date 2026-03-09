/**
 * GET /api/v1/admin/health
 *
 * Detailed system health check for monitoring.
 * Unlike /api/v1/health (public), this returns operational data.
 */

import { requireAdmin } from "~/server/utils/admin";
import { success } from "~/server/utils/response";
import { db } from "~/server/db";
import {
  users,
  entries,
  rhythms,
  sessions,
  apiKeys,
  feedback,
  newsletterSubscribers,
} from "~/server/db/schema";
import { count } from "drizzle-orm";
import { isCloudMode } from "~/server/utils/cloudMode";

// Track server start time
const startTime = Date.now();

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:health");

  // Check database connectivity and get table counts
  let dbStatus = "connected";
  let tables: Record<string, number> = {};

  try {
    const [
      usersCount,
      entriesCount,
      rhythmsCount,
      sessionsCount,
      apiKeysCount,
      feedbackCount,
      newsletterCount,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(entries),
      db.select({ count: count() }).from(rhythms),
      db.select({ count: count() }).from(sessions),
      db.select({ count: count() }).from(apiKeys),
      db.select({ count: count() }).from(feedback),
      db.select({ count: count() }).from(newsletterSubscribers),
    ]);

    tables = {
      users: usersCount[0]?.count ?? 0,
      entries: entriesCount[0]?.count ?? 0,
      rhythms: rhythmsCount[0]?.count ?? 0,
      sessions: sessionsCount[0]?.count ?? 0,
      apiKeys: apiKeysCount[0]?.count ?? 0,
      feedback: feedbackCount[0]?.count ?? 0,
      newsletterSubscribers: newsletterCount[0]?.count ?? 0,
    };
  } catch {
    dbStatus = "error";
  }

  return success(event, {
    status: dbStatus === "connected" ? "healthy" : "degraded",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: {
      status: dbStatus,
      tables,
    },
    cloudMode: isCloudMode(),
    environment: process.env["NODE_ENV"] || "development",
  });
});
