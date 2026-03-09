# Spec 007: Task Breakdown

> Granular implementation tasks for the Sync API & Provider Framework.
> Each task is independently testable and should be a single commit.

---

## Phase 1: Foundation

### Task 1.1 — Sync provider types
- **File:** `app/types/syncProvider.ts`
- **Action:** Create file with all TypeScript interfaces
- **Interfaces:** `SyncDirection`, `SyncProviderConfig`, `ExternalChange`, `SyncPushResult`, `SyncRunSummary`, `SyncProvider`, `EntryWithMapping`
- **Depends on:** Nothing
- **Test:** TypeScript compilation

### Task 1.2 — Sync mappings table & migration
- **Files:** `app/server/db/schema.ts`, `drizzle/0021_sync_mappings.sql`
- **Action:** Add `syncMappings` table definition to schema, create migration SQL
- **Fields:** id, userId, entryId, provider, externalId, externalHash, internalHash, lastSyncedAt, lastSyncDirection, metadata, createdAt, updatedAt
- **Indexes:** unique (provider, entry_id), unique (provider, external_id, user_id), index (user_id, provider)
- **Type exports:** `SyncMapping`, `NewSyncMapping`
- **Depends on:** Nothing
- **Test:** Run migration against test DB, verify table creation

### Task 1.3 — Sync provider registry
- **File:** `app/registry/syncProviders.ts`
- **Action:** Create registry following `importers.ts` pattern
- **Functions:** `registerSyncProvider()`, `getRegisteredSyncProviders()`, `getSyncProvider()`
- **Depends on:** Task 1.1
- **Test:** Unit test: register, retrieve, overwrite warning

### Task 1.4 — Content hash utility
- **File:** `app/server/utils/contentHash.ts`
- **Action:** Create `computeContentHash(entry)` using SHA-256
- **Fields in hash:** name, type, category, subcategory, timestamp, durationSeconds, notes, tags (sorted), data
- **Depends on:** Nothing
- **Test:** Unit test: deterministic output, field ordering doesn't matter, null handling

### Task 1.5 — `updated_since` query parameter
- **Files:** `app/server/api/v1/entries/index.get.ts`, `app/server/services/entries.ts`, `app/types/api.d.ts`
- **Action:**
  - Add `updated_since` (ISO datetime string) to Zod query schema
  - Add `include_deleted` (boolean) to Zod query schema
  - Update `EntryQueryParams` type
  - In `getEntries()`: filter `updatedAt > updated_since OR deletedAt > updated_since`
  - When `include_deleted=true`: remove the `deletedAt IS NULL` filter
  - When `updated_since` is present: default `include_deleted` to true, default sort to `updatedAt` asc
- **Depends on:** Nothing
- **Test:** API test: create entries, update one, delete one, query with `updated_since`, verify correct subset returned

### Task 1.6 — Add contentHash to entry responses
- **Files:** `app/server/services/entries.ts` (or response serializer)
- **Action:** Compute and append `contentHash` to each entry in API responses
- **Depends on:** Task 1.4
- **Test:** API test: fetch entry, verify `contentHash` field present and deterministic

---

## Phase 2: Sync Engine & API

### Task 2.1 — Sync mappings service
- **File:** `app/server/services/syncMappings.ts`
- **Action:** CRUD operations for sync_mappings table
- **Functions:**
  - `getMappingsByProvider(userId, provider)` → `SyncMapping[]`
  - `getMappingByExternalId(userId, provider, externalId)` → `SyncMapping | null`
  - `getMappingByEntryId(userId, provider, entryId)` → `SyncMapping | null`
  - `createMapping(data)` → `SyncMapping`
  - `updateMapping(id, data)` → `SyncMapping`
  - `deleteMapping(id)` → `void`
  - `getLastSyncTimestamp(userId, provider)` → `Date | null`
- **Depends on:** Task 1.2
- **Test:** Unit tests with test DB

### Task 2.2 — Sync engine: pull phase
- **File:** `app/server/services/syncEngine.ts`
- **Action:** Implement `pullFromProvider(userId, provider, since)`
  - Call `provider.fetchChanges(since)`
  - For each change: lookup mapping, create/update/delete entry
  - Create/update sync_mappings
  - Return pull portion of `SyncRunSummary`
