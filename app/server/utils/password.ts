// Password hashing utilities using Node's built-in crypto
// Compatible with both Bun and Node runtimes

import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Scrypt parameters (similar to Argon2id security level)
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 16384, // CPU/memory cost parameter (2^14)
  r: 8, // Block size
  p: 1, // Parallelization
};

/**
 * Hash a password using scrypt
 * Format: algorithm$N$r$p$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scryptAsync(
    password,
    salt,
    KEY_LENGTH,
    SCRYPT_OPTIONS
  )) as Buffer;

  // Store as: algorithm$N$r$p$salt$hash (all in hex)
  const { N, r, p } = SCRYPT_OPTIONS;
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${derivedKey.toString(
    "hex"
  )}`;
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const parts = hash.split("$");

    // Support legacy Bun Argon2id hashes (they start with $argon2id$)
    if (hash.startsWith("$argon2id$")) {
      // Cannot verify Argon2id hashes with scrypt
      // Users with old hashes will need to reset password
      return false;
    }

    // Parse scrypt hash format: scrypt$N$r$p$salt$hash
    if (parts.length !== 6 || parts[0] !== "scrypt") {
      throw new Error("Invalid hash format");
    }

    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = Buffer.from(parts[4], "hex");
    const storedKey = Buffer.from(parts[5], "hex");

    const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH, {
      N,
      r,
      p,
    })) as Buffer;

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(storedKey, derivedKey);
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}
