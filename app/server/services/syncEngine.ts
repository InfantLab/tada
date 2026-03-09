/**
 * Sync Engine
 *
 * Provider-agnostic orchestration for pull/push sync cycles.
 * Coordinates between sync providers, the entries service,
 * and the sync mappings service.
 */

import { getSyncProvider } from "~/registry/syncProviders";
import { computeContentHash } from "~/server/utils/contentHash";
import { createEntry, getEntries, updateEntry, deleteEntry } from "~/server/services/entries";
import {
  getMappingByExternalId,
  getMappingByEntryId,
  getMappingsByProvider,
  createMapping,
  updateMapping,
  getLastSyncTimestamp,
} from "~/server/services/syncMappings";
import type { SyncRunSummary, ExternalChange, EntryWithMapping, SyncDirection } from "~/types/syncProvider";
import type { NewEntry } from "~/server/db/schema";

interface SyncOptions {
  direction?: "pull" | "push" | "both";
  dryRun?: boolean;
}

/**
 * Run a full sync cycle for a provider.
 */
export async function runSync(
  userId: string,
  providerId: string,
  options: SyncOptions = {},
): Promise<SyncRunSummary> {
  const provider = getSyncProvider(providerId);
  if (!provider) {
    throw new Error(`Sync provider "${providerId}" not found in registry`);
  }

  const startedAt = new Date().toISOString();
  const lastSync = await getLastSyncTimestamp(userId, providerId);

  // Determine effective direction
  const providerDirection = provider.direction;
  const requestedDirection = options.direction || "both";
  const doPull =
    (providerDirection === "ingest" || providerDirection === "bidirectional") &&
    (requestedDirection === "pull" || requestedDirection === "both");
  const doPush =
    (providerDirection === "export" || providerDirection === "bidirectional") &&
    (requestedDirection === "push" || requestedDirection === "both");

  const summary: SyncRunSummary = {
    provider: providerId,
    direction: providerDirection,
    startedAt,
    completedAt: "",
    pulled: { created: 0, updated: 0, deleted: 0, skipped: 0 },
    pushed: { created: 0, updated: 0, deleted: 0, skipped: 0 },
    conflicts: 0,
    errors: [],
  };

  try {
    if (doPull) {
      await pullFromProvider(userId, provider.id, provider, lastSync, summary, options.dryRun);
    }

    if (doPush && provider.pushChanges) {
      await pushToProvider(userId, provider.id, provider, lastSync, summary, options.dryRun);
    }
  } catch (error) {
    summary.errors.push({
      message: error instanceof Error ? error.message : String(error),
    });
  }

  summary.completedAt = new Date().toISOString();
  return summary;
}

/**
 * Pull phase: fetch changes from external system and apply to Ta-Da!.
 */
