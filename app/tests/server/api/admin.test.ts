/**
 * Unit tests for admin API endpoints:
 *   GET  /api/v1/admin/users        — list users
 *   GET  /api/v1/admin/users/:id    — user detail
 *   PATCH /api/v1/admin/users/:id   — update user
 *   DELETE /api/v1/admin/users/:id/sessions — invalidate sessions
 *   GET  /api/v1/admin/stats        — system stats
 *   GET  /api/v1/admin/health       — system health
 *
 * Uses the same hoisted-mock pattern as auth.test.ts and entries.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import usersListHandler from "~/server/api/v1/admin/users/index.get";
import userDetailHandler from "~/server/api/v1/admin/users/[id].get";
import userPatchHandler from "~/server/api/v1/admin/users/[id].patch";
import sessionsDeleteHandler from "~/server/api/v1/admin/users/[id]/sessions.delete";
import statsHandler from "~/server/api/v1/admin/stats.get";
import healthHandler from "~/server/api/v1/admin/health.get";

// ---------------------------------------------------------------------------
// vi.hoisted: define mocks before any module imports
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
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
    createError: vi.fn((opts: { statusCode: number; message?: string; statusMessage?: string; data?: unknown }) => {
      const msg = opts.message || opts.statusMessage || "Error";
      const err = new Error(msg) as Error & { statusCode: number; data?: unknown };
      err.statusCode = opts.statusCode;
      err.data = opts.data;
      return err;
    }),
    setResponseStatus: vi.fn(),
    setResponseHeader: vi.fn(),
    setResponseHeaders: vi.fn(),
  };

  // Set globals for Nuxt auto-imports
  (globalThis as Record<string, unknown>)["defineEventHandler"] = h3.defineEventHandler;
  (globalThis as Record<string, unknown>)["getRouterParam"] = h3.getRouterParam;
  (globalThis as Record<string, unknown>)["getQuery"] = h3.getQuery;
  (globalThis as Record<string, unknown>)["readBody"] = h3.readBody;
  (globalThis as Record<string, unknown>)["createError"] = h3.createError;
  (globalThis as Record<string, unknown>)["setResponseStatus"] = h3.setResponseStatus;
  (globalThis as Record<string, unknown>)["setResponseHeader"] = h3.setResponseHeader;
  (globalThis as Record<string, unknown>)["setResponseHeaders"] = h3.setResponseHeaders;

  // Chainable DB mock — every method returns the chain, and the chain
  // itself is thenable so `await db.select().from().where()` resolves.
  let dbResult: unknown = [];
  const setDbResult = (val: unknown) => { dbResult = val; };
  let dbResultFn: (() => unknown) | null = null;
  const setDbResultFn = (fn: (() => unknown) | null) => { dbResultFn = fn; };

  const resolveValue = () => (dbResultFn ? dbResultFn() : dbResult);

  const chain: Record<string, ReturnType<typeof vi.fn>> & { then: ReturnType<typeof vi.fn> } = {} as any;

  // Make chain thenable so `await chain` resolves to dbResult
  chain.then = vi.fn((resolve?: (v: unknown) => unknown) =>
    Promise.resolve(resolveValue()).then(resolve),
  );

  const methods = [
    "select", "from", "where", "orderBy", "limit", "offset",
    "insert", "values", "update", "set", "delete",
    "groupBy", "leftJoin",
  ];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  const db = {
    select: chain.select,
    insert: chain.insert,
    update: chain.update,
    delete: chain.delete,
  };

  // Admin env control
  let adminUserIds = "";
  const setAdminUserIds = (ids: string) => { adminUserIds = ids; };
  const getAdminUserIds = () => adminUserIds;

  // Mock stats result
  let mockStatsResult: unknown = {
    period: "7d",
    periodStart: "2026-01-01T00:00:00.000Z",
    periodEnd: "2026-01-08T00:00:00.000Z",
    users: { total: 10, newInPeriod: 2, activeInPeriod: 5, byTier: {}, byStatus: {} },
    entries: { totalInPeriod: 100, byType: {}, bySource: {}, avgPerActiveUser: 20 },
    rhythms: { totalActive: 5, avgPerUser: 1 },
    newsletter: { totalActive: 0, newInPeriod: 0, unsubscribedInPeriod: 0 },
    subscriptions: { activeRevenue: 0, newInPeriod: 0, cancelledInPeriod: 0, churnRate: 0 },
    feedback: { newInPeriod: 0, openTotal: 0 },
  };
  const setMockStatsResult = (val: unknown) => { mockStatsResult = val; };
  const getMockStatsResult = () => mockStatsResult;

  return {
    h3, db, chain,
    setDbResult, setDbResultFn,
    setBody, setQuery, setRouterParams,
    setAdminUserIds, getAdminUserIds,
    setMockStatsResult, getMockStatsResult,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("h3", () => mocks.h3);

vi.mock("~/server/db", () => ({ db: mocks.db }));

vi.mock("~/server/db/schema", () => {
  const col = (name: string) => ({ name, mapFromDriverValue: (v: unknown) => v });
  return {
    users: {
      id: col("id"),
      username: col("username"),
      email: col("email"),
      emailVerified: col("email_verified"),
      timezone: col("timezone"),
      subscriptionTier: col("subscription_tier"),
      subscriptionStatus: col("subscription_status"),
      stripeCustomerId: col("stripe_customer_id"),
      subscriptionExpiresAt: col("subscription_expires_at"),
      createdAt: col("created_at"),
      updatedAt: col("updated_at"),
      passwordHash: col("password_hash"),
    },
    entries: {
      id: col("id"),
      userId: col("user_id"),
      type: col("type"),
      name: col("name"),
      timestamp: col("timestamp"),
      source: col("source"),
      deletedAt: col("deleted_at"),
    },
    rhythms: {
      id: col("id"),
      userId: col("user_id"),
    },
    sessions: {
      id: col("id"),
      userId: col("user_id"),
    },
    apiKeys: {
      id: col("id"),
      userId: col("user_id"),
      revokedAt: col("revoked_at"),
    },
    feedback: {
      id: col("id"),
      status: col("status"),
      createdAt: col("created_at"),
    },
    newsletterSubscribers: {
      id: col("id"),
      status: col("status"),
      createdAt: col("created_at"),
      unsubscribedAt: col("unsubscribed_at"),
    },
    authEvents: {
      id: col("id"),
      userId: col("user_id"),
      eventType: col("event_type"),
      createdAt: col("created_at"),
      metadata: col("metadata"),
    },
    subscriptionEvents: {
      id: col("id"),
      userId: col("user_id"),
      eventType: col("event_type"),
      createdAt: col("created_at"),
      data: col("data"),
    },
  };
});

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
  or: vi.fn((...args: unknown[]) => ({ op: "or", args })),
  desc: vi.fn((col: unknown) => ({ op: "desc", col })),
  asc: vi.fn((col: unknown) => ({ op: "asc", col })),
  like: vi.fn((...args: unknown[]) => ({ op: "like", args })),
  sql: vi.fn((...args: unknown[]) => ({ op: "sql", args })),
  count: vi.fn(() => ({ op: "count" })),
  isNull: vi.fn((col: unknown) => ({ op: "isNull", col })),
  isNotNull: vi.fn((col: unknown) => ({ op: "isNotNull", col })),
  gte: vi.fn((...args: unknown[]) => ({ op: "gte", args })),
  lte: vi.fn((...args: unknown[]) => ({ op: "lte", args })),
  ne: vi.fn((...args: unknown[]) => ({ op: "ne", args })),
  inArray: vi.fn((...args: unknown[]) => ({ op: "inArray", args })),
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("~/server/utils/authEvents", () => ({
  logAuthEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("~/server/utils/cloudMode", () => ({
  isCloudMode: vi.fn().mockReturnValue(false),
}));

vi.mock("zod", () => {
  // Fully-chainable zod mock: every method returns the same proxy-like schema
  // so that any chain of .int().min().max().default().optional() etc. works.
  const createSchema = (): any => {
    const schema: any = {};
    const _self = () => schema;
    const methods = [
      "optional", "default", "nullable", "strict", "int", "min", "max",
      "datetime", "safeParse", "object", "string", "number", "boolean",
      "enum", "array", "union", "intersection", "literal", "tuple",
    ];
    for (const m of methods) {
      if (m === "safeParse") {
        schema[m] = vi.fn((data: unknown) => ({
          success: true,
          data: data || {},
        }));
      } else {
        schema[m] = vi.fn((..._args: unknown[]) => createSchema());
      }
    }
    // Make it thenable (no-op)
    schema.then = undefined;
    return schema;
  };

  const _root = createSchema();

  return {
    z: {
      object: (_shape: Record<string, unknown>) => createSchema(),
      string: () => createSchema(),
      number: () => createSchema(),
      boolean: () => createSchema(),
      enum: (_values: string[]) => createSchema(),
      coerce: {
        number: () => createSchema(),
      },
    },
  };
});

vi.mock("~/server/services/admin-stats", () => ({
  getAdminStats: vi.fn(async () => mocks.getMockStatsResult()),
}));

// Mock admin utility — we need to re-implement requireAdmin inline
// because the real one reads process.env which we control via mocks
vi.mock("~/server/utils/admin", () => ({
  isAdmin: vi.fn((userId: string) => {
    const adminIds = mocks.getAdminUserIds()
      .split(",")
      .map((id: string) => id.trim())
      .filter(Boolean);
    return adminIds.includes(userId);
  }),
  requireAdmin: vi.fn((event: any, _permission: string) => {
    const auth = event.context?.auth;
    if (!auth) {
      throw (globalThis as any).createError({
        statusCode: 401,
        message: "Authentication required",
      });
    }
    const adminIds = mocks.getAdminUserIds()
      .split(",")
      .map((id: string) => id.trim())
      .filter(Boolean);
    if (!adminIds.includes(auth.userId)) {
      throw (globalThis as any).createError({
        statusCode: 403,
        message: "Admin access required",
      });
    }
  }),
}));

vi.mock("~/server/utils/response", () => ({
  success: vi.fn((_event: any, data: unknown) => ({ data })),
  paginated: vi.fn((_event: any, data: unknown[], total: number, limit: number, offset: number) => ({
    data,
    meta: { total, limit, offset, hasMore: offset + (data as any[]).length < total },
  })),
  notFound: vi.fn((_event: any, resource: string) => ({
    statusCode: 404,
    message: `${resource} not found`,
  })),
  forbidden: vi.fn((_event: any, message: string) => ({
    statusCode: 403,
    message,
  })),
  validationError: vi.fn((_event: any, errors: Record<string, string[]>) => ({
    statusCode: 422,
    message: "Validation failed",
    data: { error: { code: "VALIDATION_ERROR", details: { errors } } },
  })),
}));

vi.mock("~/server/utils/permissions", () => ({
  requireAuth: vi.fn((event: any) => {
    const auth = event.context?.auth;
    if (!auth) {
      throw (globalThis as any).createError({
        statusCode: 401,
        message: "Authentication required",
      });
    }
    return auth;
  }),
  requirePermission: vi.fn(),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "generated-id-1234"),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAdminEvent(overrides?: {
  userId?: string;
  body?: unknown;
  query?: Record<string, string>;
  routerParams?: Record<string, string>;
}) {
  const userId = overrides?.userId ?? "admin-1";
  mocks.setBody(overrides?.body);
  mocks.setQuery(overrides?.query ?? {});
  mocks.setRouterParams(overrides?.routerParams ?? {});

  return {
    context: {
      auth: {
        type: "session" as const,
        userId,
        permissions: [],
      },
    },
  } as any;
}

function makeUnauthenticatedEvent(overrides?: {
  query?: Record<string, string>;
  routerParams?: Record<string, string>;
}) {
  mocks.setBody(undefined);
  mocks.setQuery(overrides?.query ?? {});
  mocks.setRouterParams(overrides?.routerParams ?? {});

  return {
    context: {},
  } as any;
}

function makeNonAdminEvent(overrides?: {
  body?: unknown;
  query?: Record<string, string>;
  routerParams?: Record<string, string>;
}) {
  mocks.setBody(overrides?.body);
  mocks.setQuery(overrides?.query ?? {});
  mocks.setRouterParams(overrides?.routerParams ?? {});

  return {
    context: {
      auth: {
        type: "session" as const,
        userId: "regular-user-1",
        permissions: [],
      },
    },
  } as any;
}

const sampleUser = {
  id: "user-1",
  username: "alice",
  email: "alice@example.com",
  emailVerified: true,
  timezone: "UTC",
  subscriptionTier: "free",
  subscriptionStatus: "active",
  stripeCustomerId: null,
  subscriptionExpiresAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin authentication/authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAdminUserIds("admin-1");
    mocks.setDbResult([]);
    mocks.setDbResultFn(null);
  });

  it("rejects unauthenticated requests with 401", async () => {
    const event = makeUnauthenticatedEvent();
    await expect(usersListHandler(event)).rejects.toThrow("Authentication required");
  });

  it("rejects non-admin users with 403", async () => {
    const event = makeNonAdminEvent();
    await expect(usersListHandler(event)).rejects.toThrow("Admin access required");
  });

  it("rejects non-admin on stats endpoint", async () => {
    const event = makeNonAdminEvent({ query: {} });
    await expect(statsHandler(event)).rejects.toThrow("Admin access required");
  });

  it("rejects non-admin on health endpoint", async () => {
    const event = makeNonAdminEvent();
    await expect(healthHandler(event)).rejects.toThrow("Admin access required");
  });

  it("rejects non-admin on user detail endpoint", async () => {
    const event = makeNonAdminEvent({ routerParams: { id: "user-1" } });
    await expect(userDetailHandler(event)).rejects.toThrow("Admin access required");
  });

  it("rejects non-admin on user patch endpoint", async () => {
    const event = makeNonAdminEvent({
      routerParams: { id: "user-1" },
      body: { subscriptionTier: "premium" },
    });
    await expect(userPatchHandler(event)).rejects.toThrow("Admin access required");
  });

  it("rejects non-admin on sessions delete endpoint", async () => {
    const event = makeNonAdminEvent({ routerParams: { id: "user-1" } });
    await expect(sessionsDeleteHandler(event)).rejects.toThrow("Admin access required");
  });

  it("rejects unauthenticated on sessions delete", async () => {
    const event = makeUnauthenticatedEvent({ routerParams: { id: "user-1" } });
    await expect(sessionsDeleteHandler(event)).rejects.toThrow("Authentication required");
  });
});

// ---------------------------------------------------------------------------

describe("GET /api/v1/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAdminUserIds("admin-1");
    mocks.setDbResultFn(null);
  });

  it("returns paginated list of users", async () => {
    let callCount = 0;
    mocks.setDbResultFn(() => {
      callCount++;
      // First call: count query
      if (callCount === 1) return [{ count: 2 }];
      // Second call: user list
      return [
        { ...sampleUser, entryCount: 10, rhythmCount: 2, lastActiveAt: "2026-01-05T00:00:00.000Z" },
        { ...sampleUser, id: "user-2", username: "bob", entryCount: 5, rhythmCount: 1, lastActiveAt: null },
      ];
    });

    const event = makeAdminEvent({ query: {} });
    const result = await usersListHandler(event);

    expect(result).toBeDefined();
  });

  it("accepts filter parameters", async () => {
    let callCount = 0;
    mocks.setDbResultFn(() => {
      callCount++;
      if (callCount === 1) return [{ count: 0 }];
      return [];
    });

    const event = makeAdminEvent({
      query: { tier: "premium", search: "alice", sort: "username", order: "asc" },
    });

    const result = await usersListHandler(event);
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe("GET /api/v1/admin/users/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAdminUserIds("admin-1");
    mocks.setDbResultFn(null);
  });

  it("returns user detail with stats", async () => {
    // The handler makes many parallel queries via Promise.all
    // Every DB chain resolves to our dbResult, so we provide a
    // sensible default that works for both user lookup and counts.
    let callCount = 0;
    mocks.setDbResultFn(() => {
      callCount++;
      // First call: user lookup
      if (callCount === 1) return [sampleUser];
      // All subsequent calls: count/aggregate queries
      return [{ count: 5, timestamp: "2026-01-05T00:00:00.000Z", createdAt: "2026-01-04T00:00:00.000Z" }];
    });

    const event = makeAdminEvent({ routerParams: { id: "user-1" } });
    const result = await userDetailHandler(event);

    expect(result).toBeDefined();
    expect((result as any).data).toMatchObject({
      id: "user-1",
      username: "alice",
    });
  });

  it("returns 404 for nonexistent user", async () => {
    mocks.setDbResult([]);

    const event = makeAdminEvent({ routerParams: { id: "nonexistent" } });

    await expect(userDetailHandler(event)).rejects.toThrow("User not found");
  });

  it("throws when id is missing", async () => {
    mocks.setRouterParams({});
    const event = makeAdminEvent({ routerParams: {} });

    await expect(userDetailHandler(event)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------

describe("PATCH /api/v1/admin/users/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAdminUserIds("admin-1");
    mocks.setDbResultFn(null);
  });

  it("updates user subscription tier", async () => {
    let callCount = 0;
    mocks.setDbResultFn(() => {
      callCount++;
      // First call: find existing user
      if (callCount === 1) return [sampleUser];
      // Second call (after update): updated user
      return [{ ...sampleUser, subscriptionTier: "premium" }];
    });

    const event = makeAdminEvent({
      routerParams: { id: "user-1" },
      body: { subscriptionTier: "premium" },
    });

    const result = await userPatchHandler(event);
    expect(result).toBeDefined();
    expect(mocks.db.update).toHaveBeenCalled();
  });

  it("returns 404 for nonexistent user", async () => {
    mocks.setDbResult([]);

    const event = makeAdminEvent({
      routerParams: { id: "nonexistent" },
      body: { subscriptionTier: "premium" },
    });

    await expect(userPatchHandler(event)).rejects.toThrow("User not found");
  });

  it("throws when no fields to update (empty body)", async () => {
    const event = makeAdminEvent({
      routerParams: { id: "user-1" },
      body: {},
    });

    await expect(userPatchHandler(event)).rejects.toThrow("No fields to update");
  });

  it("throws when id is missing", async () => {
    const event = makeAdminEvent({
      routerParams: {},
      body: { subscriptionTier: "premium" },
    });

    await expect(userPatchHandler(event)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------

describe("DELETE /api/v1/admin/users/:id/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAdminUserIds("admin-1");
    mocks.setDbResultFn(null);
  });

  it("invalidates all sessions for a user", async () => {
    let callCount = 0;
    mocks.setDbResultFn(() => {
      callCount++;
      // First call: verify user exists
      if (callCount === 1) return [{ id: "user-1" }];
      // Second call: count sessions
      if (callCount === 2) return [{ count: 3 }];
      // Third call: delete sessions
      return [];
    });

    const event = makeAdminEvent({ routerParams: { id: "user-1" } });
    const result = await sessionsDeleteHandler(event);

    expect(result).toBeDefined();
    expect((result as any).data).toMatchObject({
      message: "All sessions invalidated",
      sessionsRevoked: 3,
    });
  });

  it("returns 404 for nonexistent user", async () => {
    mocks.setDbResult([]);

    const event = makeAdminEvent({ routerParams: { id: "nonexistent" } });
    await expect(sessionsDeleteHandler(event)).rejects.toThrow("User not found");
  });

  it("reports zero sessions when user has none", async () => {
    let callCount = 0;
    mocks.setDbResultFn(() => {
      callCount++;
      if (callCount === 1) return [{ id: "user-1" }];
      if (callCount === 2) return [{ count: 0 }];
      return [];
    });

    const event = makeAdminEvent({ routerParams: { id: "user-1" } });
    const result = await sessionsDeleteHandler(event);

    expect((result as any).data.sessionsRevoked).toBe(0);
  });

  it("throws when id is missing", async () => {
    const event = makeAdminEvent({ routerParams: {} });
    await expect(sessionsDeleteHandler(event)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------

describe("GET /api/v1/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAdminUserIds("admin-1");
    mocks.setDbResult([]);
    mocks.setDbResultFn(null);
  });

  it("returns system stats with default period", async () => {
    const event = makeAdminEvent({ query: {} });
    const result = await statsHandler(event);

    expect(result).toBeDefined();
    expect((result as any).data).toMatchObject({
      period: "7d",
      users: expect.any(Object),
      entries: expect.any(Object),
    });
  });

  it("passes period parameter to service", async () => {
    const { getAdminStats } = await import("~/server/services/admin-stats");

    const event = makeAdminEvent({ query: { period: "30d" } });
    await statsHandler(event);

    expect(getAdminStats).toHaveBeenCalledWith("30d");
  });
});

// ---------------------------------------------------------------------------

describe("GET /api/v1/admin/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAdminUserIds("admin-1");
    mocks.setDbResultFn(null);
  });

  it("returns healthy status when DB is accessible", async () => {
    // All Promise.all queries resolve to count results
    mocks.setDbResult([{ count: 5 }]);

    const event = makeAdminEvent();
    const result = await healthHandler(event);

    expect(result).toBeDefined();
    expect((result as any).data).toMatchObject({
      status: "healthy",
      uptime: expect.any(Number),
      database: {
        status: "connected",
      },
    });
  });

  it("returns degraded status when DB throws", async () => {
    // Make DB queries fail
    mocks.chain.from!.mockImplementationOnce(() => {
      throw new Error("DB connection failed");
    });

    const event = makeAdminEvent();
    const result = await healthHandler(event);

    expect(result).toBeDefined();
    expect((result as any).data).toMatchObject({
      status: "degraded",
      database: {
        status: "error",
      },
    });
  });

  it("includes environment info", async () => {
    mocks.setDbResult([{ count: 0 }]);

    const event = makeAdminEvent();
    const result = await healthHandler(event);

    expect((result as any).data).toHaveProperty("environment");
    expect((result as any).data).toHaveProperty("cloudMode");
  });
});
