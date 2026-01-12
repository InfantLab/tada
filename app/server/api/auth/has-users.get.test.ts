import { describe, it, expect, beforeEach } from "vitest";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

describe("GET /api/auth/has-users", () => {
  beforeEach(async () => {
    // Clean up users table
    await db.delete(users);
  });

  it("should return false when no users exist", async () => {
    const response = await $fetch<{ hasUsers: boolean }>("/api/auth/has-users");

    expect(response).toMatchObject({
      hasUsers: false,
    });
  });

  it("should return true when users exist", async () => {
    // Create a test user
    await db.insert(users).values({
      id: "test-user-1",
      username: "testuser",
      passwordHash: "dummy-hash",
      timezone: "UTC",
    });

    const response = await $fetch<{ hasUsers: boolean }>("/api/auth/has-users");

    expect(response).toMatchObject({
      hasUsers: true,
    });
  });

  it("should return true even with multiple users", async () => {
    // Create multiple test users
    await db.insert(users).values([
      {
        id: "test-user-1",
        username: "user1",
        passwordHash: "hash1",
        timezone: "UTC",
      },
      {
        id: "test-user-2",
        username: "user2",
        passwordHash: "hash2",
        timezone: "America/New_York",
      },
    ]);

    const response = await $fetch<{ hasUsers: boolean }>("/api/auth/has-users");

    expect(response.hasUsers).toBe(true);
  });
});
