/**
 * Tests for unsubscribe token generation and verification.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "~/server/utils/hmacTokens";

const TEST_SECRET = "test-secret-key-for-hmac-sha256-tokens";

describe("hmacTokens", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateUnsubscribeToken", () => {
    it("produces a token with base64url.hex format", () => {
      const { token } = generateUnsubscribeToken("user-123", TEST_SECRET);

      expect(token).toContain(".");
      const [data64, sig] = token.split(".");
      expect(data64).toBeTruthy();
      expect(sig).toBeTruthy();
      // Signature should be hex (64 chars for SHA-256)
      expect(sig).toMatch(/^[0-9a-f]{64}$/);
    });

    it("includes userId and scope in payload", () => {
      const { payload } = generateUnsubscribeToken("user-456", TEST_SECRET);

      expect(payload.userId).toBe("user-456");
      expect(payload.scope).toBe("email");
      expect(payload.issuedAt).toBeGreaterThan(0);
    });

    it("produces different tokens for different users", () => {
      const { token: token1 } = generateUnsubscribeToken("user-1", TEST_SECRET);
      const { token: token2 } = generateUnsubscribeToken("user-2", TEST_SECRET);

      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyUnsubscribeToken", () => {
    it("verifies a valid token", () => {
      const { token } = generateUnsubscribeToken("user-789", TEST_SECRET);
      const result = verifyUnsubscribeToken(token, TEST_SECRET);

      expect(result.valid).toBe(true);
      expect(result.payload?.userId).toBe("user-789");
      expect(result.payload?.scope).toBe("email");
    });

    it("rejects a token with wrong secret", () => {
      const { token } = generateUnsubscribeToken("user-789", TEST_SECRET);
      const result = verifyUnsubscribeToken(token, "wrong-secret");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("signature");
    });

    it("rejects a malformed token (no dot)", () => {
      const result = verifyUnsubscribeToken("nodothere", TEST_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Malformed");
    });

    it("rejects an empty token", () => {
      const result = verifyUnsubscribeToken(".", TEST_SECRET);

      expect(result.valid).toBe(false);
    });

    it("rejects a tampered data section", () => {
      const { token } = generateUnsubscribeToken("user-789", TEST_SECRET);
      const [, sig] = token.split(".");
      const tamperedData = Buffer.from(
        JSON.stringify({ userId: "hacker", scope: "email", issuedAt: Date.now() }),
      ).toString("base64url");
      const tamperedToken = `${tamperedData}.${sig}`;

      const result = verifyUnsubscribeToken(tamperedToken, TEST_SECRET);
      expect(result.valid).toBe(false);
    });

    it("rejects an expired token", () => {
      // Mock Date.now to simulate token from 31 days ago
      const realNow = Date.now();
      vi.spyOn(Date, "now").mockReturnValueOnce(realNow - 31 * 24 * 60 * 60 * 1000);
      const { token } = generateUnsubscribeToken("user-789", TEST_SECRET);

      vi.spyOn(Date, "now").mockReturnValue(realNow);
      const result = verifyUnsubscribeToken(token, TEST_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("accepts a token within the max age", () => {
      // Token from 29 days ago
      const realNow = Date.now();
      vi.spyOn(Date, "now").mockReturnValueOnce(realNow - 29 * 24 * 60 * 60 * 1000);
      const { token } = generateUnsubscribeToken("user-789", TEST_SECRET);

      vi.spyOn(Date, "now").mockReturnValue(realNow);
      const result = verifyUnsubscribeToken(token, TEST_SECRET);

      expect(result.valid).toBe(true);
    });

    it("respects custom max age", () => {
      const realNow = Date.now();
      vi.spyOn(Date, "now").mockReturnValueOnce(realNow - 2 * 60 * 60 * 1000); // 2h ago
      const { token } = generateUnsubscribeToken("user-789", TEST_SECRET);

      vi.spyOn(Date, "now").mockReturnValue(realNow);
      const result = verifyUnsubscribeToken(
        token,
        TEST_SECRET,
        1 * 60 * 60 * 1000, // 1h max age
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });
  });
});
