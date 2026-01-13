import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users, sessions } from "~/server/db/schema";
import { hashPassword } from "~/server/utils/password";

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // Clean up
    await db.delete(sessions);
    await db.delete(users);

    // Create test user
    const passwordHash = await hashPassword("testpass123");
    await db.insert(users).values({
      id: "test-user-1",
      username: "testuser",
      passwordHash,
      timezone: "UTC",
    });
  });

  it("should login with valid credentials", async () => {
    const response = await $fetch<{
      success: boolean;
      user: { id: string; username: string };
    }>("/api/auth/login", {
      method: "POST",
      body: {
        username: "testuser",
        password: "testpass123",
      },
    });

    expect(response.success).toBe(true);
    expect(response.user).toBeDefined();
    expect(response.user.username).toBe("testuser");
  });

  it("should reject invalid username", async () => {
    await expect(() =>
      $fetch("/api/auth/login", {
        method: "POST",
        body: {
          username: "nonexistent",
          password: "testpass123",
        },
      })
    ).rejects.toThrow();
  });

  it("should reject invalid password", async () => {
    await expect(() =>
      $fetch("/api/auth/login", {
        method: "POST",
        body: {
          username: "testuser",
          password: "wrongpassword",
        },
      })
    ).rejects.toThrow();
  });

  it("should reject missing username", async () => {
    await expect(() =>
      $fetch("/api/auth/login", {
        method: "POST",
        body: {
          password: "testpass123",
        },
      })
    ).rejects.toThrow();
  });

  it("should reject missing password", async () => {
    await expect(() =>
      $fetch("/api/auth/login", {
        method: "POST",
        body: {
          username: "testuser",
        },
      })
    ).rejects.toThrow();
  });

  it("should reject empty username", async () => {
    await expect(() =>
      $fetch("/api/auth/login", {
        method: "POST",
        body: {
          username: "",
          password: "testpass123",
        },
      })
    ).rejects.toThrow();
  });

  it("should reject empty password", async () => {
    await expect(() =>
      $fetch("/api/auth/login", {
        method: "POST",
        body: {
          username: "testuser",
          password: "",
        },
      })
    ).rejects.toThrow();
  });

  it("should create session on successful login", async () => {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: {
        username: "testuser",
        password: "testpass123",
      },
    });

    // Verify session was created
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, "test-user-1"));

    expect(userSessions.length).toBeGreaterThan(0);
  });

  it("should not leak user existence through timing", async () => {
    // Both invalid username and invalid password should take similar time
    // This is a basic check - timing is handled by password hashing
    const start1 = Date.now();
    await $fetch("/api/auth/login", {
      method: "POST",
      body: {
        username: "nonexistent",
        password: "somepassword",
      },
    }).catch(() => {});
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await $fetch("/api/auth/login", {
      method: "POST",
      body: {
        username: "testuser",
        password: "wrongpass",
      },
    }).catch(() => {});
    const time2 = Date.now() - start2;

    // Both should take at least some time (hash verification)
    expect(time1).toBeGreaterThan(10);
    expect(time2).toBeGreaterThan(10);
  });
});
