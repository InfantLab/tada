/**
 * Unit tests for the sync engine:
 *   - Content hash generation
 *   - Conflict detection logic
 *   - Sync status tracking
 *   - Push/pull operations (with mocked DB)
 *   - Error handling
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — these run before any module-level imports
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  // Nuxt auto-imports
  (globalThis as Record<string, unknown>)["defineEventHandler"] = (
    handler: (...args: unknown[]) => unknown,
  ) => handler;
  (globalThis as Record<string, unknown>)["createError"] = (opts: {
    statusCode: number;
    statusMessage: string;
  }) => {
    const err = new Error(opts.statusMessage) as Error & {
      statusCode: number;
      statusMessage: string;
    };
    err.statusCode = opts.statusCode;
    err.statusMessage = opts.statusMessage;
    return err;
  };

  return {
    getSyncProvider: vi.fn(),
    computeContentHash: vi.fn(),
    createEntry: vi.fn(),
    getEntries: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    getMappingByExternalId: vi.fn(),
    getMappingByEntryId: vi.fn(),
    getMappingsByProvider: vi.fn(),
    createMapping: vi.fn(),
    updateMapping: vi.fn(),
    getLastSyncTimestamp: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("~/registry/syncProviders", () => ({
  getSyncProvider: mocks.getSyncProvider,
}));

vi.mock("~/server/utils/contentHash", () => ({
  computeContentHash: mocks.computeContentHash,
}));

vi.mock("~/server/services/entries", () => ({
  createEntry: mocks.createEntry,
  getEntries: mocks.getEntries,
  updateEntry: mocks.updateEntry,
  deleteEntry: mocks.deleteEntry,
}));

vi.mock("~/server/services/syncMappings", () => ({
  getMappingByExternalId: mocks.getMappingByExternalId,
  getMappingByEntryId: mocks.getMappingByEntryId,
  getMappingsByProvider: mocks.getMappingsByProvider,
  createMapping: mocks.createMapping,
  updateMapping: mocks.updateMapping,
  getLastSyncTimestamp: mocks.getLastSyncTimestamp,
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock DB modules (needed because the global setup file imports them)
vi.mock("~/server/db", () => {
  const noop = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue([]),
  });
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined), where: vi.fn().mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined) }) });
  chain.insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  return { db: chain };
});

vi.mock("~/server/db/schema", () => ({
  users: { id: "id", username: "username", userId: "user_id" },
  entries: { id: "id", userId: "user_id" },
  sessions: { id: "id", userId: "user_id" },
  importLogs: { id: "id" },
  importRecipes: { id: "id" },
  syncMappings: { id: "id", userId: "user_id", provider: "provider", externalId: "external_id", entryId: "entry_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => val),
  and: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(),
}));

vi.mock("~/server/db/operations", () => ({
  withRetry: vi.fn((fn: () => unknown) => fn()),
}));

// ---------------------------------------------------------------------------
// Import after mocks are registered
// ---------------------------------------------------------------------------

import { runSync } from "~/server/services/syncEngine";
import { computeContentHash } from "~/server/utils/contentHash";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    userId: "user-1",
    type: "accomplishment",
    name: "Test entry",
    category: null,
    subcategory: null,
    emoji: null,
    timestamp: "2025-06-01T12:00:00.000Z",
    durationSeconds: null,
    timezone: "UTC",
    data: null,
    tags: [],
    notes: null,
    source: "manual",
    externalId: null,
    createdAt: "2025-06-01T12:00:00.000Z",
    updatedAt: "2025-06-01T12:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function makeMapping(overrides: Record<string, unknown> = {}) {
  return {
    id: "mapping-1",
    userId: "user-1",
    entryId: "entry-1",
    provider: "test-provider",
    externalId: "ext-1",
    externalHash: "ext-hash-aaa",
    internalHash: "int-hash-bbb",
    lastSyncedAt: "2025-06-01T10:00:00.000Z",
    lastSyncDirection: "pull",
    metadata: null,
    createdAt: "2025-06-01T10:00:00.000Z",
    updatedAt: "2025-06-01T10:00:00.000Z",
    ...overrides,
  };
}

function makeProvider(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-provider",
    name: "Test Provider",
    direction: "bidirectional" as const,
    description: "A test sync provider",
    configure: vi.fn(),
    fetchChanges: vi.fn().mockResolvedValue([]),
    pushChanges: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: Content hash generation
// ---------------------------------------------------------------------------

describe("Content hash generation", () => {
  // These test the real computeContentHash (unmocked) via a direct import
  // We need to use the real implementation for these tests.
  // Since we mocked the module, we test the mock contract and test
  // that the sync engine calls computeContentHash correctly.

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call computeContentHash with entry data during pull create", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-1",
          action: "create",
          externalHash: "ext-hash-1",
          data: {
            type: "accomplishment",
            name: "New thing",
            timestamp: "2025-06-01T12:00:00.000Z",
          },
        },
      ]),
    });
    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);
    mocks.getMappingByExternalId.mockResolvedValue(null);

    const createdEntry = makeEntry({ id: "new-entry-1" });
    mocks.createEntry.mockResolvedValue(createdEntry);
    mocks.computeContentHash.mockReturnValue("computed-hash-abc");
    mocks.createMapping.mockResolvedValue(makeMapping());

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(mocks.computeContentHash).toHaveBeenCalledWith(createdEntry);
    expect(mocks.createMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        internalHash: "computed-hash-abc",
        externalHash: "ext-hash-1",
      }),
    );
    expect(result.pulled.created).toBe(1);
  });

  it("should use computeContentHash for change detection on existing entries", async () => {
    const existingMapping = makeMapping({
      externalHash: "old-ext-hash",
      internalHash: "old-int-hash",
    });

    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-1",
          action: "update",
          externalHash: "new-ext-hash",
          data: {
            type: "accomplishment",
            name: "Updated thing",
            timestamp: "2025-06-01T12:00:00.000Z",
          },
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(new Date("2025-06-01T00:00:00Z"));
    mocks.getMappingByExternalId.mockResolvedValue(existingMapping);
    // Internal entry unchanged: current hash matches stored hash
    mocks.computeContentHash.mockReturnValue("old-int-hash");
    mocks.getEntries.mockResolvedValue({
      entries: [makeEntry()],
      pagination: { total: 1, limit: 1, offset: 0, hasMore: false },
    });
    mocks.updateEntry.mockResolvedValue(makeEntry());
    mocks.updateMapping.mockResolvedValue(existingMapping);

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    // Should detect that external changed (new-ext-hash != old-ext-hash)
    // and internal did NOT change (old-int-hash == old-int-hash)
    // so it applies the external update
    expect(result.pulled.updated).toBe(1);
    expect(result.conflicts).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Conflict detection
// ---------------------------------------------------------------------------

describe("Conflict detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect conflict when both sides changed and count it", async () => {
    const existingMapping = makeMapping({
      externalHash: "old-ext-hash",
      internalHash: "old-int-hash",
    });

    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-1",
          action: "update",
          externalHash: "new-ext-hash",
          // External is newer
          externalTimestamp: "2025-06-01T15:00:00.000Z",
          data: {
            type: "accomplishment",
            name: "External update",
            timestamp: "2025-06-01T12:00:00.000Z",
          },
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(new Date("2025-06-01T00:00:00Z"));
    mocks.getMappingByExternalId.mockResolvedValue(existingMapping);
    // Internal also changed: new hash differs from stored hash
    mocks.computeContentHash.mockReturnValue("new-int-hash");
    mocks.getEntries.mockResolvedValue({
      entries: [makeEntry({ updatedAt: "2025-06-01T13:00:00.000Z" })],
      pagination: { total: 1, limit: 1, offset: 0, hasMore: false },
    });
    mocks.updateEntry.mockResolvedValue(makeEntry());
    mocks.updateMapping.mockResolvedValue(existingMapping);

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.conflicts).toBe(1);
    // External timestamp (15:00) > internal (13:00), so external wins -> update
    expect(result.pulled.updated).toBe(1);
  });

  it("should skip external change when internal is newer (last-write-wins)", async () => {
    const existingMapping = makeMapping({
      externalHash: "old-ext-hash",
      internalHash: "old-int-hash",
    });

    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-1",
          action: "update",
          externalHash: "new-ext-hash",
          // External is older
          externalTimestamp: "2025-06-01T11:00:00.000Z",
          data: {
            type: "accomplishment",
            name: "External update",
            timestamp: "2025-06-01T12:00:00.000Z",
          },
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(new Date("2025-06-01T00:00:00Z"));
    mocks.getMappingByExternalId.mockResolvedValue(existingMapping);
    // Internal also changed
    mocks.computeContentHash.mockReturnValue("new-int-hash");
    mocks.getEntries.mockResolvedValue({
      entries: [makeEntry({ updatedAt: "2025-06-01T14:00:00.000Z" })],
      pagination: { total: 1, limit: 1, offset: 0, hasMore: false },
    });
    mocks.updateMapping.mockResolvedValue(existingMapping);

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.conflicts).toBe(1);
    // Internal wins, external change is skipped
    expect(result.pulled.skipped).toBe(1);
    expect(result.pulled.updated).toBe(0);
    // updateEntry should NOT be called (internal wins)
    expect(mocks.updateEntry).not.toHaveBeenCalled();
  });

  it("should not flag conflict when only external changed", async () => {
    const existingMapping = makeMapping({
      externalHash: "old-ext-hash",
      internalHash: "old-int-hash",
    });

    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-1",
          action: "update",
          externalHash: "new-ext-hash",
          data: {
            type: "accomplishment",
            name: "External update",
            timestamp: "2025-06-01T12:00:00.000Z",
          },
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(new Date("2025-06-01T00:00:00Z"));
    mocks.getMappingByExternalId.mockResolvedValue(existingMapping);
    // Internal NOT changed: hash matches stored hash
    mocks.computeContentHash.mockReturnValue("old-int-hash");
    mocks.getEntries.mockResolvedValue({
      entries: [makeEntry()],
      pagination: { total: 1, limit: 1, offset: 0, hasMore: false },
    });
    mocks.updateEntry.mockResolvedValue(makeEntry());
    mocks.updateMapping.mockResolvedValue(existingMapping);

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.conflicts).toBe(0);
    expect(result.pulled.updated).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: Sync status tracking (summary)
// ---------------------------------------------------------------------------

describe("Sync status tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a complete SyncRunSummary with timestamps", async () => {
    const provider = makeProvider({ direction: "ingest" });
    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);

    const result = await runSync("user-1", "test-provider");

    expect(result).toMatchObject({
      provider: "test-provider",
      direction: "ingest",
      pulled: { created: 0, updated: 0, deleted: 0, skipped: 0 },
      pushed: { created: 0, updated: 0, deleted: 0, skipped: 0 },
      conflicts: 0,
      errors: [],
    });
    expect(result.startedAt).toBeTruthy();
    expect(result.completedAt).toBeTruthy();
  });

  it("should track skipped items when external hash unchanged", async () => {
    const existingMapping = makeMapping({ externalHash: "same-hash" });

    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-1",
          action: "update",
          externalHash: "same-hash", // same as mapping
          data: {
            type: "accomplishment",
            name: "No change",
            timestamp: "2025-06-01T12:00:00.000Z",
          },
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);
    mocks.getMappingByExternalId.mockResolvedValue(existingMapping);

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.pulled.skipped).toBe(1);
    expect(result.pulled.updated).toBe(0);
  });

  it("should track deleted items", async () => {
    const existingMapping = makeMapping();

    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        { externalId: "ext-1", action: "delete" },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);
    mocks.getMappingByExternalId.mockResolvedValue(existingMapping);
    mocks.deleteEntry.mockResolvedValue(undefined);
    mocks.updateMapping.mockResolvedValue(existingMapping);

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.pulled.deleted).toBe(1);
  });

  it("should skip deletes for items with no mapping", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        { externalId: "unknown-ext", action: "delete" },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);
    mocks.getMappingByExternalId.mockResolvedValue(null);

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.pulled.skipped).toBe(1);
    expect(result.pulled.deleted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Pull operations
// ---------------------------------------------------------------------------

describe("Pull operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create new entry and mapping for pull create", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-new",
          action: "create",
          externalHash: "ext-hash-new",
          data: {
            type: "accomplishment",
            name: "Pulled item",
            timestamp: "2025-06-01T12:00:00.000Z",
            tags: ["sync"],
          },
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);
    mocks.getMappingByExternalId.mockResolvedValue(null);

    const createdEntry = makeEntry({ id: "new-id" });
    mocks.createEntry.mockResolvedValue(createdEntry);
    mocks.computeContentHash.mockReturnValue("new-hash");
    mocks.createMapping.mockResolvedValue(makeMapping());

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.pulled.created).toBe(1);
    expect(mocks.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        name: "Pulled item",
        type: "accomplishment",
        tags: ["sync"],
      }),
    );
    expect(mocks.createMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        entryId: "new-id",
        provider: "test-provider",
        externalId: "ext-new",
        externalHash: "ext-hash-new",
        internalHash: "new-hash",
        lastSyncDirection: "pull",
      }),
    );
  });

  it("should skip items with no data", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        { externalId: "ext-1", action: "create" },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);
    mocks.getMappingByExternalId.mockResolvedValue(null);

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.pulled.skipped).toBe(1);
    expect(mocks.createEntry).not.toHaveBeenCalled();
  });

  it("should treat update with no existing mapping as create", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-orphan",
          action: "update",
          externalHash: "hash-x",
          data: {
            type: "accomplishment",
            name: "Orphan update",
            timestamp: "2025-06-01T12:00:00.000Z",
          },
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);
    mocks.getMappingByExternalId.mockResolvedValue(null);

    const created = makeEntry({ id: "orphan-entry" });
    mocks.createEntry.mockResolvedValue(created);
    mocks.computeContentHash.mockReturnValue("hash-y");
    mocks.createMapping.mockResolvedValue(makeMapping());

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.pulled.created).toBe(1);
    expect(mocks.createEntry).toHaveBeenCalled();
  });

  it("should not mutate DB in dry-run mode", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-1",
          action: "create",
          data: {
            type: "accomplishment",
            name: "Dry run item",
            timestamp: "2025-06-01T12:00:00.000Z",
          },
        },
        { externalId: "ext-2", action: "delete" },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);
    mocks.getMappingByExternalId
      .mockResolvedValueOnce(null) // create
      .mockResolvedValueOnce(makeMapping()); // delete

    const result = await runSync("user-1", "test-provider", {
      direction: "pull",
      dryRun: true,
    });

    expect(result.pulled.created).toBe(1);
    expect(result.pulled.deleted).toBe(1);
    expect(mocks.createEntry).not.toHaveBeenCalled();
    expect(mocks.deleteEntry).not.toHaveBeenCalled();
    expect(mocks.createMapping).not.toHaveBeenCalled();
    expect(mocks.updateMapping).not.toHaveBeenCalled();
  });

  it("should respect provider direction — ingest-only skips push", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([]),
      pushChanges: vi.fn().mockResolvedValue([]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);

    await runSync("user-1", "test-provider", { direction: "both" });

    expect(provider.fetchChanges).toHaveBeenCalled();
    expect(provider.pushChanges).not.toHaveBeenCalled();
  });

  it("should respect provider direction — export-only skips pull", async () => {
    const entry = makeEntry({ id: "export-entry", updatedAt: "2025-06-02T10:00:00.000Z" });
    const provider = makeProvider({
      direction: "export",
      fetchChanges: vi.fn().mockResolvedValue([]),
      pushChanges: vi.fn().mockResolvedValue([
        { externalId: "ext-out", entryId: "export-entry", success: true },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(new Date("2025-06-01T00:00:00Z"));
    mocks.getEntries.mockResolvedValue({
      entries: [entry],
      pagination: { total: 1, limit: 1000, offset: 0, hasMore: false },
    });
    mocks.getMappingByEntryId.mockResolvedValue(null);
    mocks.computeContentHash.mockReturnValue("hash");
    mocks.createMapping.mockResolvedValue(makeMapping());

    await runSync("user-1", "test-provider", { direction: "both" });

    expect(provider.fetchChanges).not.toHaveBeenCalled();
    expect(provider.pushChanges).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: Push operations
// ---------------------------------------------------------------------------

describe("Push operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should push changed entries to provider", async () => {
    const entry = makeEntry({ id: "entry-push-1", updatedAt: "2025-06-02T10:00:00.000Z" });

    const provider = makeProvider({
      direction: "export",
      pushChanges: vi.fn().mockResolvedValue([
        {
          externalId: "pushed-ext-1",
          entryId: "entry-push-1",
          success: true,
          externalHash: "pushed-hash",
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(new Date("2025-06-01T00:00:00Z"));
    mocks.getEntries.mockResolvedValue({
      entries: [entry],
      pagination: { total: 1, limit: 1000, offset: 0, hasMore: false },
    });
    mocks.getMappingByEntryId.mockResolvedValue(null);
    mocks.computeContentHash.mockReturnValue("push-int-hash");
    mocks.createMapping.mockResolvedValue(makeMapping());

    const result = await runSync("user-1", "test-provider", { direction: "push" });

    expect(result.pushed.created).toBe(1);
    expect(mocks.createMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: "pushed-ext-1",
        externalHash: "pushed-hash",
        lastSyncDirection: "push",
      }),
    );
  });

  it("should update existing mapping on push of already-mapped entry", async () => {
    const entry = makeEntry({ id: "entry-push-2", updatedAt: "2025-06-02T10:00:00.000Z" });
    const existingMapping = makeMapping({
      id: "map-push-2",
      entryId: "entry-push-2",
      lastSyncDirection: "push",
      lastSyncedAt: "2025-06-01T00:00:00.000Z",
    });

    const provider = makeProvider({
      direction: "export",
      pushChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-push-2",
          entryId: "entry-push-2",
          success: true,
          externalHash: "new-ext-hash",
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(new Date("2025-06-01T00:00:00Z"));
    mocks.getEntries.mockResolvedValue({
      entries: [entry],
      pagination: { total: 1, limit: 1000, offset: 0, hasMore: false },
    });
    // First call: during entry collection; second call: after push result
    mocks.getMappingByEntryId
      .mockResolvedValueOnce(existingMapping)
      .mockResolvedValueOnce(existingMapping);
    mocks.computeContentHash.mockReturnValue("push-int-hash");
    mocks.updateMapping.mockResolvedValue(existingMapping);

    const result = await runSync("user-1", "test-provider", { direction: "push" });

    expect(result.pushed.updated).toBe(1);
    expect(mocks.updateMapping).toHaveBeenCalledWith(
      "map-push-2",
      expect.objectContaining({
        externalId: "ext-push-2",
        lastSyncDirection: "push",
      }),
    );
  });

  it("should skip entries that were just pulled and not modified since", async () => {
    const entry = makeEntry({
      id: "entry-just-pulled",
      updatedAt: "2025-06-01T09:00:00.000Z",
    });
    const mapping = makeMapping({
      entryId: "entry-just-pulled",
      lastSyncDirection: "pull",
      lastSyncedAt: "2025-06-01T10:00:00.000Z", // sync is after entry update
    });

    const provider = makeProvider({
      direction: "export",
      pushChanges: vi.fn().mockResolvedValue([]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(new Date("2025-06-01T00:00:00Z"));
    mocks.getEntries.mockResolvedValue({
      entries: [entry],
      pagination: { total: 1, limit: 1000, offset: 0, hasMore: false },
    });
    mocks.getMappingByEntryId.mockResolvedValue(mapping);

    const result = await runSync("user-1", "test-provider", { direction: "push" });

    // The provider's pushChanges should be called with empty array
    // (since the only entry was skipped)
    expect(provider.pushChanges).not.toHaveBeenCalled();
  });

  it("should count dry-run push operations without calling provider", async () => {
    const entry = makeEntry({ id: "dry-push-1" });

    const provider = makeProvider({
      direction: "export",
      pushChanges: vi.fn().mockResolvedValue([]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(new Date("2025-06-01T00:00:00Z"));
    mocks.getEntries.mockResolvedValue({
      entries: [entry],
      pagination: { total: 1, limit: 1000, offset: 0, hasMore: false },
    });
    mocks.getMappingByEntryId.mockResolvedValue(null);

    const result = await runSync("user-1", "test-provider", {
      direction: "push",
      dryRun: true,
    });

    expect(result.pushed.created).toBe(1);
    expect(provider.pushChanges).not.toHaveBeenCalled();
  });

  it("should report push errors in summary", async () => {
    const entry = makeEntry({ id: "entry-fail", updatedAt: "2025-06-02T10:00:00.000Z" });

    const provider = makeProvider({
      direction: "export",
      pushChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-fail",
          entryId: "entry-fail",
          success: false,
          error: "Remote write failed",
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(new Date("2025-06-01T00:00:00Z"));
    mocks.getEntries.mockResolvedValue({
      entries: [entry],
      pagination: { total: 1, limit: 1000, offset: 0, hasMore: false },
    });
    mocks.getMappingByEntryId.mockResolvedValue(null);

    const result = await runSync("user-1", "test-provider", { direction: "push" });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      message: "Remote write failed",
      entryId: "entry-fail",
    });
    expect(result.pushed.created).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Error handling
// ---------------------------------------------------------------------------

describe("Error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw when provider is not found in registry", async () => {
    mocks.getSyncProvider.mockReturnValue(undefined);

    await expect(runSync("user-1", "nonexistent")).rejects.toThrow(
      'Sync provider "nonexistent" not found in registry',
    );
  });

  it("should capture per-item errors during pull without aborting", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockResolvedValue([
        {
          externalId: "ext-ok",
          action: "create",
          data: {
            type: "accomplishment",
            name: "OK item",
            timestamp: "2025-06-01T12:00:00.000Z",
          },
        },
        {
          externalId: "ext-bad",
          action: "create",
          data: {
            type: "accomplishment",
            name: "Bad item",
            timestamp: "2025-06-01T12:00:00.000Z",
          },
        },
      ]),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);
    mocks.getMappingByExternalId.mockResolvedValue(null);

    // First entry succeeds
    const okEntry = makeEntry({ id: "ok-1" });
    mocks.createEntry
      .mockResolvedValueOnce(okEntry)
      .mockRejectedValueOnce(new Error("DB constraint violation"));
    mocks.computeContentHash.mockReturnValue("hash-ok");
    mocks.createMapping.mockResolvedValue(makeMapping());

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.pulled.created).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      message: "DB constraint violation",
      externalId: "ext-bad",
    });
  });

  it("should capture top-level fetchChanges errors in summary", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockRejectedValue(new Error("Network timeout")),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toBe("Network timeout");
    expect(result.completedAt).toBeTruthy();
  });

  it("should handle non-Error thrown values gracefully", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockRejectedValue("string error"),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);

    const result = await runSync("user-1", "test-provider", { direction: "pull" });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toBe("string error");
  });

  it("should still set completedAt even when errors occur", async () => {
    const provider = makeProvider({
      direction: "ingest",
      fetchChanges: vi.fn().mockRejectedValue(new Error("Fail")),
    });

    mocks.getSyncProvider.mockReturnValue(provider);
    mocks.getLastSyncTimestamp.mockResolvedValue(null);

    const result = await runSync("user-1", "test-provider");

    expect(result.completedAt).toBeTruthy();
    expect(new Date(result.completedAt).getTime()).toBeGreaterThan(0);
  });
});
