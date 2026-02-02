/**
 * API Key Management Utilities
 *
 * Provides functions for generating, hashing, and validating API keys
 * with bcrypt for secure storage and constant-time comparison.
 */

import bcrypt from "bcryptjs";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "~/server/db";
import { apiKeys } from "~/server/db/schema";
import type { Permission } from "~/types/api";

const BCRYPT_COST = 12; // Cost factor for bcrypt hashing
const KEY_PREFIX = "tada_key_";
const KEY_LENGTH = 24; // bytes of random data (results in 32 chars base64url)

/**
 * Generate a new API key
 * Format: tada_key_{32 chars base64url}
 */
export function generateApiKey(): string {
  // Generate 24 bytes of random data -> 32 chars base64url
  const randomBytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));

  // Convert to base64url (URL-safe base64 without padding)
  const base64url = Buffer.from(randomBytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${KEY_PREFIX}${base64url}`;
}

/**
 * Hash an API key using bcrypt (cost 12)
 * NEVER store plaintext keys - only the hash
 */
export async function hashApiKey(key: string): Promise<string> {
  return await bcrypt.hash(key, BCRYPT_COST);
}

/**
 * Extract the key prefix (first 16 characters) for database lookup
 * Example: "tada_key_abc123..." -> "tada_key_abc123"
 */
export function getKeyPrefix(key: string): string {
  return key.slice(0, 16);
}

/**
 * Validate an API key against stored hash using constant-time comparison
 * Returns the API key record if valid, null if invalid
 */
export async function validateApiKey(key: string) {
  try {
    const prefix = getKeyPrefix(key);

    // Find API key by prefix for efficient lookup
    const apiKeyRecord = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.keyPrefix, prefix), isNull(apiKeys.revokedAt)),
    });

    if (!apiKeyRecord) {
      return null;
    }

    // Check if key is expired
    if (
      apiKeyRecord.expiresAt &&
      new Date(apiKeyRecord.expiresAt) < new Date()
    ) {
      return null;
    }

    // Validate hash using constant-time comparison (bcrypt.compare)
    const isValid = await bcrypt.compare(key, apiKeyRecord.keyHash);

    if (!isValid) {
      return null;
    }

    // Update lastUsedAt timestamp
    await db
      .update(apiKeys)
      .set({
        lastUsedAt: new Date().toISOString(),
      })
      .where(eq(apiKeys.id, apiKeyRecord.id));

    return apiKeyRecord;
  } catch (error) {
    console.error("API key validation error:", error);
    return null;
  }
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: string,
  name: string,
  permissions: Permission[],
  expiresAt?: string,
) {
  const key = generateApiKey();
  const keyHash = await hashApiKey(key);
  const keyPrefix = getKeyPrefix(key);

  const id = crypto.randomUUID();

  await db.insert(apiKeys).values({
    id,
    userId,
    name,
    keyHash,
    keyPrefix,
    permissions,
    expiresAt: expiresAt || null,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  });

  // Return plaintext key ONLY ONCE
  return {
    id,
    key, // Plaintext - user must save this
    keyPrefix,
    permissions,
    expiresAt,
  };
}

/**
 * Revoke an API key (soft delete)
 */
export async function revokeApiKey(keyId: string, userId: string) {
  await db
    .update(apiKeys)
    .set({
      revokedAt: new Date().toISOString(),
    })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
}

/**
 * List all active API keys for a user (masked)
 */
export async function listApiKeys(userId: string) {
  const keys = await db.query.apiKeys.findMany({
    where: and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)),
    columns: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  return keys;
}
