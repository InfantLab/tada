import { describe, it, expect, beforeEach } from "vitest";
import { db } from "~/server/db";
import { users, entries, importLogs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import type { H3Event } from "h3";

describe("POST /api/import/entries", () => {
  let testUser: { id: string; username: string; email: string };

  beforeEach(async () => {
    // Clean up test data
    await db.delete(entries).where(eq(entries.userId, "test-import-user"));
    await db
      .delete(importLogs)
      .where(eq(importLogs.userId, "test-import-user"));
    await db.delete(users).where(eq(users.id, "test-import-user"));

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        id: "test-import-user",
        username: "importtester",
        email: "import@test.com",
        hashedPassword: "fake-hash",
      })
      .returning();

    testUser = user!;
  });

  it("should import entries successfully", async () => {
    const mockEvent = {
      context: { user: testUser },
    } as H3Event;

    const importData = {
      entries: [
        {
          type: "timed",
          name: "Meditation",
          category: "mindfulness",
          subcategory: "Meditation",
          startedAt: "2024-01-15T10:00:00Z",
          durationSeconds: 600,
          externalId: "test-import-1",
        },
        {
          type: "timed",
          name: "Breathing",
          category: "mindfulness",
          subcategory: "Breathing",
          startedAt: "2024-01-15T11:00:00Z",
          durationSeconds: 300,
          externalId: "test-import-2",
        },
      ],
      source: "test-import",
      recipeName: "Test Recipe",
      filename: "test.csv",
    };

    // Import the test handler
    const handler = (await import("./entries.post")).default;

    // Mock readBody to return our test data
    const originalReadBody = global.readBody;
    global.readBody = async () => importData;

    try {
      const response = await handler(mockEvent);

      expect(response.success).toBe(true);
      expect(response.results.successful).toBe(2);
      expect(response.results.failed).toBe(0);
      expect(response.results.skipped).toBe(0);

      // Verify entries created in database
      const createdEntries = await db
        .select()
        .from(entries)
        .where(eq(entries.userId, testUser.id));

      expect(createdEntries).toHaveLength(2);
      expect(createdEntries[0]!.name).toBe("Meditation");
      expect(createdEntries[1]!.name).toBe("Breathing");

      // Verify import log created
      const logs = await db
        .select()
        .from(importLogs)
        .where(eq(importLogs.userId, testUser.id));

      expect(logs).toHaveLength(1);
      expect(logs[0]!.status).toBe("success");
      expect(logs[0]!.successfulRows).toBe(2);
    } finally {
      global.readBody = originalReadBody;
    }
  });

  it("should skip duplicate entries", async () => {
    // First import
    await db.insert(entries).values({
      id: "existing-entry",
      userId: testUser.id,
      type: "timed",
      name: "Meditation",
      category: "mindfulness",
      subcategory: "Meditation",
      startedAt: new Date("2024-01-15T10:00:00Z"),
      durationSeconds: 600,
      externalId: "test-import-1",
      source: "test",
      timestamp: new Date(),
      date: "2024-01-15",
      timezone: "UTC",
    });

    const mockEvent = {
      context: { user: testUser },
    } as H3Event;

    const importData = {
      entries: [
        {
          type: "timed",
          name: "Meditation",
          category: "mindfulness",
          subcategory: "Meditation",
          startedAt: "2024-01-15T10:00:00Z",
          durationSeconds: 600,
          externalId: "test-import-1", // Same external ID
        },
      ],
      source: "test-import",
      recipeName: "Test Recipe",
      filename: "test.csv",
    };

    const handler = (await import("./entries.post")).default;
    const originalReadBody = global.readBody;
    global.readBody = async () => importData;

    try {
      const response = await handler(mockEvent);

      expect(response.results.successful).toBe(0);
      expect(response.results.skipped).toBe(1);

      // Verify only one entry exists
      const allEntries = await db
        .select()
        .from(entries)
        .where(eq(entries.userId, testUser.id));

      expect(allEntries).toHaveLength(1);
    } finally {
      global.readBody = originalReadBody;
    }
  });

  it("should handle rate limiting", async () => {
    const mockEvent = {
      context: { user: testUser },
    } as H3Event;

    const importData = {
      entries: [
        {
          type: "timed",
          name: "Test",
          category: "test",
          subcategory: "Test",
          startedAt: "2024-01-15T10:00:00Z",
          durationSeconds: 60,
          externalId: "test-1",
        },
      ],
      source: "test",
      recipeName: "Test",
      filename: "test.csv",
    };

    const handler = (await import("./entries.post")).default;
    const originalReadBody = global.readBody;
    global.readBody = async () => importData;

    try {
      // First import should succeed
      const response1 = await handler(mockEvent);
      expect(response1.success).toBe(true);

      // Immediate second import should be rate limited
      await expect(handler(mockEvent)).rejects.toThrow(/429/);
    } finally {
      global.readBody = originalReadBody;
    }
  });

  it("should handle validation errors gracefully", async () => {
    const mockEvent = {
      context: { user: testUser },
    } as H3Event;

    const importData = {
      entries: [
        {
          type: "timed",
          name: "Valid Entry",
          category: "test",
          subcategory: "Test",
          startedAt: "2024-01-15T10:00:00Z",
          durationSeconds: 60,
          externalId: "test-1",
        },
        {
          // Missing required fields
          type: "timed",
          externalId: "test-2",
        },
      ],
      source: "test",
      recipeName: "Test",
      filename: "test.csv",
    };

    const handler = (await import("./entries.post")).default;
    const originalReadBody = global.readBody;
    global.readBody = async () => importData;

    try {
      const response = await handler(mockEvent);

      expect(response.results.successful).toBeGreaterThan(0);
      expect(response.results.failed).toBeGreaterThan(0);
      expect(response.results.errors.length).toBeGreaterThan(0);
    } finally {
      global.readBody = originalReadBody;
    }
  });

  it("should batch large imports", async () => {
    const mockEvent = {
      context: { user: testUser },
    } as H3Event;

    // Create 1500 entries (more than one batch of 500)
    const largeEntryList = Array.from({ length: 1500 }, (_, i) => ({
      type: "timed",
      name: `Entry ${i}`,
      category: "test",
      subcategory: "Test",
      startedAt: new Date(Date.now() - i * 60000).toISOString(),
      durationSeconds: 60,
      externalId: `test-${i}`,
    }));

    const importData = {
      entries: largeEntryList,
      source: "test",
      recipeName: "Test",
      filename: "large.csv",
    };

    const handler = (await import("./entries.post")).default;
    const originalReadBody = global.readBody;
    global.readBody = async () => importData;

    try {
      const response = await handler(mockEvent);

      expect(response.results.successful).toBe(1500);
      expect(response.results.failed).toBe(0);

      // Verify all entries created
      const allEntries = await db
        .select()
        .from(entries)
        .where(eq(entries.userId, testUser.id));

      expect(allEntries).toHaveLength(1500);
    } finally {
      global.readBody = originalReadBody;
    }
  });
});
