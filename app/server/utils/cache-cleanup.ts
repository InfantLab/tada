/**
 * Cache Cleanup Utility
 *
 * Removes expired entries from the insight cache
 *
 * Phase 10: Polish & Cross-Cutting Concerns
 */

import { db } from "~/server/db";
import { insightCache } from "~/server/db/schema";
import { lt, sql } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("cache-cleanup");

const CACHE_TTL_HOURS = 1;

/**
 * Clean up expired cache entries
 * Should be run periodically (e.g., via cron job)
 */
export async function cleanupExpiredCache(): Promise<{
  deleted: number;
  success: boolean;
}> {
  try {
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() - CACHE_TTL_HOURS);

    const result = await db
      .delete(insightCache)
      .where(lt(insightCache.computedAt, expiryTime.toISOString()));

    const deletedCount = result.rowsAffected || 0;

    logger.info("Deleted expired cache entries", { deleted: deletedCount });

    return {
      deleted: deletedCount,
      success: true,
    };
  } catch (error) {
    logger.error("Failed to clean up expired cache", error);
    return {
      deleted: 0,
      success: false,
    };
  }
}

/**
 * Clean up cache entries older than a specific number of days
 * Useful for maintenance
 */
export async function cleanupOldCache(days: number): Promise<{
  deleted: number;
  success: boolean;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .delete(insightCache)
      .where(lt(insightCache.computedAt, cutoffDate.toISOString()));

    const deletedCount = result.rowsAffected || 0;

    logger.info("Deleted old cache entries", { deleted: deletedCount, olderThanDays: days });

    return {
      deleted: deletedCount,
      success: true,
    };
  } catch (error) {
    logger.error("Failed to clean up old cache", error, { olderThanDays: days });
    return {
      deleted: 0,
      success: false,
    };
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  total: number;
  expired: number;
  active: number;
}> {
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() - CACHE_TTL_HOURS);

  const [totalResult, expiredResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(insightCache),
    db
      .select({ count: sql<number>`count(*)` })
      .from(insightCache)
      .where(lt(insightCache.computedAt, expiryTime.toISOString())),
  ]);

  const total = totalResult[0]?.count || 0;
  const expired = expiredResult[0]?.count || 0;

  return {
    total,
    expired,
    active: total - expired,
  };
}
