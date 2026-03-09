/**
 * Sync Mappings Service
 *
 * CRUD operations for the sync_mappings table.
 * Used by the sync engine to track which entries are linked
 * to which external items per provider.
 */

import { eq, and, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { syncMappings } from "~/server/db/schema";
import { withRetry } from "~/server/db/operations";
import type { SyncMapping, NewSyncMapping } from "~/server/db/schema";

/**
 * Get all sync mappings for a user and provider.
 */
export async function getMappingsByProvider(
  userId: string,
  provider: string,
): Promise<SyncMapping[]> {
  return await withRetry(() =>
    db
      .select()
      .from(syncMappings)
      .where(
        and(
          eq(syncMappings.userId, userId),
          eq(syncMappings.provider, provider),
        ),
      ),
  );
}

/**
 * Look up a mapping by external ID (used during pull phase).
 */
export async function getMappingByExternalId(
  userId: string,
  provider: string,
  externalId: string,
): Promise<SyncMapping | null> {
  const result = await withRetry(() =>
    db.query.syncMappings.findFirst({
      where: and(
        eq(syncMappings.userId, userId),
        eq(syncMappings.provider, provider),
        eq(syncMappings.externalId, externalId),
      ),
    }),
  );
  return result || null;
}

/**
 * Look up a mapping by entry ID (used during push phase).
 */
export async function getMappingByEntryId(
  userId: string,
  provider: string,
  entryId: string,
): Promise<SyncMapping | null> {
  const result = await withRetry(() =>
    db.query.syncMappings.findFirst({
      where: and(
        eq(syncMappings.userId, userId),
        eq(syncMappings.provider, provider),
        eq(syncMappings.entryId, entryId),
      ),
    }),
  );
  return result || null;
}

/**
 * Get all mappings for a specific entry (across all providers).
 */
export async function getMappingsForEntry(
  userId: string,
  entryId: string,
): Promise<SyncMapping[]> {
  return await withRetry(() =>
    db
      .select()
      .from(syncMappings)
      .where(
        and(
          eq(syncMappings.userId, userId),
          eq(syncMappings.entryId, entryId),
        ),
      ),
  );
}

/**
 * Create a new sync mapping.
 */
export async function createMapping(
  data: NewSyncMapping,
): Promise<SyncMapping> {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const mappingData: NewSyncMapping = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await withRetry(() => db.insert(syncMappings).values(mappingData));

  const created = await withRetry(() =>
    db.query.syncMappings.findFirst({
      where: eq(syncMappings.id, id),
    }),
  );

  if (!created) {
    throw new Error("Failed to create sync mapping");
  }

  return created;
}

/**
 * Update an existing sync mapping.
 */
export async function updateMapping(
  id: string,
  updates: Partial<Pick<SyncMapping, "externalId" | "externalHash" | "internalHash" | "lastSyncedAt" | "lastSyncDirection" | "metadata">>,
): Promise<SyncMapping | null> {
  const now = new Date().toISOString();

  await withRetry(() =>
    db
      .update(syncMappings)
      .set({ ...updates, updatedAt: now })
      .where(eq(syncMappings.id, id)),
  );

  const updated = await withRetry(() =>
    db.query.syncMappings.findFirst({
      where: eq(syncMappings.id, id),
    }),
  );

  return updated || null;
}

/**
 * Delete a sync mapping (unlinking, not deleting the entry).
 */
export async function deleteMapping(id: string): Promise<void> {
  await withRetry(() =>
    db.delete(syncMappings).where(eq(syncMappings.id, id)),
  );
}

/**
 * Get the most recent lastSyncedAt timestamp for a user+provider.
 * Returns null if no mappings exist (first sync).
 */
export async function getLastSyncTimestamp(
  userId: string,
  provider: string,
): Promise<Date | null> {
  const result = await withRetry(() =>
    db
      .select({ maxSync: sql<string>`MAX(${syncMappings.lastSyncedAt})` })
      .from(syncMappings)
      .where(
        and(
          eq(syncMappings.userId, userId),
          eq(syncMappings.provider, provider),
        ),
      ),
  );

  const maxSync = result[0]?.maxSync;
  return maxSync ? new Date(maxSync) : null;
}

/**
 * Count mappings for a user+provider.
 */
export async function countMappings(
  userId: string,
  provider: string,
): Promise<number> {
  const result = await withRetry(() =>
    db
      .select({ count: sql<number>`count(*)` })
      .from(syncMappings)
      .where(
        and(
          eq(syncMappings.userId, userId),
          eq(syncMappings.provider, provider),
        ),
      ),
  );

  return result[0]?.count || 0;
}
