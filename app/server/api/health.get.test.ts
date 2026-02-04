import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to ensure globals are defined before module imports
const mocks = vi.hoisted(() => {
  // Define Nuxt globals before any imports
  (globalThis as Record<string, unknown>).defineEventHandler = (handler: Function) => handler;
  (globalThis as Record<string, unknown>).useRuntimeConfig = () => ({
    public: {
      appVersion: "0.4.0-test",
    },
  });

  return {
    db: {
      run: vi.fn().mockResolvedValue(undefined),
    },
    isCloudMode: vi.fn().mockReturnValue(false),
    isBillingEnabled: vi.fn().mockReturnValue(false),
  };
});

// Mock database and cloudMode
vi.mock("~/server/db", () => ({
  db: mocks.db,
}));

vi.mock("~/server/utils/cloudMode", () => ({
  isCloudMode: mocks.isCloudMode,
  isBillingEnabled: mocks.isBillingEnabled,
}));

// Import handler after mocks are set up
import handler from "./health.get";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return ok status when database is healthy", async () => {
    const mockEvent = {
      context: {},
    };

    const result = await handler(mockEvent as Parameters<typeof handler>[0]);

    expect(result).toMatchObject({
      status: "ok",
    });
  });

  it("should include required health check fields", async () => {
    const mockEvent = {
      context: {},
    };

    const result = await handler(mockEvent as Parameters<typeof handler>[0]);

    // Required fields
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("checks");
    expect(result).toHaveProperty("checks.database");
  });

  it("should include valid timestamp", async () => {
    const mockEvent = {
      context: {},
    };

    const result = await handler(mockEvent as Parameters<typeof handler>[0]);

    expect(result.timestamp).toBeDefined();
    expect(() => new Date(result.timestamp)).not.toThrow();

    const timestamp = new Date(result.timestamp);
    const now = new Date();
    const diff = Math.abs(now.getTime() - timestamp.getTime());

    // Timestamp should be within 5 seconds of now
    expect(diff).toBeLessThan(5000);
  });

  it("should report database status", async () => {
    const mockEvent = {
      context: {},
    };

    const result = await handler(mockEvent as Parameters<typeof handler>[0]);

    expect(result.checks.database).toHaveProperty("status");
    expect(result.checks.database.status).toBe("ok");
  });
});
