/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and deployment.
 * Returns service status, version, and database connectivity.
 *
 * This endpoint is public (no authentication required).
 */

import { sql } from "drizzle-orm";
import { db } from "~/server/db";
import { isCloudMode, isBillingEnabled } from "~/server/utils/cloudMode";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const startTime = Date.now();

  // Check database connectivity
  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs: number | null = null;

  try {
    const dbStart = Date.now();
    await db.run(sql`SELECT 1`);
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = "error";
  }

  // Overall status
  const status = dbStatus === "ok" ? "ok" : "degraded";

  // Response
  const response = {
    status,
    timestamp: new Date().toISOString(),
    version: (config.public as { appVersion?: string }).appVersion || "unknown",
    uptime: process.uptime(),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    },
    environment: {
      cloudMode: isCloudMode(),
      billingEnabled: isBillingEnabled(),
    },
    responseTimeMs: Date.now() - startTime,
  };

  // Set appropriate status code
  if (status !== "ok") {
    setResponseStatus(event, 503);
  }

  return response;
});
