import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "~/server/db";
import { entries, users } from "~/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";

describe("DELETE /api/entries/:id", () => {
  const testUserId = "test-user-delete-entries";
  const testEntryId = "test-entry-delete-123";

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
      timestamp: new Date().toISOString(),
      timezone: "UTC",
      data: {},
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
  });

  afterEach(async () => {
    await db.delete(entries).where(eq(entries.userId, testUserId)).execute();
    await db.delete(users).where(eq(users.id, testUserId)).execute();
  });

  it("should soft delete entry by setting deletedAt", async () => {
    const now = new Date().toISOString();

    await db
      .update(entries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(entries.id, testEntryId));

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(result).toBeTruthy();
    expect(result?.deletedAt).toBeTruthy();
    expect(new Date(result!.deletedAt!).getTime()).toBeLessThanOrEqual(
      Date.now()
    );
  });

  it("should update updatedAt when deleting", async () => {
    const [before] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    const beforeTime = new Date(before!.updatedAt).getTime();

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 10));

    const now = new Date().toISOString();
    await db
      .update(entries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(entries.id, testEntryId));

    const [after] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    const afterTime = new Date(after!.updatedAt).getTime();
    expect(afterTime).toBeGreaterThan(beforeTime);
  });

  it("should not affect other entries when deleting", async () => {
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
      deletedAt: null,
    });

    const now = new Date().toISOString();
    await db
      .update(entries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(entries.id, testEntryId));

    const [other] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, otherEntryId))
      .limit(1);

    expect(other?.deletedAt).toBeNull();
  });

  it("should exclude deleted entries from active queries", async () => {
    const now = new Date().toISOString();
    await db
      .update(entries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(entries.id, testEntryId));

    // Query for active entries only
    const activeEntries = await db
      .select()
      .from(entries)
      .where(and(eq(entries.userId, testUserId), isNull(entries.deletedAt)));

    expect(activeEntries).toHaveLength(0);
  });

  it("should not delete other users entries", async () => {
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
      deletedAt: null,
    });

    // Try to delete with wrong userId filter
    const now = new Date().toISOString();
    await db
      .update(entries)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(entries.id, otherEntryId), eq(entries.userId, testUserId))
      );

    const [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, otherEntryId))
      .limit(1);

    expect(result?.deletedAt).toBeNull(); // Not deleted

    // Cleanup
    await db.delete(entries).where(eq(entries.userId, otherUserId)).execute();
    await db.delete(users).where(eq(users.id, otherUserId)).execute();
  });

  it("should preserve all entry data when soft deleting", async () => {
    const [before] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    const now = new Date().toISOString();
    await db
      .update(entries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(entries.id, testEntryId));

    const [after] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    // All original data should be preserved
    expect(after?.type).toBe(before?.type);
    expect(after?.name).toBe(before?.name);
    expect(after?.userId).toBe(before?.userId);
    expect(after?.deletedAt).toBeTruthy(); // Now set
  });

  it("should allow restoring soft-deleted entry", async () => {
    // Soft delete
    const now = new Date().toISOString();
    await db
      .update(entries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(entries.id, testEntryId));

    const [deleted] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(deleted?.deletedAt).toBeTruthy();

    // Restore by setting deletedAt to null
    await db
      .update(entries)
      .set({ deletedAt: null, updatedAt: new Date().toISOString() })
      .where(eq(entries.id, testEntryId));

    const [restored] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);

    expect(restored?.deletedAt).toBeNull();
  });

  it("should include deleted entries in query without deletedAt filter", async () => {
    const now = new Date().toISOString();
    await db
      .update(entries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(entries.id, testEntryId));

    // Query without filtering deletedAt
    const allEntries = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, testUserId));

    expect(allEntries).toHaveLength(1);
    expect(allEntries[0]?.deletedAt).toBeTruthy();
  });

  it("should support multiple soft deletes and restores", async () => {
    // First delete
    let now = new Date().toISOString();
    await db
      .update(entries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(entries.id, testEntryId));

    let [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);
    expect(result?.deletedAt).toBeTruthy();

    // Restore
    await db
      .update(entries)
      .set({ deletedAt: null, updatedAt: new Date().toISOString() })
      .where(eq(entries.id, testEntryId));

    [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);
    expect(result?.deletedAt).toBeNull();

    // Delete again
    now = new Date().toISOString();
    await db
      .update(entries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(entries.id, testEntryId));

    [result] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, testEntryId))
      .limit(1);
    expect(result?.deletedAt).toBeTruthy();
  });
});
