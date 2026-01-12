import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password utilities", () => {
  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const password = "mypassword123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(20);
      expect(hash).not.toBe(password);
    });

    it("should produce different hashes for same password", async () => {
      const password = "samepassword";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Salts should make hashes different
      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", async () => {
      const hash = await hashPassword("");
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle long passwords", async () => {
      const longPassword = "a".repeat(1000);
      const hash = await hashPassword(longPassword);
      expect(hash).toBeDefined();
    });

    it("should handle special characters", async () => {
      const specialPass = "p@ssw0rd!#$%^&*()";
      const hash = await hashPassword(specialPass);
      expect(hash).toBeDefined();
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "testpass123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "correctpass";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("wrongpass", hash);

      expect(isValid).toBe(false);
    });

    it("should reject similar password", async () => {
      const password = "password123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("password124", hash);

      expect(isValid).toBe(false);
    });

    it("should handle case sensitivity", async () => {
      const password = "MyPassword";
      const hash = await hashPassword(password);

      expect(await verifyPassword("MyPassword", hash)).toBe(true);
      expect(await verifyPassword("mypassword", hash)).toBe(false);
      expect(await verifyPassword("MYPASSWORD", hash)).toBe(false);
    });

    it("should reject empty password against hash", async () => {
      const password = "realpassword";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("", hash);

      expect(isValid).toBe(false);
    });

    it("should handle verification of empty string hash", async () => {
      const emptyHash = await hashPassword("");
      const isValid = await verifyPassword("", emptyHash);

      expect(isValid).toBe(true);
    });

    it("should reject invalid hash format", async () => {
      const result = await verifyPassword("password", "not-a-valid-hash");
      expect(result).toBe(false);
    });

    it("should be consistent across multiple verifications", async () => {
      const password = "consistent";
      const hash = await hashPassword(password);

      // Multiple verifications should all succeed
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword(password, hash)).toBe(true);
    });

    it("should handle unicode characters", async () => {
      const unicodePass = "pâssw😀rd";
      const hash = await hashPassword(unicodePass);

      expect(await verifyPassword(unicodePass, hash)).toBe(true);
      expect(await verifyPassword("pâssw🙂rd", hash)).toBe(false);
    });
  });
});
