# Spec 007: Sync API Extensions

> Bidirectional sync between Ta-Da! and external systems (Obsidian, etc.)

## Status

- **Status:** Draft
- **Author:** Ted (OpenClaw)
- **Created:** 2026-03-07
- **Target:** v0.5.0+

## Problem

Users want to sync Ta-Da! entries with other systems (Obsidian vaults, plain files, other apps). Current API supports CRUD but lacks:

1. **Change detection** - No efficient way to ask "what changed since my last sync?"
2. **External ID tracking** - No way to store mappings to external systems
3. **Conflict metadata** - No content hashing for fast change comparison

## Goals

- Enable efficient incremental sync (don't re-fetch everything)
- Support bidirectional sync with conflict detection
- Stay simple - minimal API surface
- Don't break existing API consumers

## Non-Goals

- Real-time sync (webhooks exist for that)
- Built-in Obsidian adapter (that lives outside Ta-Da!)
- Multi-user sync / sharing

---

## API Additions

### 1. Updated Since Filter

Add `updated_since` query parameter to existing endpoints.

```http
GET /api/v1/entries?updated_since=2026-03-07T12:00:00Z
```

Returns entries where `updatedAt > updated_since` OR `deletedAt > updated_since`.

**Includes soft-deleted entries** so sync clients know what to remove.

Add `include_deleted=true` parameter to explicitly include soft-deleted entries (default false for normal queries, but implied when `updated_since` is present).

### 2. Sync Metadata Field

Add optional `syncMeta` field to Entry model:

```typescript
interface Entry {
  // ... existing fields ...
  
  syncMeta?: {
    [systemKey: string]: {
      externalId: string      // Path, ID, or URI in external system
      lastSyncedAt: string    // ISO timestamp
      externalHash?: string   // Hash of external content at last sync
    }
  }
}
```

**Example:**

```json
{
  "id": "entry_abc123",
  "category": "journal",
  "subcategory": "dream",
  "note": "Flying over mountains...",
  "syncMeta": {
    "obsidian": {
      "externalId": "/dreams/flying-mountains.md",
      "lastSyncedAt": "2026-03-07T14:00:00Z",
      "externalHash": "sha256:a1b2c3d4..."
    }
  }
}
```

**Update via PATCH:**

```http
PATCH /api/v1/entries/:id
{
  "syncMeta": {
    "obsidian": {
      "externalId": "/dreams/flying-mountains.md",
      "lastSyncedAt": "2026-03-07T14:00:00Z"
    }
  }
}
```

`syncMeta` merges at the system key level (doesn't replace entire object).

### 3. Content Hash Field

Add computed `contentHash` field to Entry response:

```typescript
interface Entry {
  // ... existing fields ...
  contentHash: string  // SHA-256 of canonical content
}
```

**Hash computation** (deterministic):

```typescript
function computeContentHash(entry: Entry): string {
  const canonical = JSON.stringify({
    note: entry.note,
    title: entry.title,
    mood: entry.mood,
    energy: entry.energy,
    tags: entry.tags.sort(),
    startTime: entry.startTime,
    endTime: entry.endTime,
    duration: entry.duration,
    category: entry.category,
    subcategory: entry.subcategory
  })
  return sha256(canonical)
}
```

**Read-only** - computed on response, not stored. Allows sync clients to quickly detect changes without deep comparison.

### 4. Sync Status Endpoint (Optional)

Convenience endpoint for sync orchestration:

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
  "lastModified": "2026-03-07T14:25:00.000Z"
}
```

Allows sync clients to quickly check if anything changed before fetching entries.

---

## Database Changes

### Migration

```sql
-- Add syncMeta column (JSONB for PostgreSQL, JSON for SQLite)
ALTER TABLE entries ADD COLUMN sync_meta JSON;

-- Index for efficient updated_since queries
CREATE INDEX idx_entries_updated_at ON entries(updated_at);
CREATE INDEX idx_entries_deleted_at ON entries(deleted_at);
```

### Validation

- `syncMeta` keys must be alphanumeric + underscore (e.g., `obsidian`, `notion_workspace`)
- `externalId` max length: 1024 characters
- `externalHash` format: `algorithm:hex` (e.g., `sha256:abc123...`)

---

## Sync Algorithm (Client Reference)

For implementers building sync clients:

```
1. GET /api/v1/sync/status
   → Check if lastModified > our lastSync

2. GET /api/v1/entries?updated_since={lastSync}&include_deleted=true
   → Get all changed entries

3. For each entry:
   a. Look up by syncMeta.{system}.externalId
   b. Compare contentHash with local hash
   c. Determine action:
      - New in Ta-Da!: create locally
      - Deleted in Ta-Da!: delete locally (or archive)
      - Changed in Ta-Da! only: update locally
      - Changed locally only: PATCH to Ta-Da!
      - Both changed: CONFLICT → resolve

4. For local-only items (new files):
   POST /api/v1/entries with syncMeta

5. Store new lastSync timestamp
```

---

## Security Considerations

- `syncMeta` is private per-user (not exposed in exports or sharing)
- API keys need `entries:write` permission to update `syncMeta`
- External IDs could leak file paths - sanitize in any public features

---

## Example: Obsidian Sync Flow

**Initial sync (Ta-Da! → Obsidian):**

1. Fetch all dream entries: `GET /entries?category=journal&subcategory=dream`
2. For each entry without `syncMeta.obsidian`:
   - Create markdown file in vault
   - PATCH entry with `syncMeta.obsidian.externalId`

**Ongoing sync:**

1. `GET /entries?category=journal&subcategory=dream&updated_since=...`
2. For each changed entry:
   - Read local file, compute hash
   - Compare with `contentHash`
   - Sync appropriately

**Obsidian → Ta-Da! (new dream logged in Obsidian):**

1. Scan vault for files without matching Ta-Da! entry
2. `POST /entries` with full data + `syncMeta.obsidian`

---

## Rollout

### Phase 1 (MVP)
- [ ] `updated_since` query parameter
- [ ] `include_deleted` query parameter
- [ ] `syncMeta` field (store + retrieve)

### Phase 2
- [ ] `contentHash` computed field
- [ ] `/sync/status` endpoint

### Phase 3
- [ ] Sync client reference implementation (CLI tool)
- [ ] Obsidian plugin or bridge script

---

## Open Questions

1. **Pagination with `updated_since`** - Use cursor or offset? (Recommend cursor for consistency)
2. **Conflict resolution strategies** - Should Ta-Da! store conflict history?
3. **Bulk operations** - Need `PATCH /entries/bulk` for efficiency?

---

## References

- [Ta-Da! API Specification](../docs/tada-api/API-SPECIFICATION.md)
- [Obsidian Sync Architecture](https://docs.obsidian.md/sync)
- [CouchDB Replication Protocol](https://docs.couchdb.org/en/stable/replication/protocol.html) (inspiration for change feeds)
