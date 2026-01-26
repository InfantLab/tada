import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  generateSecureToken as GenerateSecureTokenType,
  hashToken as HashTokenType,
  verifyToken as VerifyTokenType,
  generateTokenExpiry as GenerateTokenExpiryType,
  isTokenExpired as IsTokenExpiredType,
  generateId as GenerateIdType,
} from "./tokens";

describe("tokens", () => {
  // Dynamic imports to ensure fresh module state after mocks are set up
  let generateSecureToken: typeof GenerateSecureTokenType;
  let hashToken: typeof HashTokenType;
  let verifyToken: typeof VerifyTokenType;
  let generateTokenExpiry: typeof GenerateTokenExpiryType;
  let isTokenExpired: typeof IsTokenExpiredType;
  let generateId: typeof GenerateIdType;

  // Track UUID counter for mock
  let uuidCounter = 0;

  beforeEach(async () => {
    // Reset module cache and counter
    vi.resetModules();
    uuidCounter = 0;

    // Mock crypto.randomUUID if not available in test environment
    const mockRandomUUID = vi.fn(() => {
      uuidCounter++;
      return `550e8400-e29b-41d4-a716-44665544000${uuidCounter}`;
    });

    if (typeof crypto === "undefined" || !crypto.randomUUID) {
      Object.defineProperty(globalThis, "crypto", {
        value: {
          ...globalThis.crypto,
          randomUUID: mockRandomUUID,
        },
        writable: true,
      });
    }

    // Now import the tokens module
    const tokensModule = await import("./tokens");
    generateSecureToken = tokensModule.generateSecureToken;
    hashToken = tokensModule.hashToken;
    verifyToken = tokensModule.verifyToken;
    generateTokenExpiry = tokensModule.generateTokenExpiry;
    isTokenExpired = tokensModule.isTokenExpired;
    generateId = tokensModule.generateId;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateSecureToken", () => {
    it("generates a URL-safe token", () => {
      const token = generateSecureToken();
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(20);
      // URL-safe base64 shouldn't contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });

    it("generates unique tokens", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it("respects custom byte length", () => {
      const shortToken = generateSecureToken(16);
      const longToken = generateSecureToken(64);
      expect(longToken.length).toBeGreaterThan(shortToken.length);
    });
  });

  describe("hashToken", () => {
    it("returns consistent hash for same input", () => {
      const token = "test-token-123";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it("returns different hash for different input", () => {
      const hash1 = hashToken("token1");
      const hash2 = hashToken("token2");
      expect(hash1).not.toBe(hash2);
    });

    it("returns hex string", () => {
      const hash = hashToken("test");
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    });
  });

  describe("verifyToken", () => {
    it("returns true for matching token", () => {
      const token = generateSecureToken();
      const hash = hashToken(token);
      expect(verifyToken(token, hash)).toBe(true);
    });

    it("returns false for non-matching token", () => {
      const token = generateSecureToken();
      const hash = hashToken(token);
      expect(verifyToken("wrong-token", hash)).toBe(false);
    });

    it("returns false for different length hashes", () => {
      expect(verifyToken("token", "short")).toBe(false);
    });
  });

  describe("generateTokenExpiry", () => {
    it("generates ISO date string", () => {
      const expiry = generateTokenExpiry();
      expect(() => new Date(expiry)).not.toThrow();
      expect(new Date(expiry).toISOString()).toBe(expiry);
    });

    it("defaults to 6 hours from now", () => {
      const now = new Date();
      const expiry = new Date(generateTokenExpiry());
      const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(6, 0);
    });

    it("respects custom hours", () => {
      const now = new Date();
      const expiry = new Date(generateTokenExpiry(24));
      const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(24, 0);
    });
  });

  describe("isTokenExpired", () => {
    it("returns false for future date", () => {
      const future = new Date();
      future.setHours(future.getHours() + 1);
      expect(isTokenExpired(future.toISOString())).toBe(false);
    });

    it("returns true for past date", () => {
      const past = new Date();
      past.setHours(past.getHours() - 1);
      expect(isTokenExpired(past.toISOString())).toBe(true);
    });
  });

  describe("generateId", () => {
    it("generates valid UUID v4", () => {
      const id = generateId();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y is 8, 9, a, or b
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      // All 100 IDs should be unique
      expect(ids.size).toBe(100);
    });
  });
});
