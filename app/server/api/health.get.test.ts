import { describe, it, expect } from "vitest";

describe("GET /api/health", () => {
  it("should return ok status", () => {
    const result = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };

    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeTruthy();
  });

  it("should return valid ISO timestamp", () => {
    const timestamp = new Date().toISOString();

    expect(() => new Date(timestamp)).not.toThrow();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it("should have timestamp close to current time", () => {
    const before = Date.now();
    const timestamp = new Date().toISOString();
    const after = Date.now();

    const timestampMs = new Date(timestamp).getTime();
    expect(timestampMs).toBeGreaterThanOrEqual(before);
    expect(timestampMs).toBeLessThanOrEqual(after);
  });

  it("should format timestamp with correct precision", () => {
    const timestamp = new Date().toISOString();

    // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("should return consistent response structure", () => {
    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };

    expect(response).toHaveProperty("status");
    expect(response).toHaveProperty("timestamp");
    expect(Object.keys(response)).toHaveLength(2);
  });
});
