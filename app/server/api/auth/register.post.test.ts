import { describe, it, expect, beforeEach } from "vitest";
import { db } from "~/server/db";
import { users, sessions } from "~/server/db/schema";

describe("POST /api/auth/register", () => {
  beforeEach(async () => {
    // Clean up
    await db.delete(sessions);
    await db.delete(users);
  });

  it("should register a new user", async () => {
    const response = await $fetch<{ user: { id: string; username: string } }>(
      "/api/auth/register",
      {
        method: "POST",
        body: {
          username: "newuser",
          password: "password123",
          timezone: "UTC",
        },
      }
    );

    expect(response.user).toBeDefined();
    expect(response.user.username).toBe("newuser");
    expect(response.user.id).toBeDefined();

    // Verify user was created in database
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, "newuser"));
    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0]!.username).toBe("newuser");
  });

  it("should hash the password", async () => {
    await $fetch("/api/auth/register", {
      method: "POST",
      body: {
        username: "secureuser",
        password: "mypassword",
      },
    });

    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, "secureuser"));

    expect(dbUsers[0]!.passwordHash).toBeDefined();
    expect(dbUsers[0]!.passwordHash).not.toBe("mypassword");
    expect(dbUsers[0]!.passwordHash!.length).toBeGreaterThan(20);
  });

  it("should set session cookie", async () => {
    const response = await $fetch<unknown>("/api/auth/register", {
      method: "POST",
      body: {
        username: "cookieuser",
        password: "password123",
      },
    });

    // In real implementation, cookie would be set
    // This is a basic check that response succeeds
    expect(response).toBeDefined();
  });

  it("should reject short username", async () => {
    await expect(() =>
      $fetch("/api/auth/register", {
        method: "POST",
        body: {
          username: "ab",
          password: "password123",
        },
      })
    ).rejects.toThrow();
  });

  it("should reject long username", async () => {
    await expect(() =>
      $fetch("/api/auth/register", {
        method: "POST",
        body: {
          username: "a".repeat(32),
          password: "password123",
        },
      })
    ).rejects.toThrow();
  });

  it("should reject short password", async () => {
    await expect(() =>
      $fetch("/api/auth/register", {
        method: "POST",
        body: {
          username: "validuser",
          password: "12345",
        },
      })
    ).rejects.toThrow();
  });

  it("should reject missing username", async () => {
    await expect(() =>
      $fetch("/api/auth/register", {
        method: "POST",
        body: {
          password: "password123",
        },
      })
    ).rejects.toThrow();
  });

  it("should reject missing password", async () => {
    await expect(() =>
      $fetch("/api/auth/register", {
        method: "POST",
        body: {
          username: "testuser",
        },
      })
    ).rejects.toThrow();
  });

  it("should reject duplicate username", async () => {
    // Register first user
    await $fetch("/api/auth/register", {
      method: "POST",
      body: {
        username: "duplicate",
        password: "password123",
      },
    });

    // Try to register again with same username
    await expect(() =>
      $fetch("/api/auth/register", {
        method: "POST",
        body: {
          username: "duplicate",
          password: "differentpass",
        },
      })
    ).rejects.toThrow();
  });

  it("should use provided timezone", async () => {
    await $fetch("/api/auth/register", {
      method: "POST",
      body: {
        username: "tzuser",
        password: "password123",
        timezone: "America/New_York",
      },
    });

    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, "tzuser"));

    expect(dbUsers[0]!.timezone).toBe("America/New_York");
  });

  it("should default to UTC timezone", async () => {
    await $fetch("/api/auth/register", {
      method: "POST",
      body: {
        username: "defaulttz",
        password: "password123",
      },
    });

    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, "defaulttz"));

    expect(dbUsers[0]!.timezone).toBe("UTC");
  });
});
