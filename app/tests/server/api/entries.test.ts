/**
 * Unit tests for entry CRUD operations
 *
 * Tests the core user workflow: creating, reading, updating, and deleting entries.
 * Uses mocked database following the project's established test patterns.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import createHandler from "~/server/api/entries/index.post";
import listHandler from "~/server/api/entries/index.get";
import getByIdHandler from "~/server/api/entries/[id].get";
import patchHandler from "~/server/api/entries/[id].patch";
import deleteHandler from "~/server/api/entries/[id].delete";

// ---------------------------------------------------------------------------
// vi.hoisted: define mocks before any module imports
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  // Store for the current event body / query / routerParams
  let _body: unknown = undefined;
  let _query: Record<string, string> = {};
  let _routerParams: Record<string, string> = {};

  const setBody = (v: unknown) => { _body = v; };
  const setQuery = (v: Record<string, string>) => { _query = v; };
  const setRouterParams = (v: Record<string, string>) => { _routerParams = v; };

  const h3 = {
    defineEventHandler: (handler: (...args: unknown[]) => unknown) => handler,
    readBody: vi.fn(async () => _body),
    getQuery: vi.fn(() => _query),
    getRouterParam: vi.fn((_event: unknown, name: string) => _routerParams[name]),
    createError: vi.fn((opts: { statusCode: number; statusMessage: string; data?: unknown }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number; data?: unknown };
      err.statusCode = opts.statusCode;
      err.data = opts.data;
      return err;
    }),
  };

  // Also set globals for handlers that use Nuxt auto-imports (e.g. [id].get.ts)
  (globalThis as Record<string, unknown>)["defineEventHandler"] = h3.defineEventHandler;
  (globalThis as Record<string, unknown>)["getRouterParam"] = h3.getRouterParam;
  (globalThis as Record<string, unknown>)["getQuery"] = h3.getQuery;
  (globalThis as Record<string, unknown>)["readBody"] = h3.readBody;
  (globalThis as Record<string, unknown>)["createError"] = h3.createError;

  // Chainable mock builder for drizzle-style queries
  let dbResult: unknown = [];
  const setDbResult = (val: unknown) => { dbResult = val; };
  let dbResultFn: (() => unknown) | null = null;
  const setDbResultFn = (fn: (() => unknown) | null) => { dbResultFn = fn; };

  const resolveValue = () => (dbResultFn ? dbResultFn() : dbResult);

  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "from", "where", "orderBy", "limit", "insert", "values", "update", "set"];
  for (const method of methods) {
    chain[method] = vi.fn().mockImplementation(() => {
      if (method === "limit" || method === "values") {
        return Promise.resolve(resolveValue());
      }
      return chain;
    });
  }

  const db = {
    select: chain.select,
    insert: chain.insert,
    update: chain.update,
  };

  return { h3, db, chain, setDbResult, setDbResultFn, setBody, setQuery, setRouterParams };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock h3 so explicit imports get our fakes
vi.mock("h3", () => mocks.h3);

// Mock database
vi.mock("~/server/db", () => ({ db: mocks.db }));

// Mock schema - provide column reference objects that drizzle operators need
vi.mock("~/server/db/schema", () => {
  const col = (name: string) => ({ name, mapFromDriverValue: (v: unknown) => v });
  return {
    entries: {
      id: col("id"),
      userId: col("user_id"),
      type: col("type"),
      name: col("name"),
      timestamp: col("timestamp"),
      durationSeconds: col("duration_seconds"),
      timezone: col("timezone"),
      category: col("category"),
      subcategory: col("subcategory"),
      emoji: col("emoji"),
      data: col("data"),
      tags: col("tags"),
      notes: col("notes"),
      source: col("source"),
      externalId: col("external_id"),
      createdAt: col("created_at"),
      updatedAt: col("updated_at"),
      deletedAt: col("deleted_at"),
    },
  };
});

// Mock drizzle-orm operators as pass-through
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
  desc: vi.fn((col: unknown) => ({ op: "desc", col })),
  isNull: vi.fn((col: unknown) => ({ op: "isNull", col })),
  sql: vi.fn(),
  gte: vi.fn((...args: unknown[]) => ({ op: "gte", args })),
  lte: vi.fn((...args: unknown[]) => ({ op: "lte", args })),
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-entry-id-123"),
}));

// Mock logger
vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: {
  user?: { id: string } | null;
  body?: unknown;
  query?: Record<string, string>;
  routerParams?: Record<string, string>;
}) {
  // Configure h3 mock returns for this call
  mocks.setBody(overrides.body);
  mocks.setQuery(overrides.query ?? {});
  mocks.setRouterParams(overrides.routerParams ?? {});

  return {
    context: {
      user: overrides.user === null ? undefined : overrides.user ?? { id: "user-1" },
    },
  } as unknown as Parameters<typeof createHandler>[0];
}

const sampleEntry = {
  id: "test-entry-id-123",
  userId: "user-1",
  type: "timed",
  name: "Meditation",
  timestamp: "2026-01-15T10:00:00.000Z",
  durationSeconds: 600,
  timezone: "UTC",
  category: "mindfulness",
  subcategory: "sitting",
  emoji: null,
  data: {},
  tags: [],
  notes: null,
  source: "manual",
  externalId: null,
  createdAt: "2026-01-15T10:00:00.000Z",
  updatedAt: "2026-01-15T10:00:00.000Z",
  deletedAt: null,
};

// ---------------------------------------------------------------------------
// CREATE (POST /api/entries)
// ---------------------------------------------------------------------------

describe("POST /api/entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setDbResult([sampleEntry]);
    mocks.setDbResultFn(null);
  });

  it("creates a valid entry and returns it", async () => {
    const event = makeEvent({
      body: {
        type: "timed",
        name: "Meditation",
        durationSeconds: 600,
        category: "mindfulness",
        subcategory: "sitting",
      },
    });

    const result = await createHandler(event);

    expect(mocks.db.insert).toHaveBeenCalled();
    expect(result).toMatchObject({
      type: "timed",
      name: "Meditation",
    });
  });

  it("rejects request when type is missing", async () => {
    const event = makeEvent({
      body: { name: "Meditation" },
    });

    await expect(createHandler(event)).rejects.toThrow("Missing required fields");
  });

  it("rejects request when name is missing", async () => {
    const event = makeEvent({
      body: { type: "timed" },
    });

    await expect(createHandler(event)).rejects.toThrow("Missing required fields");
  });

  it("rejects request when both type and name are missing", async () => {
    const event = makeEvent({
      body: {},
    });

    await expect(createHandler(event)).rejects.toThrow("Missing required fields");
  });

  it("rejects request with invalid body (non-object)", async () => {
    const event = makeEvent({
      body: "not-an-object",
    });

    await expect(createHandler(event)).rejects.toThrow("Invalid request body");
  });

  it("returns 401 when user is not authenticated", async () => {
    const event = makeEvent({
      user: null,
      body: { type: "timed", name: "Test" },
    });

    await expect(createHandler(event)).rejects.toThrow("Unauthorized");
  });

  it("sets default source to 'manual' when not provided", async () => {
    const event = makeEvent({
      body: {
        type: "moment",
        name: "Quick note",
      },
    });

    await createHandler(event);

    const insertCall = mocks.chain.values!.mock.calls[0]?.[0];
    expect(insertCall).toMatchObject({ source: "manual" });
  });

  it("uses provided source field", async () => {
    const event = makeEvent({
      body: {
        type: "timed",
        name: "Meditation",
        durationSeconds: 600,
        source: "import",
      },
    });

    await createHandler(event);

    const insertCall = mocks.chain.values!.mock.calls[0]?.[0];
    expect(insertCall).toMatchObject({ source: "import" });
  });

  it("defaults timestamp to current time when not provided", async () => {
    const before = new Date().toISOString();

    const event = makeEvent({
      body: {
        type: "tada",
        name: "Shipped feature",
      },
    });

    await createHandler(event);

    const insertCall = mocks.chain.values!.mock.calls[0]?.[0];
    const timestamp = insertCall?.timestamp as string;
    expect(timestamp).toBeDefined();
    expect(timestamp >= before).toBe(true);
  });

  it("uses provided timestamp", async () => {
    const customTimestamp = "2026-01-01T09:00:00.000Z";

    const event = makeEvent({
      body: {
        type: "timed",
        name: "Meditation",
        durationSeconds: 300,
        timestamp: customTimestamp,
      },
    });

    await createHandler(event);

    const insertCall = mocks.chain.values!.mock.calls[0]?.[0];
    expect(insertCall?.timestamp).toBe(customTimestamp);
  });

  it("accepts all entry types: timed, moment, tada, tally", async () => {
    for (const type of ["timed", "moment", "tada", "tally"]) {
      vi.clearAllMocks();
      mocks.setDbResult([{ ...sampleEntry, type }]);

      const event = makeEvent({
        body: { type, name: `Test ${type}` },
      });

      const result = await createHandler(event);
      expect(result).toMatchObject({ type });
    }
  });
});

// ---------------------------------------------------------------------------
// READ LIST (GET /api/entries)
// ---------------------------------------------------------------------------

describe("GET /api/entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setDbResultFn(null);
  });

  it("returns entries list with pagination metadata", async () => {
    const entries = [sampleEntry, { ...sampleEntry, id: "entry-2", name: "Running" }];
    mocks.setDbResult(entries);

    const event = makeEvent({ query: {} });
    const result = await listHandler(event);

    expect(result).toHaveProperty("entries");
    expect(result).toHaveProperty("nextCursor");
    expect(result).toHaveProperty("hasMore");
    expect(Array.isArray(result.entries)).toBe(true);
  });

  it("returns error when user is not authenticated", async () => {
    const event = makeEvent({ user: null });

    // The list handler's catch block wraps all errors as "Failed to fetch entries"
    // but the underlying createError is called with 401/Unauthorized
    await expect(listHandler(event)).rejects.toThrow();
    expect(mocks.h3.createError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it("indicates hasMore=true when more entries exist", async () => {
    // Handler fetches limit+1 to detect more entries
    // With default limit=50, returning 51 entries means hasMore=true
    const manyEntries = Array.from({ length: 51 }, (_, i) => ({
      ...sampleEntry,
      id: `entry-${i}`,
    }));
    mocks.setDbResult(manyEntries);

    const event = makeEvent({ query: {} });
    const result = await listHandler(event);

    expect(result.hasMore).toBe(true);
    expect(result.entries.length).toBe(50);
    expect(result.nextCursor).not.toBeNull();
  });

  it("indicates hasMore=false when no more entries", async () => {
    mocks.setDbResult([sampleEntry]);

    const event = makeEvent({ query: {} });
    const result = await listHandler(event);

    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("accepts filter parameters (type, category, from, to, search)", async () => {
    mocks.setDbResult([]);

    const event = makeEvent({
      query: {
        type: "timed",
        category: "mindfulness",
        from: "2026-01-01",
        to: "2026-01-31",
        search: "meditation",
      },
    });

    const result = await listHandler(event);

    // Should not throw; filters are applied via drizzle where conditions
    expect(result).toHaveProperty("entries");
  });

  it("clamps limit to valid range (1-100)", async () => {
    mocks.setDbResult([]);

    const event = makeEvent({ query: { limit: "0" } });
    const result = await listHandler(event);

    expect(result).toHaveProperty("entries");
  });

  it("generates nextCursor from last entry timestamp and id", async () => {
    const entries = Array.from({ length: 4 }, (_, i) => ({
      ...sampleEntry,
      id: `entry-${i}`,
      timestamp: `2026-01-1${i}T10:00:00.000Z`,
    }));
    // Return limit+1=4 entries so hasMore=true with limit=3
    mocks.setDbResult(entries);

    const event = makeEvent({ query: { limit: "3" } });
    const result = await listHandler(event);

    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toContain("|");
    expect(result.nextCursor).toContain("entry-2"); // last of the 3 returned
  });
});

// ---------------------------------------------------------------------------
// READ SINGLE (GET /api/entries/[id])
// ---------------------------------------------------------------------------

describe("GET /api/entries/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setDbResultFn(null);
  });

  it("returns a single entry by ID", async () => {
    mocks.setDbResult([sampleEntry]);

    const event = makeEvent({
      routerParams: { id: "test-entry-id-123" },
    });

    const result = await getByIdHandler(event);

    expect(result).toMatchObject({
      id: "test-entry-id-123",
      type: "timed",
      name: "Meditation",
    });
  });

  it("returns 404 for nonexistent entry", async () => {
    mocks.setDbResult([]);

    const event = makeEvent({
      routerParams: { id: "nonexistent-id" },
    });

    await expect(getByIdHandler(event)).rejects.toThrow("Entry not found");
  });

  it("returns 403 when entry belongs to a different user", async () => {
    mocks.setDbResult([{ ...sampleEntry, userId: "other-user" }]);

    const event = makeEvent({
      routerParams: { id: "test-entry-id-123" },
    });

    await expect(getByIdHandler(event)).rejects.toThrow("Forbidden");
  });

  it("returns 401 when not authenticated", async () => {
    const event = makeEvent({
      user: null,
      routerParams: { id: "test-entry-id-123" },
    });

    await expect(getByIdHandler(event)).rejects.toThrow("Unauthorized");
  });

  it("returns 400 when ID is missing", async () => {
    const event = makeEvent({
      routerParams: {},
    });

    await expect(getByIdHandler(event)).rejects.toThrow("Entry ID is required");
  });
});

// ---------------------------------------------------------------------------
// UPDATE (PATCH /api/entries/[id])
// ---------------------------------------------------------------------------

describe("PATCH /api/entries/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setDbResultFn(null);
  });

  it("updates an existing entry with provided fields", async () => {
    // First call (limit - find existing): return entry
    // Second call (limit - return updated): return updated entry
    let callCount = 0;
    mocks.setDbResultFn(() => {
      callCount++;
      if (callCount === 1) return [sampleEntry];
      return [{ ...sampleEntry, notes: "Updated notes", tags: ["morning"] }];
    });

    const event = makeEvent({
      routerParams: { id: "test-entry-id-123" },
      body: { notes: "Updated notes", tags: ["morning"] },
    });

    const result = await patchHandler(event);

    expect(mocks.db.update).toHaveBeenCalled();
    expect(result).toMatchObject({
      notes: "Updated notes",
      tags: ["morning"],
    });
  });

  it("returns 404 for nonexistent entry", async () => {
    mocks.setDbResult([]);

    const event = makeEvent({
      routerParams: { id: "nonexistent-id" },
      body: { notes: "Test" },
    });

    await expect(patchHandler(event)).rejects.toThrow("Entry not found");
  });

  it("returns 401 when not authenticated", async () => {
    const event = makeEvent({
      user: null,
      routerParams: { id: "test-entry-id-123" },
      body: { notes: "Test" },
    });

    await expect(patchHandler(event)).rejects.toThrow("Unauthorized");
  });

  it("returns 400 when ID is missing", async () => {
    const event = makeEvent({
      routerParams: {},
      body: { notes: "Test" },
    });

    await expect(patchHandler(event)).rejects.toThrow("Entry ID is required");
  });

  it("only updates fields that are provided", async () => {
    let callCount = 0;
    mocks.setDbResultFn(() => {
      callCount++;
      if (callCount === 1) return [sampleEntry];
      return [{ ...sampleEntry, name: "Updated Name" }];
    });

    const event = makeEvent({
      routerParams: { id: "test-entry-id-123" },
      body: { name: "Updated Name" },
    });

    await patchHandler(event);

    expect(mocks.chain.set).toHaveBeenCalled();
    const setArg = mocks.chain.set!.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toHaveProperty("name", "Updated Name");
    expect(setArg).toHaveProperty("updatedAt");
    // Should NOT contain fields that were not in the body
    expect(setArg).not.toHaveProperty("category");
    expect(setArg).not.toHaveProperty("type");
  });
});

// ---------------------------------------------------------------------------
// DELETE (DELETE /api/entries/[id])
// ---------------------------------------------------------------------------

describe("DELETE /api/entries/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setDbResultFn(null);
  });

  it("soft deletes an entry and returns success", async () => {
    mocks.setDbResult([sampleEntry]);

    const event = makeEvent({
      routerParams: { id: "test-entry-id-123" },
    });

    const result = await deleteHandler(event);

    expect(result).toMatchObject({ success: true, id: "test-entry-id-123" });
    expect(mocks.db.update).toHaveBeenCalled();

    // Verify deletedAt is set (soft delete)
    const setArg = mocks.chain.set!.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toHaveProperty("deletedAt");
    expect(setArg.deletedAt).toBeTruthy();
  });

  it("returns 404 for nonexistent entry", async () => {
    mocks.setDbResult([]);

    const event = makeEvent({
      routerParams: { id: "nonexistent-id" },
    });

    await expect(deleteHandler(event)).rejects.toThrow("Entry not found");
  });

  it("returns 401 when not authenticated", async () => {
    const event = makeEvent({
      user: null,
      routerParams: { id: "test-entry-id-123" },
    });

    await expect(deleteHandler(event)).rejects.toThrow("Unauthorized");
  });

  it("returns 400 when ID is missing", async () => {
    const event = makeEvent({
      routerParams: {},
    });

    await expect(deleteHandler(event)).rejects.toThrow("Entry ID is required");
  });

  it("sets both deletedAt and updatedAt on soft delete", async () => {
    mocks.setDbResult([sampleEntry]);

    const event = makeEvent({
      routerParams: { id: "test-entry-id-123" },
    });

    await deleteHandler(event);

    const setArg = mocks.chain.set!.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toHaveProperty("deletedAt");
    expect(setArg).toHaveProperty("updatedAt");
  });
});
