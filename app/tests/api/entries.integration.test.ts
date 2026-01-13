import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setup, fetch } from "@nuxt/test-utils/e2e";
import { db } from "~/server/db";
import { users, entries, sessions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Integration tests for Entries API (v0.1.0)
 *
 * Tests the full HTTP request/response cycle including:
 * - Authentication via session cookies
 * - Request validation (required fields, types)
 * - Business logic (soft delete, filtering, pagination)
 * - Response formatting
 * - Edge cases and error handling
 *
 * These tests hit the actual API endpoints, unlike unit tests which
 * test isolated functions. Integration tests validate the complete
 * user experience.
 */

describe("Entries API Integration", async () => {
  await setup({
    server: true,
  });

  const testUserId = nanoid();
  const testSessionId = nanoid();
  let authCookie: string;

  beforeAll(async () => {
    // Create test user and session
    await db.insert(users).values({
      id: testUserId,
      username: "testuser",
      passwordHash: "test-hash",
      timezone: "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 60 * 24 * 30); // 30 days
    await db.insert(sessions).values({
      id: testSessionId,
      userId: testUserId,
      expiresAt: Math.floor(expiresAt.getTime() / 1000), // Unix timestamp in seconds
    });

    authCookie = `auth_session=${testSessionId}`;
  });

  afterAll(async () => {
    await db.delete(entries).where(eq(entries.userId, testUserId)).execute();
    await db.delete(sessions).where(eq(sessions.userId, testUserId)).execute();
    await db.delete(users).where(eq(users.id, testUserId)).execute();
  });

  beforeEach(async () => {
    // Clean up entries before each test
    await db.delete(entries).where(eq(entries.userId, testUserId)).execute();
  });

  describe("GET /api/entries", () => {
    it("should return 401 without authentication", async () => {
      const response = await fetch("/api/entries", {
        headers: {},
      });

      expect(response.status).toBe(401);
    });

    it("should reject invalid session", async () => {
      const response = await fetch("/api/entries", {
        headers: {
          Cookie: "auth_session=invalid-session-id",
        },
      });

      expect(response.status).toBe(401);
    });

    it("should return empty array when no entries exist", async () => {
      const response = await fetch("/api/entries", {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it("should return user's entries with all fields", async () => {
      const now = new Date().toISOString();
      const entryId = nanoid();
      await db.insert(entries).values({
        id: entryId,
        userId: testUserId,
        type: "timed",
        name: "meditation",
        category: "mindfulness",
        subcategory: "sitting",
        emoji: "🧘",
        timestamp: now,
        timezone: "UTC",
        data: { duration: 1200 },
        tags: ["morning", "peaceful"],
        createdAt: now,
        updatedAt: now,
      });

      const response = await fetch("/api/entries", {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        id: entryId,
        type: "timed",
        name: "meditation",
        category: "mindfulness",
        subcategory: "sitting",
        emoji: "🧘",
      });
      expect(data[0].data).toEqual({ duration: 1200 });
      expect(data[0].tags).toEqual(["morning", "peaceful"]);
    });

    it("should filter by type query parameter", async () => {
      const now = new Date().toISOString();
      await db.insert(entries).values([
        {
          id: nanoid(),
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
          id: nanoid(),
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
        {
          id: nanoid(),
          userId: testUserId,
          type: "tada",
          name: "accomplishment",
          timestamp: now,
          timezone: "UTC",
          data: {},
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const response = await fetch("/api/entries?type=timed", {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].type).toBe("timed");
    });

    it("should exclude soft-deleted entries by default", async () => {
      const now = new Date().toISOString();
      await db.insert(entries).values([
        {
          id: nanoid(),
          userId: testUserId,
          type: "timed",
          name: "active",
          timestamp: now,
          timezone: "UTC",
          data: {},
          tags: [],
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        {
          id: nanoid(),
          userId: testUserId,
          type: "timed",
          name: "deleted",
          timestamp: now,
          timezone: "UTC",
          data: {},
          tags: [],
          createdAt: now,
          updatedAt: now,
          deletedAt: now,
        },
      ]);

      const response = await fetch("/api/entries", {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("active");
      expect(data[0].deletedAt).toBeNull();
    });

    it("should not return other users' entries", async () => {
      const now = new Date().toISOString();
      const otherUserId = nanoid();

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
          id: nanoid(),
          userId: testUserId,
          type: "timed",
          name: "my entry",
          timestamp: now,
          timezone: "UTC",
          data: {},
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: nanoid(),
          userId: otherUserId,
          type: "timed",
          name: "other user entry",
          timestamp: now,
          timezone: "UTC",
          data: {},
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const response = await fetch("/api/entries", {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("my entry");

      // Cleanup
      await db.delete(entries).where(eq(entries.userId, otherUserId)).execute();
      await db.delete(users).where(eq(users.id, otherUserId)).execute();
    });

    it("should order by timestamp descending (newest first)", async () => {
      const timestamps = [
        new Date("2026-01-10T10:00:00Z").toISOString(),
        new Date("2026-01-12T10:00:00Z").toISOString(),
        new Date("2026-01-11T10:00:00Z").toISOString(),
      ];

      for (let i = 0; i < timestamps.length; i++) {
        await db.insert(entries).values({
          id: nanoid(),
          userId: testUserId,
          type: "timed",
          name: `entry-${i}`,
          timestamp: timestamps[i],
          timezone: "UTC",
          data: {},
          tags: [],
          createdAt: timestamps[i],
          updatedAt: timestamps[i],
        });
      }

      const response = await fetch("/api/entries", {
        headers: {
          Cookie: authCookie,
        },
      });

      const data = await response.json();
      expect(data).toHaveLength(3);
      expect(data[0].name).toBe("entry-1"); // Jan 12 (newest)
      expect(data[1].name).toBe("entry-2"); // Jan 11
      expect(data[2].name).toBe("entry-0"); // Jan 10 (oldest)
    });

    it("should respect limit parameter", async () => {
      const now = new Date().toISOString();
      for (let i = 0; i < 5; i++) {
        await db.insert(entries).values({
          id: nanoid(),
          userId: testUserId,
          type: "timed",
          name: `entry-${i}`,
          timestamp: now,
          timezone: "UTC",
          data: {},
          tags: [],
          createdAt: now,
          updatedAt: now,
        });
      }

      const response = await fetch("/api/entries?limit=3", {
        headers: {
          Cookie: authCookie,
        },
      });

      const data = await response.json();
      expect(data).toHaveLength(3);
    });
  });

  describe("POST /api/entries", () => {
    it("should return 401 without authentication", async () => {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "timed",
          name: "meditation",
          timestamp: new Date().toISOString(),
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should create entry with minimal required fields", async () => {
      const timestamp = new Date().toISOString();
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          type: "timed",
          name: "meditation",
          timestamp,
          timezone: "UTC",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe("timed");
      expect(data.name).toBe("meditation");
      expect(data.id).toBeTruthy();
      expect(data.userId).toBe(testUserId);
      expect(data.createdAt).toBeTruthy();
      expect(data.updatedAt).toBeTruthy();
    });

    it("should create entry with all optional fields", async () => {
      const timestamp = new Date().toISOString();
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          type: "timed",
          name: "meditation",
          category: "mindfulness",
          subcategory: "sitting",
          emoji: "🧘",
          timestamp,
          timezone: "America/New_York",
          data: { duration: 1200, mood: "calm" },
          tags: ["morning", "peaceful"],
          notes: "Great session today",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.category).toBe("mindfulness");
      expect(data.subcategory).toBe("sitting");
      expect(data.emoji).toBe("🧘");
      expect(data.timezone).toBe("America/New_York");
      expect(data.data).toEqual({ duration: 1200, mood: "calm" });
      expect(data.tags).toEqual(["morning", "peaceful"]);
      expect(data.notes).toBe("Great session today");
    });

    it("should validate required fields", async () => {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          // Missing type, name, timestamp
          category: "mindfulness",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should handle timed entries with duration", async () => {
      const startTime = new Date("2026-01-12T10:00:00Z").toISOString();
      const endTime = new Date("2026-01-12T10:20:00Z").toISOString();

      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          type: "timed",
          name: "meditation",
          timestamp: startTime,
          timezone: "UTC",
          data: {
            startedAt: startTime,
            endedAt: endTime,
            duration: 1200,
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.duration).toBe(1200);
      expect(data.data.startedAt).toBe(startTime);
      expect(data.data.endedAt).toBe(endTime);
    });

    it("should handle tada (accomplishment) entries", async () => {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          type: "tada",
          name: "Fixed the leaky tap",
          timestamp: new Date().toISOString(),
          timezone: "UTC",
          category: "accomplishment",
          subcategory: "home",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe("tada");
      expect(data.category).toBe("accomplishment");
    });

    it("should handle journal entries with content", async () => {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          type: "journal",
          name: "Dream journal",
          timestamp: new Date().toISOString(),
          timezone: "UTC",
          notes: "I dreamed I was flying over mountains...",
          category: "journal",
          subcategory: "dream",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe("journal");
      expect(data.notes).toContain("flying over mountains");
    });

    it("should generate unique IDs for entries", async () => {
      const timestamp = new Date().toISOString();
      const ids = new Set();

      for (let i = 0; i < 3; i++) {
        const response = await fetch("/api/entries", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
          },
          body: JSON.stringify({
            type: "timed",
            name: `entry-${i}`,
            timestamp,
            timezone: "UTC",
          }),
        });

        const data = await response.json();
        ids.add(data.id);
      }

      expect(ids.size).toBe(3);
    });

    it("should set timestamps automatically", async () => {
      const before = Date.now();

      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          type: "timed",
          name: "meditation",
          timestamp: new Date().toISOString(),
          timezone: "UTC",
        }),
      });

      const after = Date.now();
      const data = await response.json();

      const createdAt = new Date(data.createdAt).getTime();
      expect(createdAt).toBeGreaterThanOrEqual(before);
      expect(createdAt).toBeLessThanOrEqual(after);
      expect(data.updatedAt).toBe(data.createdAt);
    });
  });

  describe("PATCH /api/entries/:id", () => {
    let entryId: string;

    beforeEach(async () => {
      const now = new Date().toISOString();
      entryId = nanoid();
      await db.insert(entries).values({
        id: entryId,
        userId: testUserId,
        type: "timed",
        name: "meditation",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      });
    });

    it("should return 401 without authentication", async () => {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "updated",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should update entry fields", async () => {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: "updated meditation",
          category: "mindfulness",
          emoji: "🌟",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("updated meditation");
      expect(data.category).toBe("mindfulness");
      expect(data.emoji).toBe("🌟");
      expect(data.type).toBe("timed"); // Unchanged
    });

    it("should update only specified fields", async () => {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          emoji: "🎯",
        }),
      });

      const data = await response.json();
      expect(data.emoji).toBe("🎯");
      expect(data.name).toBe("meditation"); // Unchanged
    });

    it("should update updatedAt timestamp", async () => {
      const [before] = await db
        .select()
        .from(entries)
        .where(eq(entries.id, entryId))
        .limit(1);
      const originalUpdatedAt = before!.updatedAt;

      // Small delay to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: "updated",
        }),
      });

      const data = await response.json();
      expect(data.updatedAt).not.toBe(originalUpdatedAt);
      expect(data.createdAt).toBe(before!.createdAt); // Unchanged
    });

    it("should return 404 for non-existent entry", async () => {
      const response = await fetch(`/api/entries/nonexistent`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: "updated",
        }),
      });

      expect(response.status).toBe(404);
    });

    it("should not update other users' entries", async () => {
      const otherUserId = nanoid();
      const otherEntryId = nanoid();
      const now = new Date().toISOString();

      await db.insert(users).values({
        id: otherUserId,
        username: "otheruser",
        passwordHash: "hash",
        timezone: "UTC",
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(entries).values({
        id: otherEntryId,
        userId: otherUserId,
        type: "timed",
        name: "other entry",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      });

      const response = await fetch(`/api/entries/${otherEntryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: "hacked",
        }),
      });

      expect(response.status).toBe(404);

      // Verify entry wasn't updated
      const [entry] = await db
        .select()
        .from(entries)
        .where(eq(entries.id, otherEntryId))
        .limit(1);
      expect(entry!.name).toBe("other entry");

      // Cleanup
      await db.delete(entries).where(eq(entries.userId, otherUserId)).execute();
      await db.delete(users).where(eq(users.id, otherUserId)).execute();
    });

    it("should update data JSONB field", async () => {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          data: { duration: 1800, mood: "calm", rating: 5 },
        }),
      });

      const data = await response.json();
      expect(data.data).toEqual({ duration: 1800, mood: "calm", rating: 5 });
    });

    it("should update tags array", async () => {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          tags: ["evening", "focused", "grateful"],
        }),
      });

      const data = await response.json();
      expect(data.tags).toEqual(["evening", "focused", "grateful"]);
    });

    it("should allow setting fields to null", async () => {
      await db
        .update(entries)
        .set({ emoji: "🧘", notes: "Some notes" })
        .where(eq(entries.id, entryId))
        .execute();

      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          emoji: null,
          notes: null,
        }),
      });

      const data = await response.json();
      expect(data.emoji).toBeNull();
      expect(data.notes).toBeNull();
    });
  });

  describe("DELETE /api/entries/:id", () => {
    let entryId: string;

    beforeEach(async () => {
      const now = new Date().toISOString();
      entryId = nanoid();
      await db.insert(entries).values({
        id: entryId,
        userId: testUserId,
        type: "timed",
        name: "meditation",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      });
    });

    it("should return 401 without authentication", async () => {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(401);
    });

    it("should soft delete entry by setting deletedAt", async () => {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "DELETE",
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(204);

      // Verify it's soft deleted (still in database)
      const [deleted] = await db
        .select()
        .from(entries)
        .where(eq(entries.id, entryId))
        .limit(1);

      expect(deleted).toBeDefined();
      expect(deleted!.deletedAt).toBeTruthy();
      expect(deleted!.name).toBe("meditation"); // Data preserved
    });

    it("should update updatedAt when deleting", async () => {
      const [before] = await db
        .select()
        .from(entries)
        .where(eq(entries.id, entryId))
        .limit(1);
      const originalUpdatedAt = before!.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      await fetch(`/api/entries/${entryId}`, {
        method: "DELETE",
        headers: {
          Cookie: authCookie,
        },
      });

      const [after] = await db
        .select()
        .from(entries)
        .where(eq(entries.id, entryId))
        .limit(1);
      expect(after!.updatedAt).not.toBe(originalUpdatedAt);
    });

    it("should return 404 for non-existent entry", async () => {
      const response = await fetch(`/api/entries/nonexistent`, {
        method: "DELETE",
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(404);
    });

    it("should not delete other users' entries", async () => {
      const otherUserId = nanoid();
      const otherEntryId = nanoid();
      const now = new Date().toISOString();

      await db.insert(users).values({
        id: otherUserId,
        username: "otheruser",
        passwordHash: "hash",
        timezone: "UTC",
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(entries).values({
        id: otherEntryId,
        userId: otherUserId,
        type: "timed",
        name: "other entry",
        timestamp: now,
        timezone: "UTC",
        data: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      });

      const response = await fetch(`/api/entries/${otherEntryId}`, {
        method: "DELETE",
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(404);

      // Verify entry wasn't deleted
      const [entry] = await db
        .select()
        .from(entries)
        .where(eq(entries.id, otherEntryId))
        .limit(1);
      expect(entry!.deletedAt).toBeNull();

      // Cleanup
      await db.delete(entries).where(eq(entries.userId, otherUserId)).execute();
      await db.delete(users).where(eq(users.id, otherUserId)).execute();
    });

    it("should exclude deleted entries from GET requests", async () => {
      // Delete the entry
      await fetch(`/api/entries/${entryId}`, {
        method: "DELETE",
        headers: {
          Cookie: authCookie,
        },
      });

      // Verify it doesn't appear in GET
      const response = await fetch("/api/entries", {
        headers: {
          Cookie: authCookie,
        },
      });

      const data = await response.json();
      expect(data).toHaveLength(0);
    });

    it("should allow restoring soft-deleted entry", async () => {
      // Delete entry
      await fetch(`/api/entries/${entryId}`, {
        method: "DELETE",
        headers: {
          Cookie: authCookie,
        },
      });

      // Restore by setting deletedAt to null
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deletedAt: null,
        }),
      });

      expect(response.status).toBe(200);

      // Verify it appears in GET again
      const getResponse = await fetch("/api/entries", {
        headers: {
          Cookie: authCookie,
        },
      });

      const data = await getResponse.json();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(entryId);
    });

    it("should allow multiple soft deletes and restores", async () => {
      // Delete
      await fetch(`/api/entries/${entryId}`, {
        method: "DELETE",
        headers: {
          Cookie: authCookie,
        },
      });

      // Restore
      await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deletedAt: null,
        }),
      });

      // Delete again
      await fetch(`/api/entries/${entryId}`, {
        method: "DELETE",
        headers: {
          Cookie: authCookie,
        },
      });

      const [entry] = await db
        .select()
        .from(entries)
        .where(eq(entries.id, entryId))
        .limit(1);
      expect(entry!.deletedAt).toBeTruthy();
      expect(entry!.name).toBe("meditation"); // Still intact
    });
  });
});
