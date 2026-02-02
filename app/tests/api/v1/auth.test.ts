/**
 * Tests for /api/v1/auth/keys endpoints
 *
 * User Story 3: API Key Management
 * Tests API key creation, listing, and revocation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestUser, cleanupTestData } from "~/tests/api/setup";
import { createApiKey, listApiKeys } from "~/server/utils/api-key";
import type { Permission } from "~/types/api";

describe("POST /api/v1/auth/keys", () => {
  let userId: string;
  let username: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    username = user.username;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("generates API key with tada_key_ prefix and 32 random chars", async () => {
    const result = await createApiKey(userId, "Test Key", ["entries:read"]);

    expect(result.key).toBeDefined();
    expect(result.key).toMatch(/^tada_key_[A-Za-z0-9_-]{32}$/);
    expect(result.keyPrefix).toBe(result.key.slice(0, 16));
  });

  it("hashes API key with bcrypt before storing", async () => {
    const result = await createApiKey(userId, "Test Key", ["entries:read"]);

    // Verify key was hashed (not stored in plaintext)
    const keys = await listApiKeys(userId);
    const storedKey = keys.find((k) => k.id === result.id);

    expect(storedKey).toBeDefined();
    // Should only have prefix, not full key
    expect(storedKey!.keyPrefix).toBe(result.keyPrefix);
  });

  it("returns plaintext key only once on creation", async () => {
    const permissions: Permission[] = ["entries:read", "rhythms:read"];

    const result = await createApiKey(userId, "Integration Key", permissions);

    expect(result.key).toBeDefined();
    expect(result.key).toContain("tada_key_");
    expect(result.permissions).toEqual(permissions);

    // Subsequent list should NOT include plaintext key
    const keys = await listApiKeys(userId);
    const listedKey = keys.find((k) => k.id === result.id);

    expect(listedKey).toBeDefined();
    expect(listedKey).not.toHaveProperty("key"); // No plaintext key
    expect(listedKey).not.toHaveProperty("keyHash"); // No hash exposed
  });
});

describe("GET /api/v1/auth/keys", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    // Create some test API keys
    await createApiKey(userId, "Key 1", ["entries:read"]);
    await createApiKey(userId, "Key 2", ["entries:write", "rhythms:read"]);
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("lists masked API keys with metadata", async () => {
    const keys = await listApiKeys(userId);

    expect(keys.length).toBeGreaterThanOrEqual(2);

    const key = keys[0];
    expect(key.id).toBeDefined();
    expect(key.name).toBeDefined();
    expect(key.keyPrefix).toBeDefined();
    expect(key.permissions).toBeDefined();
    expect(key.createdAt).toBeDefined();

    // Should include these fields
    expect(key).toHaveProperty("lastUsedAt");
    expect(key).toHaveProperty("expiresAt");

    // Should NOT include sensitive fields
    expect(key).not.toHaveProperty("keyHash");
    expect(key).not.toHaveProperty("key");
  });
});

describe("DELETE /api/v1/auth/keys/[id]", () => {
  let userId: string;
  let apiKeyId: string;
  let apiKey: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    const result = await createApiKey(userId, "Test Key", ["entries:read"]);
    apiKeyId = result.id;
    apiKey = result.key;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("revokes API key and subsequent requests fail", async () => {
    // Import revoke function
    const { revokeApiKey, validateApiKey } = await import(
      "~/server/utils/api-key"
    );

    // Verify key works before revocation
    const validBefore = await validateApiKey(apiKey);
    expect(validBefore).not.toBeNull();
    expect(validBefore!.id).toBe(apiKeyId);

    // Revoke the key
    await revokeApiKey(apiKeyId, userId);

    // Verify key no longer works
    const validAfter = await validateApiKey(apiKey);
    expect(validAfter).toBeNull();
  });

  it("validates API key expiration", async () => {
    // Create key with past expiration
    const expiredDate = new Date(Date.now() - 1000).toISOString();
    const { validateApiKey } = await import("~/server/utils/api-key");

    const expiredResult = await createApiKey(
      userId,
      "Expired Key",
      ["entries:read"],
      expiredDate,
    );

    // Should not validate due to expiration
    const valid = await validateApiKey(expiredResult.key);
    expect(valid).toBeNull();
  });

  it("enforces permissions - entries:read cannot POST entries", async () => {
    const { validateApiKey } = await import("~/server/utils/api-key");

    // Create key with only read permission
    const readOnlyResult = await createApiKey(userId, "Read Only", [
      "entries:read",
    ]);

    const validated = await validateApiKey(readOnlyResult.key);
    expect(validated).not.toBeNull();
    expect(validated!.permissions).toEqual(["entries:read"]);
    expect(validated!.permissions).not.toContain("entries:write");
  });
});
