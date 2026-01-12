import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "~/server/db";
import { entries, users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

describe("POST /api/entries", () => {
  const testUserId = "test-user-post-entries";

  beforeEach(async () => {
    await db.delete(entries).where(eq(entries.userId, testUserId)).execute();
    await db.delete(users).where(eq(users.id, testUserId)).execute();

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

  it("should create entry with minimal required fields", async () => {
    const now = new Date().toISOString();
    const newEntry = {
      id: nanoid(),
      userId: testUserId,
      type: "timed",
      name: "meditation",
      timestamp: now,
      timezone: "UTC",
      data: {},
      tags: [],
      source: "manual",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(entries).values(newEntry);

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, newEntry.id))
      .limit(1);

    expect(result).toBeTruthy();
    expect(result?.type).toBe("timed");
    expect(result?.name).toBe("meditation");
    expect(result?.userId).toBe(testUserId);
  });

  it("should create entry with all optional fields", async () => {
    const now = new Date().toISOString();
    const newEntry = {
      id: nanoid(),
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
      data: { quality: 8, focused: true },
      tags: ["morning", "focused"],
      notes: "Great session",
      source: "manual",
      externalId: "ext-123",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(entries).values(newEntry);

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, newEntry.id))
      .limit(1);

    expect(result).toBeTruthy();
    expect(result?.category).toBe("mindfulness");
    expect(result?.subcategory).toBe("sitting");
    expect(result?.emoji).toBe("🧘");
    expect(result?.durationSeconds).toBe(600);
    expect(result?.timezone).toBe("America/New_York");
    expect(result?.data).toEqual({ quality: 8, focused: true });
    expect(result?.tags).toEqual(["morning", "focused"]);
    expect(result?.notes).toBe("Great session");
    expect(result?.externalId).toBe("ext-123");
  });

  it("should generate unique IDs for multiple entries", async () => {
    const now = new Date().toISOString();
    const id1 = nanoid();
    const id2 = nanoid();

    await db.insert(entries).values([
      {
        id: id1,
        userId: testUserId,
        type: "timed",
        name: "meditation1",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: id2,
        userId: testUserId,
        type: "timed",
        name: "meditation2",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);

    expect(id1).not.toBe(id2);

    const results = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, testUserId));

    expect(results).toHaveLength(2);
  });

  it("should handle date field for date-only entries", async () => {
    const now = new Date().toISOString();
    const newEntry = {
      id: nanoid(),
      userId: testUserId,
      type: "tada",
      name: "accomplishment",
      date: "2026-01-12",
      timestamp: now,
      timezone: "UTC",
      data: {},
      tags: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(entries).values(newEntry);

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, newEntry.id))
      .limit(1);

    expect(result?.date).toBe("2026-01-12");
  });

  it("should handle null values for optional fields", async () => {
    const now = new Date().toISOString();
    const newEntry = {
      id: nanoid(),
      userId: testUserId,
      type: "journal",
      name: "note",
      category: null,
      subcategory: null,
      emoji: null,
      notes: null,
      timestamp: now,
      timezone: "UTC",
      data: {},
      tags: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(entries).values(newEntry);

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, newEntry.id))
      .limit(1);

    expect(result?.category).toBeNull();
    expect(result?.subcategory).toBeNull();
    expect(result?.emoji).toBeNull();
    expect(result?.notes).toBeNull();
  });

  it("should store JSON data correctly", async () => {
    const now = new Date().toISOString();
    const complexData = {
      mood: "calm",
      techniques: ["breathing", "body scan"],
      quality: 9,
      nested: { deep: { value: true } },
    };

    const newEntry = {
      id: nanoid(),
      userId: testUserId,
      type: "timed",
      name: "meditation",
      timestamp: now,
      timezone: "UTC",
      data: complexData,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(entries).values(newEntry);

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, newEntry.id))
      .limit(1);

    expect(result?.data).toEqual(complexData);
  });

  it("should store tags as array", async () => {
    const now = new Date().toISOString();
    const newEntry = {
      id: nanoid(),
      userId: testUserId,
      type: "journal",
      name: "dream",
      timestamp: now,
      timezone: "UTC",
      data: {},
      tags: ["lucid", "flying", "vivid"],
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(entries).values(newEntry);

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, newEntry.id))
      .limit(1);

    expect(result?.tags).toEqual(["lucid", "flying", "vivid"]);
    expect(Array.isArray(result?.tags)).toBe(true);
  });

  it("should set default values correctly", async () => {
    const now = new Date().toISOString();
    const newEntry = {
      id: nanoid(),
      userId: testUserId,
      type: "journal",
      name: "note",
      timestamp: now,
      timezone: "UTC",
      data: {},
      tags: [],
      source: "manual",
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(entries).values(newEntry);

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, newEntry.id))
      .limit(1);

    expect(result?.source).toBe("manual");
    expect(result?.deletedAt).toBeNull();
    expect(result?.data).toEqual({});
    expect(result?.tags).toEqual([]);
  });

  it("should handle different entry types", async () => {
    const now = new Date().toISOString();
    const types = ["timed", "tada", "journal", "habit"];

    for (const type of types) {
      const id = nanoid();
      await db.insert(entries).values({
        id,
        userId: testUserId,
        type,
        name: `${type}-entry`,
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      });

      const [result] = await db
        .select()
        .from(entries)
        .where(eq(entries.id, id))
        .limit(1);

      expect(result?.type).toBe(type);
    }
  });

  it("should store timestamps in ISO format", async () => {
    const now = new Date().toISOString();
    const newEntry = {
      id: nanoid(),
      userId: testUserId,
      type: "timed",
      name: "meditation",
      timestamp: now,
      startedAt: now,
      endedAt: new Date(Date.now() + 600000).toISOString(),
      timezone: "UTC",
      data: {},
      tags: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(entries).values(newEntry);

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, newEntry.id))
      .limit(1);

    expect(result?.timestamp).toBeTruthy();
    expect(() => new Date(result!.timestamp!)).not.toThrow();
    expect(() => new Date(result!.startedAt!)).not.toThrow();
    expect(() => new Date(result!.endedAt!)).not.toThrow();
    expect(() => new Date(result!.createdAt!)).not.toThrow();
    expect(() => new Date(result!.updatedAt)).not.toThrow();
  });
});
