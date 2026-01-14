/**
 * Secure token generation and verification utilities
 * Used for password reset tokens, email verification, etc.
 */

import { randomBytes, createHash } from "crypto";

/**
 * Generate a cryptographically secure random token
 * Returns a URL-safe base64-encoded string
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Hash a token using SHA-256 for storage
 * Never store plain tokens in the database
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a token against its stored hash
 */
export function verifyToken(token: string, storedHash: string): boolean {
  const tokenHash = hashToken(token);
  // Use constant-time comparison to prevent timing attacks
  if (tokenHash.length !== storedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < tokenHash.length; i++) {
    result |= tokenHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate expiry timestamp for password reset tokens
 * Default: 6 hours from now
 */
export function generateTokenExpiry(hoursFromNow: number = 6): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hoursFromNow);
  return expiry.toISOString();
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Generate a UUID v4 for database IDs
 */
export function generateId(): string {
  return crypto.randomUUID();
}
