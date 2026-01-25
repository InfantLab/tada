/**
 * API Key Encryption Utility
 *
 * Encrypts API keys using Web Crypto API with AES-GCM.
 * Keys are derived using PBKDF2 with 100,000 iterations.
 * A random IV is generated per encryption for security.
 *
 * This ensures user-provided API keys (BYOK) are stored securely
 * in localStorage/IndexedDB rather than as plain text.
 *
 * @module utils/apiKeyEncryption
 */

/**
 * Number of PBKDF2 iterations for key derivation
 * 100k provides good security while remaining performant on most devices
 */
const PBKDF2_ITERATIONS = 100_000;

/**
 * Salt length in bytes (128 bits)
 */
const SALT_LENGTH = 16;

/**
 * IV (Initialization Vector) length in bytes for AES-GCM (96 bits)
 */
const IV_LENGTH = 12;

/**
 * Structure of encrypted data with metadata for decryption
 */
export interface EncryptedApiKey {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded salt used for key derivation */
  salt: string;
  /** Version for future migration support */
  version: 1;
}

/**
 * Generate a cryptographic key from a password using PBKDF2
 *
 * @param password - User password or device-derived secret
 * @param salt - Salt for key derivation (ArrayBuffer)
 * @returns Derived CryptoKey for AES-GCM
 */
async function deriveKey(
  password: string,
  salt: ArrayBuffer,
): Promise<CryptoKey> {
  // Import password as raw key material
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );

  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a device-specific encryption key derived from available entropy sources
 *
 * This provides a reasonable level of security for client-side encryption
 * without requiring the user to remember a password. The key is derived from:
 * - User agent string
 * - Screen dimensions
 * - Timezone
 * - Language preferences
 *
 * Note: This is NOT cryptographically secure against a determined attacker
 * with access to the device, but protects against casual data exposure.
 */
export function getDeviceSecret(): string {
  if (typeof window === "undefined") {
    return "server-side-placeholder";
  }

  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency?.toString() || "unknown",
  ];

  return components.join("|");
}

/**
 * Encrypt an API key using AES-GCM
 *
 * @param apiKey - Plain text API key to encrypt
 * @param password - Optional password (uses device secret if not provided)
 * @returns Encrypted data structure with ciphertext, IV, and salt
 *
 * @example
 * ```typescript
 * const encrypted = await encryptApiKey("sk-abc123...");
 * // Store encrypted in localStorage
 * localStorage.setItem("openai_key", JSON.stringify(encrypted));
 * ```
 */
export async function encryptApiKey(
  apiKey: string,
  password?: string,
): Promise<EncryptedApiKey> {
  const secret = password || getDeviceSecret();

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Convert Uint8Array buffers to ArrayBuffer slices for proper typing
  const saltArrayBuffer = salt.buffer.slice(
    salt.byteOffset,
    salt.byteOffset + salt.byteLength,
  ) as ArrayBuffer;
  const ivArrayBuffer = iv.buffer.slice(
    iv.byteOffset,
    iv.byteOffset + iv.byteLength,
  ) as ArrayBuffer;

  // Derive encryption key
  const key = await deriveKey(secret, saltArrayBuffer);

  // Encrypt the API key
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(apiKey),
  );

  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(ivArrayBuffer),
    salt: bufferToBase64(saltArrayBuffer),
    version: 1,
  };
}

/**
 * Decrypt an encrypted API key
 *
 * @param encrypted - Encrypted data structure from encryptApiKey
 * @param password - Optional password (uses device secret if not provided)
 * @returns Decrypted API key as plain text
 * @throws Error if decryption fails (wrong password or corrupted data)
 *
 * @example
 * ```typescript
 * const encrypted = JSON.parse(localStorage.getItem("openai_key") || "{}");
 * const apiKey = await decryptApiKey(encrypted);
 * ```
 */
export async function decryptApiKey(
  encrypted: EncryptedApiKey,
  password?: string,
): Promise<string> {
  const secret = password || getDeviceSecret();

  // Decode Base64 values
  const salt = base64ToBuffer(encrypted.salt);
  const iv = base64ToBuffer(encrypted.iv);
  const ciphertext = base64ToBuffer(encrypted.ciphertext);

  // Derive same key
  const saltArrayBuffer = salt.buffer.slice(
    salt.byteOffset,
    salt.byteOffset + salt.byteLength,
  ) as ArrayBuffer;
  const key = await deriveKey(secret, saltArrayBuffer);

  // Decrypt - convert Uint8Array to proper BufferSource
  const ivBuffer = new Uint8Array(iv);
  const ciphertextBuffer = new Uint8Array(ciphertext);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    key,
    ciphertextBuffer,
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Validate that an encrypted key structure is valid
 *
 * @param value - Value to validate
 * @returns True if structure matches EncryptedApiKey format
 */
export function isValidEncryptedKey(value: unknown): value is EncryptedApiKey {
  if (!value || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;
  return (
    typeof obj["ciphertext"] === "string" &&
    typeof obj["iv"] === "string" &&
    typeof obj["salt"] === "string" &&
    obj["version"] === 1
  );
}

/**
 * Securely clear a string by overwriting its characters
 * Note: JavaScript strings are immutable, so this creates a new reference
 * The original may still exist in memory until garbage collected
 *
 * @param sensitive - String to clear (not truly effective in JS, but good practice)
 */
export function secureClear(sensitive: string): void {
  // In JavaScript, we can't truly clear a string from memory
  // This is a placeholder for the pattern - actual clearing happens via GC
  // For truly sensitive operations, consider using a typed array instead
  void sensitive;
}
