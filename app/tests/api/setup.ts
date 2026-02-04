/**
 * Test Utilities and Fixtures
 *
 * Provides helper functions for creating test API keys, users, and entries
 * for API endpoint testing.
 */

import { db } from "~/server/db";
import { users, apiKeys, entries } from "~/server/db/schema";
import { createApiKey } from "~/server/utils/api-key";
import type { Permission } from "~/types/api";
import type { NewEntry } from "~/server/db/schema";

// Import eq and like for the cleanup functions
import { eq, like } from "drizzle-orm";

/**
 * Create a test user
 */
export async function createTestUser(
  overrides?: Partial<{
    id: string;
    username: string;
    email: string;
    timezone: string;
  }>,
) {
  const id = overrides?.id || crypto.randomUUID();
  const username = overrides?.username || `test_user_${Date.now()}`;
  const email = overrides?.email || `${username}@example.com`;

  await db.insert(users).values({
    id,
    username,
    email,
    emailVerified: true,
    passwordHash: "test_hash", // Not used for API tests
    timezone: overrides?.timezone || "UTC",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { id, username, email };
}

/**
 * Create a test API key with specified permissions
 */
export async function createTestApiKey(
  userId: string,
  permissions: Permission[] = ["entries:read", "entries:write"],
  name?: string,
) {
  const keyName = name || `Test API Key ${Date.now()}`;

  const result = await createApiKey(
    userId,
    keyName,
    permissions,
  );

  return {
    id: result.id,
    key: result.key,
    keyPrefix: result.keyPrefix,
    permissions,
  };
}

/**
 * Create a test entry
 */
export async function createTestEntry(
  userId: string,
  overrides?: Partial<NewEntry>,
): Promise<string> {
  const id = overrides?.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const entry: NewEntry = {
    id,
    userId,
    type: overrides?.type || "timed",
    name: overrides?.name || "Test Entry",
    category: overrides?.category || "mindfulness",
    subcategory: overrides?.subcategory || "sitting",
    emoji: overrides?.emoji || "🧘",
    timestamp: overrides?.timestamp || now,
    durationSeconds: overrides?.durationSeconds || 360,
    timezone: overrides?.timezone || "UTC",
    data: overrides?.data || {},
    tags: overrides?.tags || [],
    notes: overrides?.notes || null,
    source: overrides?.source || "api",
    externalId: overrides?.externalId || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await db.insert(entries).values(entry);

  return id;
}

/**
 * Create multiple test entries
 */
export async function createTestEntries(
  userId: string,
  count: number,
  overrides?: Partial<NewEntry>,
): Promise<string[]> {
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    const id = await createTestEntry(userId, {
      ...overrides,
      // Offset timestamps by index for chronological ordering
      timestamp: overrides?.timestamp
        ? new Date(
            new Date(overrides.timestamp).getTime() + i * 1000,
          ).toISOString()
        : new Date(Date.now() + i * 1000).toISOString(),
    });
    ids.push(id);
  }

  return ids;
}

/**
 * Clean up test data
 */
export async function cleanupTestData(userId: string) {
  // Delete entries
  await db.delete(entries).where(eq(entries.userId, userId));

  // Delete API keys
  await db.delete(apiKeys).where(eq(apiKeys.userId, userId));

  // Delete user
  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Clean up all test users (users with username starting with "test_user_")
 */
export async function cleanupAllTestData() {
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.username, "test_user_%"));

  for (const user of testUsers) {
    await cleanupTestData(user.id);
  }
}

/**
 * Create a complete test environment with user, API key, and entries
 */
export async function createTestEnvironment(options?: {
  permissions?: Permission[];
  entryCount?: number;
  entryType?: string;
}) {
  const user = await createTestUser();

  const apiKey = await createTestApiKey(
    user.id,
    options?.permissions || ["entries:read", "entries:write"],
  );

  const entryIds = await createTestEntries(
    user.id,
    options?.entryCount || 5,
    {
      type: options?.entryType || "timed",
    },
  );

  return {
    user,
    apiKey,
    entryIds,
    cleanup: async () => await cleanupTestData(user.id),
  };
}

/**
 * Create auth headers for API requests
 */
export function createAuthHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * Helper to make authenticated API requests in tests
 */
export async function authenticatedRequest<T = any>(
  path: string,
  options: {
    method?: string;
    apiKey: string;
    body?: any;
    query?: Record<string, string>;
  },
): Promise<T> {
  const { method = "GET", apiKey, body, query } = options;

  const url = new URL(path, "http://localhost:3000");
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      ...createAuthHeaders(apiKey),
      ...(body && { "Content-Type": "application/json" }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  return await response.json();
}
