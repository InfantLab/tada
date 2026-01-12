import { describe, it, expect } from "vitest";
import handler from "./health.get";

describe("GET /api/health", () => {
  it("should return ok status", async () => {
    const result = await handler();

    expect(result).toMatchObject({
      status: "ok",
    });
  });

  it("should include timestamp", async () => {
    const result = handler();

    expect(result.timestamp).toBeDefined();
    expect(() => new Date(result.timestamp)).not.toThrow();

    const timestamp = new Date(result.timestamp);
    const now = new Date();
    const diff = Math.abs(now.getTime() - timestamp.getTime());

    // Timestamp should be within 5 seconds of now
    expect(diff).toBeLessThan(5000);
  });

  it("should return object with status and timestamp", async () => {
    const result = handler();

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("timestamp");
    expect(Object.keys(result)).toHaveLength(2);
  });
});
