# Spec 007: Implementation Plan

> Step-by-step plan for implementing the Sync API & Provider Framework.

## Dependencies & Prerequisites

- Drizzle ORM migration tooling (already in use)
- Existing module/registry pattern (entry types, importers, exporters)
- V1 REST API with API key authentication
- Node.js `crypto` module for SHA-256 hashing
- `fs` / `fs/promises` for Obsidian file access

No new external dependencies required for Phase 1-3.

---

## Phase 1: Foundation

**Goal:** Database table, types, registry, and API query extensions.

### Step 1.1 — Sync Provider Types

Create `app/types/syncProvider.ts` with all interfaces:
- `SyncProvider`, `SyncDirection`, `SyncProviderConfig`
- `ExternalChange`, `SyncPushResult`, `SyncRunSummary`
- `EntryWithMapping`, `SyncMapping` (TypeScript type matching the DB table)

**Key decision:** Reuse `ImportCandidate` from `types/importer.ts` as the internal mapping target. This avoids a parallel type and leverages existing validation.

### Step 1.2 — Database Migration

Create `drizzle/0021_sync_mappings.sql`:
- `sync_mappings` table with provider, externalId, hashes, timestamps
- Unique indexes on `(provider, entry_id)` and `(provider, external_id, user_id)`
- Performance indexes on `entries.updated_at` and `entries.deleted_at`

Add the table definition to `app/server/db/schema.ts` with Drizzle ORM.

### Step 1.3 — Sync Provider Registry

Create `app/registry/syncProviders.ts` following the exact pattern of `importers.ts`:
- `registerSyncProvider(provider)`
- `getRegisteredSyncProviders()`
- `getSyncProvider(id)`

### Step 1.4 — API: `updated_since` & `include_deleted`

Modify `app/server/api/v1/entries/index.get.ts`:
- Add `updated_since` (ISO 8601 datetime) to the Zod query schema
- Add `include_deleted` (boolean, default false, default true when `updated_since` present)
- Modify `getEntries()` in `app/server/services/entries.ts` to:
  - Filter by `updatedAt > updated_since` OR `deletedAt > updated_since`
  - Include soft-deleted entries when `include_deleted` is true

### Step 1.5 — Content Hash

Create utility `app/server/utils/contentHash.ts`:
- `computeContentHash(entry): string` — deterministic SHA-256
- Add `contentHash` to entry API response serialization
- This is computed on response, never stored

**Files touched:**
- `app/types/syncProvider.ts` (new)
- `app/server/db/schema.ts` (add syncMappings table)
- `drizzle/0021_sync_mappings.sql` (new)
- `app/registry/syncProviders.ts` (new)
- `app/server/api/v1/entries/index.get.ts` (modify)
- `app/server/services/entries.ts` (modify)
- `app/server/utils/contentHash.ts` (new)
- `app/types/api.d.ts` (add updated_since, include_deleted to EntryQueryParams)

---

## Phase 2: Sync Engine & API Endpoints

**Goal:** The provider-agnostic orchestration layer and sync API endpoints.

### Step 2.1 — Sync Engine Service

Create `app/server/services/syncEngine.ts`:

```
runSync(userId, providerId, options) → SyncRunSummary
  ├── pullPhase(provider, userId, lastSyncTimestamp)
  │   ├── provider.fetchChanges(since)
  │   ├── For each change: lookup/create/update entry + mapping
  │   └── Handle deletes
  └── pushPhase(provider, userId, lastSyncTimestamp)
      ├── Query changed entries since last sync
      ├── provider.pushChanges(entries)
      └── Create/update mappings with results
```

Key implementation details:
- Use existing `createEntry()` / `updateEntry()` service functions
- Batch operations where possible (use bulk endpoints for >10 items)
- Transaction per sync run for atomicity
- Return detailed `SyncRunSummary` with counts and errors

### Step 2.2 — Sync Mapping Service

Create `app/server/services/syncMappings.ts`:
- `getMappingsByProvider(userId, provider)` — list all mappings
- `getMappingByExternalId(userId, provider, externalId)` — lookup for pull phase
- `getMappingByEntryId(userId, provider, entryId)` — lookup for push phase
- `createMapping(...)` / `updateMapping(...)` — CRUD
- `getLastSyncTimestamp(userId, provider)` — for determining `since`

### Step 2.3 — API: Sync Status

Create `app/server/api/v1/sync/status.get.ts`:
- Returns server time, entry counts, last modified, per-provider sync stats
- Requires `entries:read` permission

### Step 2.4 — API: Sync Trigger

Create `app/server/api/v1/sync/trigger.post.ts`:
- Accepts `{ provider, direction, dryRun }`
- Loads provider from registry, calls sync engine
- Requires `entries:write` permission
- Returns `SyncRunSummary`

### Step 2.5 — API: Sync Mappings

Create `app/server/api/v1/sync/mappings/`:
- `index.get.ts` — list mappings with provider filter
- `[id].delete.ts` — remove a mapping (unlinking, not deleting the entry)

