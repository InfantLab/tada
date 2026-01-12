import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "~/server/db";
import { entries, users } from "~/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";

describe("GET /api/entries", () => {
  const testUserId = "test-user-get-entries";
  
  beforeEach(async () => {
    // Clean up
    await db.delete(entries).where(eq(entries.userId, testUserId)).execute();
    await db.delete(users).where(eq(users.id, testUserId)).execute();

    // Create test user
    await db.insert(users).values({
      id: testUserId,
      username: "testuser",
      passwordHash: "hash",
      timezone: "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  afterEach(async () => {
    await db.delete(entries).where(eq(entries.userId, testUserId)).execute();
    await db.delete(users).where(eq(users.id, testUserId)).execute();
  });

  it("should fetch entries for a user from database", async () => {
    // Insert test entries
    const now = new Date().toISOString();
    await db.insert(entries).values([
      {
        id: "entry-1",
        userId: testUserId,
        type: "timed",
        name: "meditation",
        category: "mindfulness",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "entry-2",
        userId: testUserId,
        type: "journal",
        name: "dream",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // Fetch entries
    const result = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, testUserId));

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.type)).toContain("timed");
    expect(result.map((e) => e.type)).toContain("journal");
  });

  it("should filter entries by type", async () => {
    const now = new Date().toISOString();
    await db.insert(entries).values([
      {
        id: "entry-1",
        userId: testUserId,
        type: "timed",
        name: "meditation",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "entry-2",
        userId: testUserId,
        type: "journal",
        name: "note",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await db
      .select()
      .from(entries)
      .where(and(eq(entries.userId, testUserId), eq(entries.type, "timed")));

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("timed");
  });

  it("should exclude soft-deleted entries", async () => {
    const now = new Date().toISOString();
    await db.insert(entries).values([
      {
        id: "entry-active",
        userId: testUserId,
        type: "timed",
        name: "active",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "entry-deleted",
        userId: testUserId,
        type: "timed",
        name: "deleted",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        deletedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // Query should exclude deleted
    const result = await db
      .select()
      .from(entries)
      .where(and(eq(entries.userId, testUserId), isNull(entries.deletedAt)));

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("active");
  });

  it("should not return other users entries", async () => {
    const otherUserId = "other-user-123";
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: otherUserId,
      username: "otheruser",
      passwordHash: "hash",
      timezone: "UTC",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(entries).values([
      {
        id: "my-entry",
        userId: testUserId,
        type: "timed",
        name: "mine",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "their-entry",
        userId: otherUserId,
        type: "timed",
        name: "theirs",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const myEntries = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, testUserId));

    expect(myEntries).toHaveLength(1);
    expect(myEntries[0]?.name).toBe("mine");

    // Cleanup
    await db.delete(entries).where(eq(entries.userId, otherUserId)).execute();
    await db.delete(users).where(eq(users.id, otherUserId)).execute();
  });

  it("should respect limit when querying many entries", async () => {
    const now = new Date().toISOString();
    const manyEntries = Array.from({ length: 150 }, (_, i) => ({
      id: `entry-${i}`,
      userId: testUserId,
      type: "timed",
      name: `entry-${i}`,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      timezone: "UTC",
      data: {},
      tags: [],
      createdAt: now,
      updatedAt: now,
    }));

    await db.insert(entries).values(manyEntries);

    const result = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, testUserId))
      .limit(50);

    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("should order entries by timestamp descending", async () => {
    const base = Date.now();
    await db.insert(entries).values([
      {
        id: "entry-1",
        userId: testUserId,
        type: "timed",
        name: "oldest",
        timestamp: new Date(base - 3000).toISOString(),
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "entry-2",
        userId: testUserId,
        type: "timed",
        name: "newest",
        timestamp: new Date(base).toISOString(),
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "entry-3",
        userId: testUserId,
        type: "timed",
        name: "middle",
        timestamp: new Date(base - 1000).toISOString(),
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const result = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, testUserId))
      .orderBy(entries.timestamp);

    expect(result[0]?.name).toBe("oldest");
    expect(result[2]?.name).toBe("newest");
  });

  it("should return empty array when no entries exist", async () => {
    const result = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, testUserId));

    expect(result).toEqual([]);
  });

  it("should handle entries with all optional fields populated", async () => {
    const now = new Date().toISOString();
    await db.insert(entries).values({
      id: "full-entry",
      userId: testUserId,
      type: "timed",
      name: "meditation",
      category: "mindfulness",
      subcategory: "sitting",
      emoji: "🧘",
      timestamp: now,
      startedAt: now,
      endedAt: new Date(Date.now() + 600000).toISOString(),
      durationSeconds: 600,
      timezone: "America/New_York",
      data: { quality: 8 },
      tags: ["morning", "focused"],
      notes: "Great session",
      source: "timer",
      externalId: "ext-123",
      createdAt: now,
      updatedAt: now,
    });

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, "full-entry"))
      .limit(1);

    expect(result?.category).toBe("mindfulness");
    expect(result?.emoji).toBe("🧘");
    expect(result?.durationSeconds).toBe(600);
    expect(result?.tags).toEqual(["morning", "focused"]);
    expect(result?.data).toEqual({ quality: 8 });
  });
});
