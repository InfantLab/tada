# Spec 007: Sync API & Provider Framework

> Extensible sync framework with provider adapters for bidirectional data exchange between Ta-Da! and external systems.

## Status

- **Status:** Draft (Revised)
- **Author:** Ted (OpenClaw)
- **Created:** 2026-03-07
- **Revised:** 2026-03-08
- **Target:** v0.5.0+

## Problem

Users want to sync Ta-Da! entries with other systems (Obsidian vaults, Strava, journaling apps). Current API supports CRUD but lacks:

1. **Change detection** — No efficient way to ask "what changed since my last sync?"
2. **External ID tracking** — `externalId` on entries exists but is flat (one source only), with no per-provider mapping
3. **Provider abstraction** — No framework for adding new sync sources without modifying core code
4. **Bidirectional flow** — Existing importers are one-shot; no incremental or two-way sync

## Goals

- Enable efficient incremental sync (don't re-fetch everything)
- Support one-way ingest, one-way export, and bidirectional sync per provider
- Provide a provider/adapter framework following the existing module pattern (entry types, importers, exporters)
- Stay simple — minimal API surface, last-write-wins conflict resolution
- Don't break existing API consumers

## Non-Goals

- Real-time sync (existing webhooks cover push notifications)
- CRDTs or operational transforms (overkill for single-user app)
- Multi-user sync / sharing
- Built-in UI for sync management (CLI/script-driven for now)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Ta-Da! Core                     │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Entries   │  │ Sync     │  │ Sync Engine   │  │
│  │ Table     │  │ Mappings │  │ (orchestrator)│  │
│  └──────────┘  └──────────┘  └───────┬───────┘  │
│                                      │           │
│                         ┌────────────┼─────────┐ │
│                         │            │         │ │
│                    ┌────▼───┐  ┌─────▼──┐  ┌──▼─┤ │
│                    │Obsidian│  │ Strava │  │ ...│ │
│                    │Provider│  │Provider│  │    │ │
│                    └────────┘  └────────┘  └────┘ │
│                                                   │
│  modules/sync-providers/                          │
└───────────────────────────────────────────────────┘
```

Sync providers are **the fourth module type**, alongside entry types, importers, and exporters. Each provider is a self-contained module that self-registers with the sync provider registry.

---

## 1. Sync Provider Interface

```typescript
// types/syncProvider.ts

export type SyncDirection = 'ingest' | 'export' | 'bidirectional';

export interface SyncProviderConfig {
  [key: string]: unknown;
}

/** A change detected in the external system */
export interface ExternalChange {
  externalId: string;           // Unique ID in the external system (file path, API ID, etc.)
  action: 'create' | 'update' | 'delete';
  data?: ImportCandidate;       // Reuses existing ImportCandidate type
  externalHash?: string;        // Content hash for change detection
  externalTimestamp?: string;   // When the external item was last modified (ISO 8601)
}

/** Result of pushing changes to external system */
export interface SyncPushResult {
  externalId: string;
  entryId: string;
  success: boolean;
  error?: string;
  externalHash?: string;        // Hash of the written content
}

/** Summary returned after a sync run */
export interface SyncRunSummary {
  provider: string;
  direction: SyncDirection;
  startedAt: string;
  completedAt: string;
  pulled: { created: number; updated: number; deleted: number; skipped: number };
  pushed: { created: number; updated: number; deleted: number; skipped: number };
  conflicts: number;
  errors: Array<{ message: string; externalId?: string; entryId?: string }>;
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
   * Returns a list of changes to apply to Ta-Da!.
   * For providers that don't support timestamps (e.g. file-based),
   * use file mtime or similar heuristics.
   */
  fetchChanges(since: Date | null): Promise<ExternalChange[]>;

  /**
   * Push: Send Ta-Da! entry changes to the external system.
   * Only required for 'export' and 'bidirectional' providers.
   * Receives entries that changed since last sync.
   */
  pushChanges?(entries: EntryWithMapping[]): Promise<SyncPushResult[]>;

  /**
   * Map an external item to the internal ImportCandidate format.
   * Called by the sync engine for each item from fetchChanges().
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

/** An entry with its sync mapping for a specific provider */
export interface EntryWithMapping {
  entry: Entry;
  mapping?: SyncMapping;
}
```

---

## 2. Sync Mappings Table (replaces `syncMeta` on Entry)

Instead of embedding per-provider metadata on every entry, sync state lives in a dedicated join table. This keeps the entries table clean and scales to any number of providers.

```typescript
// In server/db/schema.ts

export const syncMappings = sqliteTable("sync_mappings", {
  id: text("id").primaryKey(),                          // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  entryId: text("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),

  provider: text("provider").notNull(),                 // 'obsidian', 'strava', etc.
  externalId: text("external_id").notNull(),            // Path, URI, or ID in external system
  externalHash: text("external_hash"),                  // Hash of external content at last sync
  internalHash: text("internal_hash"),                  // Hash of Ta-Da! entry content at last sync

  lastSyncedAt: text("last_synced_at").notNull(),       // ISO 8601
  lastSyncDirection: text("last_sync_direction"),       // 'pull' | 'push'

  metadata: text("metadata", { mode: "json" })          // Provider-specific extras
    .$type<Record<string, unknown>>(),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
```

**Indexes:**

```sql
CREATE UNIQUE INDEX idx_sync_mappings_provider_entry
  ON sync_mappings(provider, entry_id);
CREATE UNIQUE INDEX idx_sync_mappings_provider_external
  ON sync_mappings(provider, external_id, user_id);
CREATE INDEX idx_sync_mappings_user_provider
  ON sync_mappings(user_id, provider);
```

**Why a separate table:**

- Entries stay clean — most consumers don't need sync metadata
- Queryable per-provider (e.g. "find all entries synced to Obsidian")
- Adding a new provider doesn't touch the entry schema
- Follows the pattern used by Apple HealthKit (`HKMetadataSyncIdentifier` + `HKMetadataSyncVersion`)

---

## 3. Sync Provider Registry

Following the existing registry pattern for importers/exporters:

```typescript
// registry/syncProviders.ts

import type { SyncProvider } from "~/types/syncProvider";

const registry = new Map<string, SyncProvider>();

export function registerSyncProvider(provider: SyncProvider): void {
  if (registry.has(provider.id)) {
    console.warn(`[registry] Sync provider "${provider.id}" already registered, overwriting.`);
  }
  registry.set(provider.id, provider);
}

export function getRegisteredSyncProviders(): Map<string, SyncProvider> {
  return registry;
}

export function getSyncProvider(id: string): SyncProvider | undefined {
  return registry.get(id);
}
```

---

## 4. API Additions

### 4.1 `updated_since` Filter

Add `updated_since` query parameter to `GET /api/v1/entries`:

```http
GET /api/v1/entries?updated_since=2026-03-07T12:00:00Z&include_deleted=true
```

Returns entries where `updatedAt > updated_since` OR `deletedAt > updated_since`.

- `include_deleted=true` — include soft-deleted entries so sync clients know what to remove
- When `updated_since` is present, `include_deleted` defaults to `true`
- Sort defaults to `updatedAt` asc (chronological change order)

### 4.2 Content Hash

Add computed `contentHash` field to entry API responses:

```typescript
function computeContentHash(entry: Entry): string {
  const canonical = JSON.stringify({
    name: entry.name,
    type: entry.type,
    category: entry.category,
    subcategory: entry.subcategory,
    timestamp: entry.timestamp,
    durationSeconds: entry.durationSeconds,
    notes: entry.notes,
    tags: (entry.tags || []).sort(),
    data: entry.data,
  });
  return sha256(canonical);
}
```

Read-only, computed on response. Lets sync clients detect changes without deep field comparison.

### 4.3 Sync Status Endpoint

```http
GET /api/v1/sync/status
Authorization: Bearer API_KEY
```

**Response:**

```json
{
  "serverTime": "2026-03-07T14:30:00.000Z",
  "counts": {
    "total": 1523,
    "active": 1520,
    "deleted": 3
  },
  "lastModified": "2026-03-07T14:25:00.000Z",
  "providers": {
    "obsidian": {
      "lastSyncedAt": "2026-03-07T14:00:00.000Z",
      "mappedEntries": 42
    }
  }
}
```

### 4.4 Sync Trigger Endpoint

```http
POST /api/v1/sync/trigger
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "provider": "obsidian",
  "direction": "both",
  "dryRun": false
}
```

**Response:** `SyncRunSummary`

This endpoint invokes the sync engine for a specific provider. Useful for cron jobs or manual triggers.

### 4.5 Sync Mappings Endpoints

```http
GET    /api/v1/sync/mappings?provider=obsidian
GET    /api/v1/sync/mappings/:entryId
DELETE /api/v1/sync/mappings/:id
```

---

## 5. Sync Engine

The sync engine orchestrates the pull/push cycle. It is provider-agnostic.

```
Pull Phase (external → Ta-Da!):
  1. Call provider.fetchChanges(lastSyncTimestamp)
  2. For each ExternalChange:
     a. Look up sync_mappings by (provider, externalId)
     b. If no mapping exists → create entry + mapping (new item)
     c. If mapping exists:
        - Compare externalHash with stored externalHash
        - If unchanged → skip
        - Compare internalHash to detect local changes
        - If only external changed → update entry
        - If both changed → CONFLICT (last-write-wins by default)
        - If deleted → soft-delete entry
  3. Update lastSyncedAt on all touched mappings

Push Phase (Ta-Da! → external):
  1. Query entries where updatedAt > lastSyncedAt for this provider
  2. Include entries with no mapping for this provider (new local entries)
  3. For each entry:
     a. Call provider.pushChanges([entry])
     b. Create or update sync_mapping with result
  4. Update lastSyncedAt on all touched mappings
```

### Conflict Resolution

**Default: Last-Write-Wins (LWW)**

Compare `entry.updatedAt` vs `externalChange.externalTimestamp`. Whichever is newer wins. This is appropriate for a single-user personal app where true conflicts (same entry edited in both systems between syncs) are extremely rare.

If a conflict is detected:
1. The newer version wins
2. The overwritten version is logged in the sync run summary
3. Future enhancement: optional `conflicts` table for manual review

---

## 6. Obsidian Sync Provider

The Obsidian provider syncs entries with markdown files in an Obsidian vault. It reads/writes files directly (Obsidian vaults are just folders of `.md` files).

### Configuration

```typescript
interface ObsidianProviderConfig extends SyncProviderConfig {
  vaultPath: string;              // Absolute path to Obsidian vault
  syncFolder: string;             // Subfolder for synced entries, e.g. "tada/"
  fileNamePattern: string;        // e.g. "{{date}}-{{name}}.md"
  categories?: string[];          // Filter: only sync these categories (null = all)
  subcategories?: string[];       // Filter: only sync these subcategories
  frontmatterMapping?: Record<string, string>;  // Custom frontmatter field names
}
```

### File Format

Each synced entry becomes a markdown file with YAML frontmatter:

```markdown
---
tada_id: entry_abc123
type: timed
category: journal
subcategory: dream
timestamp: 2026-03-07T06:30:00.000Z
duration_seconds: null
tags: [dream, flying, lucid]
source: manual
---

# Flying over mountains

I was soaring above snow-capped peaks. The air was cold but I felt warm.
The clouds parted and I could see the valley below...
```

### Sync Behaviour

**Pull (vault → Ta-Da!):**
1. Scan `{vaultPath}/{syncFolder}/` for `.md` files
2. Parse YAML frontmatter for `tada_id` (indicates previously synced)
3. For files without `tada_id`: new entry — create in Ta-Da!, write back `tada_id` to frontmatter
4. For files with `tada_id`: check file `mtime` vs `lastSyncedAt` in sync_mappings
5. If file changed: parse content, update entry in Ta-Da!
6. Hash comparison: SHA-256 of file content vs stored `externalHash`

**Push (Ta-Da! → vault):**
1. Query entries changed since last sync (filtered by configured categories)
2. For entries with existing mapping: update the markdown file
3. For entries without mapping: create new markdown file, record mapping
4. For deleted entries: optionally move file to a `.trash/` folder or add `deleted: true` to frontmatter

### Obsidian Sync Script

A standalone CLI script (`scripts/sync-obsidian.ts`) that:
- Reads config from a `.tada-sync.json` file in the vault root (or CLI args)
- Authenticates to Ta-Da! via API key
- Runs the sync engine with the Obsidian provider
- Can be scheduled via cron or run manually
- Supports `--dry-run` for preview

```bash
# Run sync
npx tsx scripts/sync-obsidian.ts --vault ~/Documents/MyVault --api-key tada_key_xxx

# Dry run
npx tsx scripts/sync-obsidian.ts --vault ~/Documents/MyVault --dry-run

# Using config file
npx tsx scripts/sync-obsidian.ts --config ~/Documents/MyVault/.tada-sync.json
```

**Config file (`.tada-sync.json`):**

```json
{
  "apiUrl": "http://localhost:3000",
  "apiKey": "tada_key_...",
  "syncFolder": "tada/dreams",
  "categories": ["journal"],
  "subcategories": ["dream"],
  "fileNamePattern": "{{date}}-{{name}}.md",
  "conflictStrategy": "newer-wins",
  "pushDeletes": false
}
```

---

## 7. Future Providers (Reference)

### Strava (one-way ingest)

- Uses webhook push model (Strava POSTs event notification → we fetch full activity)
- Provider implements `fetchChanges()` by querying Strava API with `after` timestamp
- Maps Strava activities to entries with `type: 'exercise'`, appropriate categories
- No `pushChanges()` (ingest only)
- Auth: OAuth2 token stored in provider config

### Generic Journaling Apps (bidirectional)

- Day One, Journey, etc. — similar file/API-based approach
- Each gets its own provider module in `modules/sync-providers/`
- Same `SyncProvider` interface, different `mapToInternal`/`mapToExternal`

---

## 8. Database Migration

```sql
-- Migration: 0021_sync_mappings.sql

CREATE TABLE sync_mappings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  external_hash TEXT,
  internal_hash TEXT,
  last_synced_at TEXT NOT NULL,
  last_sync_direction TEXT,
  metadata TEXT,  -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One mapping per provider per entry
CREATE UNIQUE INDEX idx_sync_mappings_provider_entry
  ON sync_mappings(provider, entry_id);

-- Look up by external ID (for pull phase)
CREATE UNIQUE INDEX idx_sync_mappings_provider_external
  ON sync_mappings(provider, external_id, user_id);

-- List all mappings for a user+provider
CREATE INDEX idx_sync_mappings_user_provider
  ON sync_mappings(user_id, provider);

-- Efficient updated_since queries on entries
CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at);
CREATE INDEX IF NOT EXISTS idx_entries_deleted_at ON entries(deleted_at);
```

---

## 9. Security Considerations

- Sync mappings are private per-user (scoped by `userId`)
- API keys need `entries:write` + `sync:manage` permissions for sync operations
- External IDs may contain file paths — sanitize in any public-facing features
- The Obsidian sync script runs locally and accesses the vault via filesystem — no vault data transits the network beyond entry content sent to the Ta-Da! API
- Validate `vaultPath` to prevent path traversal attacks

---

## 10. Rollout

### Phase 1: Foundation
- [ ] `sync_mappings` table + migration
- [ ] `SyncProvider` interface + registry
- [ ] `updated_since` and `include_deleted` query parameters on `GET /api/v1/entries`
- [ ] `contentHash` computed field on entry responses

### Phase 2: Sync Engine
- [ ] Sync engine (pull + push orchestration)
- [ ] `/api/v1/sync/status` endpoint
- [ ] `/api/v1/sync/trigger` endpoint
- [ ] `/api/v1/sync/mappings` endpoints

### Phase 3: Obsidian Provider
- [ ] Obsidian sync provider module
- [ ] Markdown ↔ entry mapping (parse frontmatter + content)
- [ ] `scripts/sync-obsidian.ts` CLI script
- [ ] `.tada-sync.json` config file support
- [ ] Dry-run mode

### Phase 4: Polish
- [ ] Sync history/logs (reuse `importLogs` pattern)
- [ ] Error recovery (resume interrupted syncs)
- [ ] Documentation

---

## Open Questions

1. **Pagination with `updated_since`** — Cursor-based recommended for large change sets. Use `lastId` + `updatedAt` as cursor.
2. **Bulk operations** — Should the sync engine use `POST /entries/bulk` for efficiency? (Yes, for >10 entries per sync run.)
3. **File watching** — Should the Obsidian script support `--watch` mode using `fs.watch`? (Nice-to-have for Phase 4.)

---

## References

- [Ta-Da! Module Architecture](../../app/MODULES.md) — existing module/registry pattern
- [Ta-Da! API Specification](../docs/tada-api/API-SPECIFICATION.md)
- [Apple HealthKit Sync Identifiers](https://developer.apple.com/documentation/healthkit) — inspiration for separate sync metadata
- [Strava Webhooks API](https://developers.strava.com/docs/webhooks/) — event-driven ingest model
- [n8n Node Architecture](https://docs.n8n.io/integrations/creating-nodes/) — adapter pattern reference