### Step 2.6 — Permissions

Add `sync:manage` permission to `app/types/api.d.ts`:
- Required for sync trigger and mapping management
- `entries:read` sufficient for sync status

**Files touched:**
- `app/server/services/syncEngine.ts` (new)
- `app/server/services/syncMappings.ts` (new)
- `app/server/api/v1/sync/status.get.ts` (new)
- `app/server/api/v1/sync/trigger.post.ts` (new)
- `app/server/api/v1/sync/mappings/index.get.ts` (new)
- `app/server/api/v1/sync/mappings/[id].delete.ts` (new)
- `app/types/api.d.ts` (add sync:manage permission)

---

## Phase 3: Obsidian Provider & Sync Script

**Goal:** Working two-way sync between Ta-Da! and an Obsidian vault.

### Step 3.1 — Markdown Parser/Writer

Create `app/modules/sync-providers/obsidian/markdown.ts`:
- `parseMarkdownEntry(content: string)` → `{ frontmatter, body }`
  - Parse YAML frontmatter (between `---` delimiters)
  - Extract `tada_id`, `type`, `category`, `subcategory`, `timestamp`, `tags`, etc.
  - Body = everything after frontmatter = entry `notes`
  - Title (first `# heading`) = entry `name`
- `renderMarkdownEntry(entry, mapping)` → `string`
  - Generate YAML frontmatter from entry fields
  - Render title as `# heading`
  - Render notes as body content
- `computeFileHash(content: string)` → `string` (SHA-256)

### Step 3.2 — Obsidian Sync Provider

Create `app/modules/sync-providers/obsidian/index.ts`:
- Implements `SyncProvider` interface
- `configure(config)`: validate `vaultPath` exists, `syncFolder` exists (create if not)
- `fetchChanges(since)`:
  - Scan `{vaultPath}/{syncFolder}/` for `.md` files
  - Filter by `mtime > since` (or all files if `since` is null)
  - Parse each file, determine action (create/update/delete)
  - Return `ExternalChange[]`
- `pushChanges(entries)`:
  - For each entry: render markdown, write to vault
  - For entries with existing mapping: overwrite file at known path
  - For new entries: create file with configured name pattern
  - For deleted entries: move to `.trash/` or mark in frontmatter
  - Return `SyncPushResult[]`
- `mapToInternal(raw)`: frontmatter+body → `ImportCandidate`
- `mapToExternal(entry)`: entry → markdown string

Register via `registerSyncProvider(obsidianProvider)`.

### Step 3.3 — Sync Script (CLI)

Create `scripts/sync-obsidian.ts`:
- Parse CLI args: `--vault`, `--api-key`, `--api-url`, `--config`, `--dry-run`, `--direction`
- Load config from `.tada-sync.json` if present, CLI args override
- Authenticate to Ta-Da! API
- Instantiate Obsidian provider with config
- Call sync engine (via API or direct service call)
- Print `SyncRunSummary` to console
- Exit code: 0 = success, 1 = errors occurred

### Step 3.4 — Config File Support

Define `.tada-sync.json` schema:
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

Validate with Zod schema in the script.

### Step 3.5 — Integration Tests

Create tests:
- `app/modules/sync-providers/obsidian/markdown.test.ts` — parse/render roundtrip
- `app/modules/sync-providers/obsidian/obsidian.test.ts` — provider logic with temp directories
- `scripts/sync-obsidian.test.ts` — CLI arg parsing, config loading

**Files touched:**
- `app/modules/sync-providers/obsidian/index.ts` (new)
- `app/modules/sync-providers/obsidian/markdown.ts` (new)
- `scripts/sync-obsidian.ts` (new)
- Tests (new)

---

## Phase 4: Polish (Future)

- Sync history logs (extend `importLogs` or new `syncLogs` table)
- `--watch` mode for the sync script (file watcher)
- Error recovery / resume interrupted syncs
- Sync settings UI in the app
- Additional providers (Strava, Day One)

---

## Risk Mitigations

| Risk | Mitigation |
|---|---|
| File system race conditions (Obsidian editing while sync runs) | Use temp file + atomic rename for writes; re-read and compare hash before overwriting |
| Large vaults slow down sync | Only scan configured `syncFolder`, not entire vault; use `mtime` filtering |
| Data loss from bad conflict resolution | Dry-run mode; log overwritten content in sync summary; future: conflict table |
| API key exposure in config file | Document `.gitignore` for `.tada-sync.json`; support env var `TADA_API_KEY` |
| Breaking existing API consumers | `updated_since` and `include_deleted` are additive; `contentHash` is a new response field; no existing fields change |

---

## Testing Strategy

1. **Unit tests**: Content hash, markdown parse/render, provider mapping logic
2. **Integration tests**: Sync engine with in-memory DB, temp filesystem for Obsidian
3. **End-to-end**: Full sync cycle via API (create entries → sync to vault → modify files → sync back)
4. **Edge cases**: Empty vault, deleted entries, files with no frontmatter, Unicode filenames, concurrent modifications
