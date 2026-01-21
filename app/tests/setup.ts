import { beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import {
  users,
  entries,
  sessions,
  importLogs,
  importRecipes,
} from "~/server/db/schema";

/**
 * Global test setup
 *
 * This file runs once before all tests to prepare the test environment.
 * Individual tests should handle their own data setup/cleanup.
 */

beforeAll(async () => {
  // Clean all test data before starting
  try {
    await db.delete(importLogs).execute();
    await db.delete(importRecipes).execute();
    await db.delete(entries).execute();
    await db.delete(sessions).execute();
    await db.delete(users).execute();
    console.log("🧪 Test database cleaned and ready");
  } catch (error) {
    console.error("Failed to clean test database:", error);
  }
});

afterAll(async () => {
  // Clean up all test data
  try {
    await db.delete(importLogs).execute();
    await db.delete(importRecipes).execute();
    await db.delete(entries).execute();
    await db.delete(sessions).execute();
    await db.delete(users).execute();
    console.log("🧹 Test database cleaned");
  } catch (error) {
    console.error("Failed to clean up test database:", error);
  }
});

// Helper to create test user (export for use in tests)
export async function createTestUser(id: string, username: string) {
  await db.insert(users).values({
    id,
    username,
    passwordHash: "test-hash",
    timezone: "UTC",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return {
    id,
    username,
    timezone: "UTC",
  };
}

// Helper to create test entry
export async function createTestEntry(
  userId: string,
  overrides: Partial<Record<string, unknown>> = {}
) {
  const entry = {
    id: `test-entry-${Date.now()}-${Math.random()}`,
    userId,
    type: "timed",
    name: "test-entry",
    timestamp: new Date().toISOString(),
    timezone: "UTC",
    data: {},
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };

  await db.insert(entries).values(entry);
  return entry;
}

// Helper to clean up test user and their entries
export async function cleanupTestUser(userId: string) {
  await db.delete(entries).where(eq(entries.userId, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}
