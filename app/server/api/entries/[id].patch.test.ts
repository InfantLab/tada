import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "~/server/db";
import { entries, users } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

describe("PATCH /api/entries/:id", () => {
  const testUserId = "test-user-patch-entries";
  const testEntryId = "test-entry-patch-123";

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

    // Create test entry
    await db.insert(entries).values({
      id: testEntryId,
      userId: testUserId,
      type: "timed",
      name: "meditation",
      category: "mindfulness",
      subcategory: "sitting",
      emoji: "🧘",
      timestamp: new Date().toISOString(),
      durationSeconds: 600,
      timezone: "UTC",
      data: {},
      tags: [],
      notes: null,
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  afterEach(async () => {
    await db.delete(entries).where(eq(entries.userId, testUserId)).execute();
    await db.delete(users).where(eq(users.id, testUserId)).execute();
  });

  it("should update entry name", async () => {
    await db
      .update(entries)
      .set({ name: "updated meditation", updatedAt: new Date().toISOString() })
      .where(eq(entries.id, testEntryId));

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(result?.name).toBe("updated meditation");
    expect(result?.type).toBe("timed"); // Unchanged
  });

  it("should update multiple fields at once", async () => {
    await db
      .update(entries)
      .set({
        name: "updated",
        emoji: "✨",
        notes: "Modified notes",
        tags: ["updated", "test"],
        durationSeconds: 900,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(entries.id, testEntryId));

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(result?.name).toBe("updated");
    expect(result?.emoji).toBe("✨");
    expect(result?.notes).toBe("Modified notes");
    expect(result?.tags).toEqual(["updated", "test"]);
    expect(result?.durationSeconds).toBe(900);
  });

  it("should update only specified fields", async () => {
    const [before] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    await db
      .update(entries)
      .set({ emoji: "🌟", updatedAt: new Date().toISOString() })
      .where(eq(entries.id, testEntryId));

    const [after] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(after?.emoji).toBe("🌟");
    expect(after?.name).toBe(before?.name); // Unchanged
    expect(after?.type).toBe(before?.type); // Unchanged
  });

  it("should update updatedAt timestamp", async () => {
    const [before] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    const beforeTime = new Date(before!.updatedAt).getTime();

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 10));

    await db
      .update(entries)
      .set({ name: "updated", updatedAt: new Date().toISOString() })
      .where(eq(entries.id, testEntryId));

    const [after] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    const afterTime = new Date(after!.updatedAt).getTime();
    expect(afterTime).toBeGreaterThan(beforeTime);
  });

  it("should set fields to null", async () => {
    await db
      .update(entries)
      .set({
        emoji: null,
        category: null,
        subcategory: null,
        notes: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(entries.id, testEntryId));

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(result?.emoji).toBeNull();
    expect(result?.category).toBeNull();
    expect(result?.subcategory).toBeNull();
    expect(result?.notes).toBeNull();
  });

  it("should update JSON data field", async () => {
    const newData = {
      quality: 9,
      focused: true,
      techniques: ["breathing", "body scan"],
    };

    await db
      .update(entries)
      .set({ data: newData, updatedAt: new Date().toISOString() })
      .where(eq(entries.id, testEntryId));

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(result?.data).toEqual(newData);
  });

  it("should update timestamp fields", async () => {
    const newTimestamp = new Date().toISOString();
    const startedAt = newTimestamp;
    const endedAt = new Date(Date.now() + 1200000).toISOString();

    await db
      .update(entries)
      .set({
        timestamp: newTimestamp,
        startedAt,
        endedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(entries.id, testEntryId));

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(result?.timestamp).toBe(newTimestamp);
    expect(result?.startedAt).toBe(startedAt);
    expect(result?.endedAt).toBe(endedAt);
  });

  it("should not update other users entries", async () => {
    const otherUserId = "other-user-456";
    const otherEntryId = "other-entry-789";

    await db.insert(users).values({
      id: otherUserId,
      username: "otheruser",
      passwordHash: "hash",
      timezone: "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.insert(entries).values({
      id: otherEntryId,
      userId: otherUserId,
      type: "timed",
      name: "their meditation",
      timestamp: new Date().toISOString(),
      timezone: "UTC",
      data: {},
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Try to update with wrong userId filter
    await db
      .update(entries)
      .set({ name: "hacked" })
      .where(
        and(eq(entries.id, otherEntryId), eq(entries.userId, testUserId))
      );

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, otherEntryId))
      .limit(1);

    expect(result?.name).toBe("their meditation"); // Unchanged

    // Cleanup
    await db.delete(entries).where(eq(entries.userId, otherUserId)).execute();
    await db.delete(users).where(eq(users.id, otherUserId)).execute();
  });

  it("should not affect other entries when updating", async () => {
    const otherEntryId = "other-entry-456";
    await db.insert(entries).values({
      id: otherEntryId,
      userId: testUserId,
      type: "journal",
      name: "note",
      timestamp: new Date().toISOString(),
      timezone: "UTC",
      data: {},
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db
      .update(entries)
      .set({ name: "updated meditation" })
      .where(eq(entries.id, testEntryId));

    const [other] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, otherEntryId))
      .limit(1);

    expect(other?.name).toBe("note"); // Unchanged
  });

  it("should handle updating tags array", async () => {
    await db
      .update(entries)
      .set({ tags: ["new", "tags", "list"], updatedAt: new Date().toISOString() })
      .where(eq(entries.id, testEntryId));

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(result?.tags).toEqual(["new", "tags", "list"]);
  });

  it("should handle updating category fields", async () => {
    await db
      .update(entries)
      .set({
        category: "accomplishment",
        subcategory: "work",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(entries.id, testEntryId));

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(result?.category).toBe("accomplishment");
    expect(result?.subcategory).toBe("work");
  });
});
