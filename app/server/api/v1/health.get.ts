/**
 * GET /api/v1/health
 *
 * Health check endpoint for monitoring and load balancers
 *
 * Phase 10: Polish & Cross-Cutting Concerns
 */

import { db } from "~/server/db";
import { insightCache } from "~/server/db/schema";
import { sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Check database connection
    await db.execute(sql`SELECT 1`);

    // Get cache statistics
    const cacheStats = await db
      .select({ count: sql<number>`count(*)` })
      .from(insightCache);

    const cacheSize = cacheStats[0]?.count || 0;

    const responseTime = Date.now() - startTime;

    return {
      status: "healthy",
      version: "0.3.1",
      api: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
      cache: {
        size: cacheSize,
        maxSize: 10000, // Soft limit
      },
      responseTime: `${responseTime}ms`,
    };
  } catch (error) {
    setResponseStatus(event, 503);
    return {
      status: "unhealthy",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      database: "disconnected",
    };
  }
});
