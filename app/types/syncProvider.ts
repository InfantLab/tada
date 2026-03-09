/**
 * Sync Provider Interface
 *
 * Each sync provider module implements SyncProvider to handle
 * bidirectional data exchange with an external system.
 * Sync providers are the fourth module type, alongside
 * entry types, importers, and exporters.
 *
 * @module types/syncProvider
 */

import type { ImportCandidate } from "~/types/importer";

export type SyncDirection = "ingest" | "export" | "bidirectional";

export interface SyncProviderConfig {
  [key: string]: unknown;
}

/** A change detected in the external system */
export interface ExternalChange {
  /** Unique ID in the external system (file path, API ID, etc.) */
  externalId: string;
  /** What happened to this item */
  action: "create" | "update" | "delete";
  /** Mapped entry data (not needed for deletes) */
  data?: ImportCandidate;
  /** Content hash for change detection */
  externalHash?: string;
  /** When the external item was last modified (ISO 8601) */
  externalTimestamp?: string;
}

/** Result of pushing a single entry to an external system */
export interface SyncPushResult {
  externalId: string;
  entryId: string;
  success: boolean;
  error?: string;
  /** Hash of the written content */
  externalHash?: string;
}

/** Summary returned after a sync run */
export interface SyncRunSummary {
  provider: string;
  direction: SyncDirection;
  startedAt: string;
  completedAt: string;
  pulled: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
  };
  pushed: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
  };
  conflicts: number;
  errors: Array<{
    message: string;
    externalId?: string;
    entryId?: string;
  }>;
}

/** An entry paired with its sync mapping for a specific provider */
export interface EntryWithMapping {
  entry: {
    id: string;
    userId: string;
    type: string;
    name: string;
    category: string | null;
    subcategory: string | null;
    emoji: string | null;
    timestamp: string;
    durationSeconds: number | null;
    timezone: string;
    data: Record<string, unknown> | null;
    tags: string[] | null;
    notes: string | null;
    source: string;
    externalId: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  mapping?: {
    id: string;
    provider: string;
    externalId: string;
    externalHash: string | null;
    internalHash: string | null;
    lastSyncedAt: string;
    lastSyncDirection: string | null;
  };
}

export interface SyncProvider {
  /** Unique provider ID, e.g. 'obsidian', 'strava' */
  id: string;

  /** Human-readable name */
  name: string;

  /** What directions this provider supports */
  direction: SyncDirection;

  /** Description for UI/CLI display */
  description: string;

  /**
   * Validate and apply configuration.
   * Called before any sync operation.
   * Should throw if config is invalid.
   */
  configure(config: SyncProviderConfig): void;

  /**
   * Pull: Fetch changes from the external system since the given timestamp.
   * For providers that don't support timestamps (e.g. file-based),
   * use file mtime or similar heuristics.
   * Pass null for initial full sync.
   */
  fetchChanges(since: Date | null): Promise<ExternalChange[]>;

  /**
   * Push: Send Ta-Da! entry changes to the external system.
   * Only required for 'export' and 'bidirectional' providers.
   */
  pushChanges?(entries: EntryWithMapping[]): Promise<SyncPushResult[]>;

  /**
   * Map an external item to the internal ImportCandidate format.
   * Many providers can do this inline in fetchChanges(), but this
   * hook allows the engine to re-map if needed.
   */
  mapToInternal?(raw: unknown): ImportCandidate;

  /**
   * Map an internal entry to the external format for writing.
   * Only required for 'export' and 'bidirectional' providers.
   */
  mapToExternal?(entry: EntryWithMapping): unknown;
}
