/**
 * GET /api/v1/sync/status
 *
 * Returns sync status: server time, entry counts, per-provider stats.
 */

import { sql, eq, and } from "drizzle-orm";
import { requirePermission } from "~/server/utils/permissions";
import { success } from "~/server/utils/response";
import { db } from "~/server/db";
import { entries, syncMappings } from "~/server/db/schema";
import { withRetry } from "~/server/db/operations";
import { getRegisteredSyncProviders } from "~/registry/syncProviders";

export default defineEventHandler(async (event) => {
  requirePermission(event, "entries:read");

  const auth = event.context['auth']!;
  const userId = auth.userId;

  // Entry counts
  const [countResult] = await withRetry(() =>
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${entries.deletedAt} is null then 1 else 0 end)`,
        deleted: sql<number>`sum(case when ${entries.deletedAt} is not null then 1 else 0 end)`,
      })
      .from(entries)
      .where(eq(entries.userId, userId)),
  );

  // Last modified timestamp
  const [lastModResult] = await withRetry(() =>
    db
      .select({ lastModified: sql<string>`MAX(${entries.updatedAt})` })
      .from(entries)
      .where(eq(entries.userId, userId)),
  );

  // Per-provider stats
  const registeredProviders = getRegisteredSyncProviders();
  const providers: Record<string, { lastSyncedAt: string | null; mappedEntries: number }> = {};

  for (const [providerId] of registeredProviders) {
    const [providerStats] = await withRetry(() =>
      db
        .select({
          count: sql<number>`count(*)`,
          lastSync: sql<string>`MAX(${syncMappings.lastSyncedAt})`,
        })
        .from(syncMappings)
        .where(
          and(
            eq(syncMappings.userId, userId),
            eq(syncMappings.provider, providerId),
          ),
        ),
    );

    if (providerStats && providerStats.count > 0) {
      providers[providerId] = {
        lastSyncedAt: providerStats.lastSync || null,
        mappedEntries: providerStats.count,
      };
    }
  }

  return success(event, {
    serverTime: new Date().toISOString(),
    counts: {
      total: countResult?.total || 0,
      active: countResult?.active || 0,
      deleted: countResult?.deleted || 0,
    },
    lastModified: lastModResult?.lastModified || null,
    providers,
  });
});