async function pullFromProvider(
  userId: string,
  providerId: string,
  provider: { fetchChanges: (since: Date | null) => Promise<ExternalChange[]> },
  lastSync: Date | null,
  summary: SyncRunSummary,
  dryRun?: boolean,
): Promise<void> {
  const changes = await provider.fetchChanges(lastSync);
  const now = new Date().toISOString();

  for (const change of changes) {
    try {
      const existingMapping = await getMappingByExternalId(
        userId,
        providerId,
        change.externalId,
      );

      if (change.action === "delete") {
        if (existingMapping) {
          if (!dryRun) {
            await deleteEntry(existingMapping.entryId, userId);
            await updateMapping(existingMapping.id, {
              lastSyncedAt: now,
              lastSyncDirection: "pull",
            });
          }
          summary.pulled.deleted++;
        } else {
          summary.pulled.skipped++;
        }
        continue;
      }

      if (!change.data) {
        summary.pulled.skipped++;
        continue;
      }

      if (change.action === "create" && !existingMapping) {
        // New item from external system
        if (!dryRun) {
          const entryData: NewEntry = {
            userId,
            type: change.data.type,
            name: change.data.name,
            category: change.data.category || null,
            subcategory: change.data.subcategory || null,
            emoji: change.data.emoji || null,
            timestamp: change.data.timestamp,
            durationSeconds: change.data.durationSeconds || null,
            notes: change.data.notes || null,
            tags: change.data.tags || [],
            source: change.data.source || providerId,
            externalId: change.data.externalId || change.externalId,
            data: change.data.data || null,
            timezone: "UTC",
          };

          const created = await createEntry(entryData);
          const internalHash = computeContentHash(created);

          await createMapping({
            userId,
            entryId: created.id,
            provider: providerId,
            externalId: change.externalId,
            externalHash: change.externalHash || null,
            internalHash,
            lastSyncedAt: now,
            lastSyncDirection: "pull",
          });
        }
        summary.pulled.created++;
      } else if (existingMapping) {
        // Existing item — check for changes
        const externalChanged =
          change.externalHash !== existingMapping.externalHash;

        if (!externalChanged) {
          summary.pulled.skipped++;
          continue;
        }

        // Check if internal entry also changed (conflict detection)
        const currentEntries = await getEntries(userId, {
          search: existingMapping.entryId,
          limit: 1,
        });

        if (currentEntries.entries.length === 0) {
          summary.pulled.skipped++;
          continue;
        }

        const currentEntry = currentEntries.entries[0]!;
        const currentInternalHash = computeContentHash(currentEntry);
        const internalChanged = currentInternalHash !== existingMapping.internalHash;

        if (internalChanged && externalChanged) {
          // Conflict: both sides changed — last-write-wins
          summary.conflicts++;
          const externalTs = change.externalTimestamp
            ? new Date(change.externalTimestamp)
            : new Date();
          const internalTs = new Date(currentEntry.updatedAt);

          if (externalTs <= internalTs) {
            // Internal wins — skip external change
            if (!dryRun) {
              await updateMapping(existingMapping.id, {
                externalHash: change.externalHash || null,
                lastSyncedAt: now,
                lastSyncDirection: "pull",
              });
            }
            summary.pulled.skipped++;
            continue;
          }
          // External wins — fall through to update
        }

        // Apply external change
        if (!dryRun) {
          await updateEntry(existingMapping.entryId, userId, {
            name: change.data.name,
            type: change.data.type,
            category: change.data.category || null,
            subcategory: change.data.subcategory || null,
            timestamp: change.data.timestamp,
            durationSeconds: change.data.durationSeconds || null,
            notes: change.data.notes || null,
            tags: change.data.tags || [],
            data: change.data.data || null,
          });

          // Re-read to get updated hash
          const updatedEntries = await getEntries(userId, {
            search: existingMapping.entryId,
            limit: 1,
          });
          const updatedHash = updatedEntries.entries[0]
            ? computeContentHash(updatedEntries.entries[0])
            : null;

          await updateMapping(existingMapping.id, {
            externalHash: change.externalHash || null,
            internalHash: updatedHash,
            lastSyncedAt: now,
            lastSyncDirection: "pull",
          });
        }
        summary.pulled.updated++;
      } else {
        // Action is "update" but no existing mapping — treat as create
        if (!dryRun) {
          const entryData: NewEntry = {
            userId,
            type: change.data.type,
            name: change.data.name,
            category: change.data.category || null,
            subcategory: change.data.subcategory || null,
            emoji: change.data.emoji || null,
            timestamp: change.data.timestamp,
            durationSeconds: change.data.durationSeconds || null,
            notes: change.data.notes || null,
            tags: change.data.tags || [],
            source: change.data.source || providerId,
            externalId: change.data.externalId || change.externalId,
            data: change.data.data || null,
            timezone: "UTC",
          };

          const created = await createEntry(entryData);
          const internalHash = computeContentHash(created);

          await createMapping({
            userId,
            entryId: created.id,
            provider: providerId,
            externalId: change.externalId,
            externalHash: change.externalHash || null,
            internalHash,
            lastSyncedAt: now,
            lastSyncDirection: "pull",
          });
        }
        summary.pulled.created++;
      }
    } catch (error) {
      summary.errors.push({
        message: error instanceof Error ? error.message : String(error),
        externalId: change.externalId,
      });
    }
  }
}

