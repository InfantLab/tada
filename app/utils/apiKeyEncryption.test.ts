/**
 * Tests for API Key Encryption Utility
 *
 * @module utils/apiKeyEncryption.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  encryptApiKey,
  decryptApiKey,
  isValidEncryptedKey,
  getDeviceSecret,
  type EncryptedApiKey,
} from "./apiKeyEncryption";

// Mock crypto API for tests
const mockSubtle = {
  importKey: vi.fn(),
  deriveKey: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
};

const mockCrypto = {
  subtle: mockSubtle,
  getRandomValues: vi.fn((array: Uint8Array) => {
    // Fill with predictable values for testing
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 256;
    }
    return array;
  }),
};

describe("apiKeyEncryption", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock global crypto
    vi.stubGlobal("crypto", mockCrypto);

    // Setup mock implementations
    mockSubtle.importKey.mockResolvedValue({} as CryptoKey);
    mockSubtle.deriveKey.mockResolvedValue({} as CryptoKey);
    mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(32));
    mockSubtle.decrypt.mockResolvedValue(
      new TextEncoder().encode("sk-test123"),
    );
  });

  describe("encryptApiKey", () => {
    it("should encrypt an API key and return structured data", async () => {
      const apiKey = "sk-test123";
      const result = await encryptApiKey(apiKey, "test-password");

      expect(result).toHaveProperty("ciphertext");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("salt");
      expect(result.version).toBe(1);
    });

    it("should generate random IV for each encryption", async () => {
      const apiKey = "sk-test123";

      await encryptApiKey(apiKey, "test-password");

      // Verify getRandomValues was called for salt and IV
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(2);
    });

    it("should use PBKDF2 for key derivation", async () => {
      const apiKey = "sk-test123";

      await encryptApiKey(apiKey, "test-password");

      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        "raw",
        expect.any(Uint8Array),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"],
      );

      expect(mockSubtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "PBKDF2",
          iterations: 100_000,
          hash: "SHA-256",
        }),
        expect.anything(),
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
    });

    it("should use AES-GCM for encryption", async () => {
      const apiKey = "sk-test123";

      await encryptApiKey(apiKey, "test-password");

      expect(mockSubtle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: "AES-GCM" }),
        expect.anything(),
        expect.any(Uint8Array),
      );
    });
  });

  describe("decryptApiKey", () => {
    it("should decrypt an encrypted API key", async () => {
      const encrypted: EncryptedApiKey = {
        ciphertext: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        iv: "AAAAAAAAAAAAAAAA",
        salt: "AAAAAAAAAAAAAAAAAAAAAAAAAA==",
        version: 1,
      };

      const result = await decryptApiKey(encrypted, "test-password");

      expect(result).toBe("sk-test123");
    });

    it("should use same key derivation parameters", async () => {
      const encrypted: EncryptedApiKey = {
        ciphertext: "dGVzdA==",
        iv: "AAAAAAAAAAAAAAAA",
        salt: "AAAAAAAAAAAAAAAAAAAAAA==",
        version: 1,
      };

      await decryptApiKey(encrypted, "test-password");

      expect(mockSubtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "PBKDF2",
          iterations: 100_000,
          hash: "SHA-256",
        }),
        expect.anything(),
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
    });
  });

  describe("roundtrip encryption/decryption", () => {
    it("should decrypt what was encrypted with same password", async () => {
      const originalKey = "sk-original-key-12345";
      const password = "my-secret-password";

      // Reset mocks with real-like behavior
      mockSubtle.encrypt.mockImplementation(async () => {
        return new TextEncoder().encode("encrypted-" + originalKey).buffer;
      });
      mockSubtle.decrypt.mockImplementation(async () => {
        return new TextEncoder().encode(originalKey);
      });

      const encrypted = await encryptApiKey(originalKey, password);
      const decrypted = await decryptApiKey(encrypted, password);

      expect(decrypted).toBe(originalKey);
    });
  });

  describe("isValidEncryptedKey", () => {
    it("should return true for valid encrypted key structure", () => {
      const valid: EncryptedApiKey = {
        ciphertext: "abc123",
        iv: "def456",
        salt: "ghi789",
        version: 1,
      };

      expect(isValidEncryptedKey(valid)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isValidEncryptedKey(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValidEncryptedKey(undefined)).toBe(false);
    });

    it("should return false for non-object", () => {
      expect(isValidEncryptedKey("string")).toBe(false);
      expect(isValidEncryptedKey(123)).toBe(false);
      expect(isValidEncryptedKey(true)).toBe(false);
    });

    it("should return false for missing ciphertext", () => {
      expect(isValidEncryptedKey({ iv: "a", salt: "b", version: 1 })).toBe(
        false,
      );
    });

    it("should return false for missing iv", () => {
      expect(
        isValidEncryptedKey({ ciphertext: "a", salt: "b", version: 1 }),
      ).toBe(false);
    });

    it("should return false for missing salt", () => {
      expect(
        isValidEncryptedKey({ ciphertext: "a", iv: "b", version: 1 }),
      ).toBe(false);
    });

    it("should return false for wrong version", () => {
      expect(
        isValidEncryptedKey({
          ciphertext: "a",
          iv: "b",
          salt: "c",
          version: 2,
        }),
      ).toBe(false);
    });
  });

  describe("getDeviceSecret", () => {
    it("should return server placeholder when window is undefined", () => {
      vi.stubGlobal("window", undefined);
      const secret = getDeviceSecret();
      expect(secret).toBe("server-side-placeholder");
    });

    it("should generate consistent device-specific secret", () => {
      // Mock window and navigator
      vi.stubGlobal("window", {});
      vi.stubGlobal("navigator", {
        userAgent: "Test Browser",
        language: "en-US",
        hardwareConcurrency: 4,
      });
      vi.stubGlobal("screen", { width: 1920, height: 1080 });
      vi.stubGlobal("Intl", {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({ timeZone: "America/New_York" }),
        }),
      });

      const secret1 = getDeviceSecret();
      const secret2 = getDeviceSecret();

      expect(secret1).toBe(secret2);
      expect(secret1).toContain("Test Browser");
      expect(secret1).toContain("1920x1080");
      expect(secret1).toContain("America/New_York");
      expect(secret1).toContain("en-US");
      expect(secret1).toContain("4");
    });
  });
});