- **Depends on:** Task 2.1, Task 1.4
- **Test:** Unit test with mock provider: new items created, existing items updated, deletes handled

### Task 2.3 — Sync engine: push phase
- **File:** `app/server/services/syncEngine.ts`
- **Action:** Implement `pushToProvider(userId, provider, since)`
  - Query entries changed since `since` (use `updated_since` logic)
  - Filter to entries matching provider config
  - Call `provider.pushChanges(entries)`
  - Create/update sync_mappings with results
  - Return push portion of `SyncRunSummary`
- **Depends on:** Task 2.1, Task 1.5
- **Test:** Unit test with mock provider: new entries pushed, existing entries updated

### Task 2.4 — Sync engine: orchestrator
- **File:** `app/server/services/syncEngine.ts`
- **Action:** Implement `runSync(userId, providerId, options)` → `SyncRunSummary`
  - Load provider from registry
  - Determine direction (from provider or options override)
  - Run pull phase if direction includes ingest
  - Run push phase if direction includes export
  - Combine results into `SyncRunSummary`
  - Support `dryRun` option (compute changes but don't apply)
- **Depends on:** Task 2.2, Task 2.3
- **Test:** Integration test: full sync cycle with mock provider

### Task 2.5 — API: sync status endpoint
- **File:** `app/server/api/v1/sync/status.get.ts`
- **Action:** Return server time, entry counts, last modified, per-provider stats
- **Depends on:** Task 2.1
- **Test:** API test: call endpoint, verify response shape

### Task 2.6 — API: sync trigger endpoint
- **File:** `app/server/api/v1/sync/trigger.post.ts`
- **Action:** Accept `{ provider, direction, dryRun }`, run sync engine, return summary
- **Validation:** Provider must exist in registry, direction must be valid for provider
- **Depends on:** Task 2.4
- **Test:** API test: trigger sync with mock provider, verify summary

### Task 2.7 — API: sync mappings endpoints
- **Files:** `app/server/api/v1/sync/mappings/index.get.ts`, `app/server/api/v1/sync/mappings/[id].delete.ts`
- **Action:** List mappings (with provider filter), delete mapping
- **Depends on:** Task 2.1
- **Test:** API test: list mappings, delete mapping, verify entry unaffected

### Task 2.8 — Add `sync:manage` permission
- **File:** `app/types/api.d.ts`
- **Action:** Add `'sync:manage'` to `Permission` union type
- **Wire up:** Check permission in sync trigger and mapping endpoints
- **Depends on:** Nothing
- **Test:** API test: verify 403 without permission

---

## Phase 3: Obsidian Provider

### Task 3.1 — Markdown parser
- **File:** `app/modules/sync-providers/obsidian/markdown.ts`
- **Action:** Implement `parseMarkdownEntry(content)` → `{ frontmatter, body, title }`
  - Split on `---` delimiters for YAML frontmatter
  - Parse YAML to object (use `yaml` package or simple parser)
  - Extract first `# heading` as title
  - Remaining content = body (maps to `notes`)
- **Depends on:** Nothing
- **Test:** Unit test: various frontmatter formats, missing frontmatter, empty body, special characters

### Task 3.2 — Markdown renderer
- **File:** `app/modules/sync-providers/obsidian/markdown.ts`
- **Action:** Implement `renderMarkdownEntry(entry, mapping)` → `string`
  - Generate YAML frontmatter from entry fields
  - Include `tada_id` for roundtrip identification
  - Render `name` as `# heading`
  - Render `notes` as body
  - Preserve tags, category, type in frontmatter
- **Depends on:** Nothing
- **Test:** Unit test: roundtrip (render → parse → compare), all field types

### Task 3.3 — Obsidian provider: configure & fetchChanges
- **File:** `app/modules/sync-providers/obsidian/index.ts`
- **Action:**
  - Implement `configure(config)`: validate paths, set up config
  - Implement `fetchChanges(since)`:
    - `fs.readdir()` to list `.md` files in syncFolder
    - `fs.stat()` for mtime comparison
    - Parse each changed file
    - Determine action: create (no tada_id), update (has tada_id + changed), delete (file gone)
  - Register with `registerSyncProvider()`
- **Depends on:** Task 3.1, Task 1.1
- **Test:** Integration test with temp directory: create files, call fetchChanges, verify ExternalChange[]

### Task 3.4 — Obsidian provider: pushChanges
- **File:** `app/modules/sync-providers/obsidian/index.ts`
- **Action:**
  - Implement `pushChanges(entries)`:
    - For each entry: render markdown, determine file path
    - Write file (atomic: write to `.tmp`, rename)
    - For deleted entries: move to `.trash/` subfolder
    - Return `SyncPushResult[]`
  - Implement `mapToExternal(entry)` using renderer
- **Depends on:** Task 3.2, Task 3.3
- **Test:** Integration test: push entries to temp dir, verify files written correctly

### Task 3.5 — File name pattern support
- **File:** `app/modules/sync-providers/obsidian/index.ts`
- **Action:** Implement `resolveFileName(entry, pattern)`:
  - Support `{{date}}` (YYYY-MM-DD from timestamp)
  - Support `{{name}}` (slugified entry name)
  - Support `{{category}}`, `{{subcategory}}`
  - Support `{{id}}` (entry ID)
  - Sanitize for filesystem safety
- **Depends on:** Nothing
- **Test:** Unit test: various patterns, special characters in names, long names truncated

### Task 3.6 — Sync script: CLI
- **File:** `scripts/sync-obsidian.ts`
- **Action:**
  - Parse CLI args with minimist or similar
  - Support: `--vault`, `--api-key`, `--api-url`, `--config`, `--dry-run`, `--direction`, `--categories`, `--subcategories`
  - Load `.tada-sync.json` from vault root if `--config` specified
  - CLI args override config file values
  - Authenticate via API key
  - Run sync (via HTTP to sync trigger endpoint, or direct service call)
  - Print summary to console (formatted table)
  - Exit code 0/1
- **Depends on:** Task 3.3, Task 3.4, Task 2.6
- **Test:** Integration test: run script with temp vault, verify sync completes

### Task 3.7 — Config file schema & validation
- **File:** `scripts/sync-obsidian.ts` (or separate config module)
- **Action:**
  - Define Zod schema for `.tada-sync.json`
  - Validate on load, clear error messages for invalid config
  - Document all config options
- **Depends on:** Nothing
- **Test:** Unit test: valid config, missing required fields, invalid values

### Task 3.8 — End-to-end sync test
- **File:** `scripts/sync-obsidian.test.ts`
- **Action:** Full cycle test:
  1. Create entries in Ta-Da! test DB
  2. Run push sync → verify files appear in temp vault
  3. Modify a file in the vault
  4. Create a new file in the vault
  5. Run pull sync → verify entries updated/created in DB
  6. Verify sync_mappings are correct throughout
- **Depends on:** All Phase 3 tasks
- **Test:** This IS the test

---

## Summary

| Phase | Tasks | New files | Modified files |
|---|---|---|---|
| 1: Foundation | 6 | 4 | 3 |
| 2: Sync Engine | 8 | 6 | 1 |
| 3: Obsidian | 8 | 4 | 0 |
| **Total** | **22** | **14** | **4** |

### Suggested Implementation Order

Tasks within each phase can often be parallelized. Suggested serial path:

```
1.1 → 1.3 (types → registry)
1.2 (migration, independent)
1.4 → 1.6 (hash util → response field)
1.5 (updated_since, independent)
───── Phase 1 complete ─────
2.1 → 2.2 → 2.3 → 2.4 (mappings service → pull → push → orchestrator)
2.5, 2.6, 2.7, 2.8 (API endpoints, can parallelize)
───── Phase 2 complete ─────
3.1, 3.2 (parser + renderer, can parallelize)
3.5 (filename patterns, independent)
3.3 → 3.4 (provider fetch → push)
3.6 → 3.7 (CLI script + config)
3.8 (e2e test, last)
───── Phase 3 complete ─────
```