/**
 * Push phase: send changed entries to external system.
 */
async function pushToProvider(
  userId: string,
  providerId: string,
  provider: {
    pushChanges?: (entries: EntryWithMapping[]) => Promise<
      Array<{ externalId: string; entryId: string; success: boolean; error?: string; externalHash?: string }>
    >;
  },
  lastSync: Date | null,
  summary: SyncRunSummary,
  dryRun?: boolean,
): Promise<void> {
  if (!provider.pushChanges) return;

  // Get entries changed since last sync
  const since = lastSync ? lastSync.toISOString() : undefined;
  const result = await getEntries(userId, {
    updated_since: since,
    include_deleted: true,
    limit: 1000,
  });

  // Build EntryWithMapping array
  const entriesToPush: EntryWithMapping[] = [];

  for (const entry of result.entries) {
    const mapping = await getMappingByEntryId(userId, providerId, entry.id);

    // Skip entries that were just pulled from this provider
    if (mapping?.lastSyncDirection === "pull") {
      const mappingSyncTime = new Date(mapping.lastSyncedAt);
      const entryUpdateTime = new Date(entry.updatedAt);
      // If the entry hasn't been modified since the last pull, skip
      if (entryUpdateTime <= mappingSyncTime) {
        continue;
      }
    }

    entriesToPush.push({
      entry,
      mapping: mapping || undefined,
    });
  }

  // Also include entries without any mapping for this provider (new local entries)
  if (!since) {
    // First sync — all entries that don't have a mapping
    const allEntries = await getEntries(userId, { limit: 1000 });
    const existingMappings = await getMappingsByProvider(userId, providerId);
    const mappedEntryIds = new Set(existingMappings.map((m) => m.entryId));

    for (const entry of allEntries.entries) {
      if (!mappedEntryIds.has(entry.id)) {
        const alreadyIncluded = entriesToPush.some((e) => e.entry.id === entry.id);
        if (!alreadyIncluded) {
          entriesToPush.push({ entry, mapping: undefined });
        }
      }
    }
  }

  if (entriesToPush.length === 0) return;

  if (dryRun) {
    // Count what would be pushed
    for (const item of entriesToPush) {
      if (item.entry.deletedAt) {
        summary.pushed.deleted++;
      } else if (item.mapping) {
        summary.pushed.updated++;
      } else {
        summary.pushed.created++;
      }
    }
    return;
  }

  const results = await provider.pushChanges(entriesToPush);
  const now = new Date().toISOString();

  for (const result of results) {
    try {
      if (!result.success) {
        summary.errors.push({
          message: result.error || "Push failed",
          entryId: result.entryId,
          externalId: result.externalId,
        });
        continue;
      }

      const existingMapping = await getMappingByEntryId(
        userId,
        providerId,
        result.entryId,
      );

      const entry = entriesToPush.find((e) => e.entry.id === result.entryId);
      const internalHash = entry ? computeContentHash(entry.entry) : null;

      if (existingMapping) {
        await updateMapping(existingMapping.id, {
          externalId: result.externalId,
          externalHash: result.externalHash || null,
          internalHash,
          lastSyncedAt: now,
          lastSyncDirection: "push",
        });

        if (entry?.entry.deletedAt) {
          summary.pushed.deleted++;
        } else {
          summary.pushed.updated++;
        }
      } else {
        await createMapping({
          userId,
          entryId: result.entryId,
          provider: providerId,
          externalId: result.externalId,
          externalHash: result.externalHash || null,
          internalHash,
          lastSyncedAt: now,
          lastSyncDirection: "push",
        });
        summary.pushed.created++;
      }
    } catch (error) {
      summary.errors.push({
        message: error instanceof Error ? error.message : String(error),
        entryId: result.entryId,
        externalId: result.externalId,
      });
    }
  }
}
