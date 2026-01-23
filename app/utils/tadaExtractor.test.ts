/**
 * Tests for Tada Extractor
 */

import { describe, it, expect, vi } from "vitest";
import {
  validateExtractedTada,
  parseExtractionResponse,
  extractTadasRuleBased,
  EXTRACTION_PROMPT,
} from "./tadaExtractor";

vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "test-uuid-1234"),
});

describe("tadaExtractor", () => {
  describe("EXTRACTION_PROMPT", () => {
    it("should contain key extraction rules", () => {
      expect(EXTRACTION_PROMPT).toContain("productivity assistant");
      expect(EXTRACTION_PROMPT).toContain("accomplishments");
      expect(EXTRACTION_PROMPT).toContain("tadas");
    });

    it("should define significance levels", () => {
      expect(EXTRACTION_PROMPT).toContain("MAJOR significance");
      expect(EXTRACTION_PROMPT).toContain("MINOR significance");
      expect(EXTRACTION_PROMPT).toContain("NORMAL significance");
    });
  });

  describe("validateExtractedTada", () => {
    it("should validate a complete tada object", () => {
      const raw = {
        title: "Fixed the kitchen sink",
        category: "home",
        significance: "major" as const,
        confidence: 0.95,
      };

      const result = validateExtractedTada(raw);
      expect(result).not.toBeNull();
      expect(result?.title).toBe("Fixed the kitchen sink");
      expect(result?.category).toBe("home");
      expect(result?.significance).toBe("major");
    });

    it("should return null for empty title", () => {
      const result = validateExtractedTada({ title: "" });
      expect(result).toBeNull();
    });

    it("should normalize confidence percentage to decimal", () => {
      const result = validateExtractedTada({
        title: "Something",
        confidence: 85,
      });

      expect(result?.confidence).toBe(0.85);
    });
  });

  describe("parseExtractionResponse", () => {
    it("should parse valid JSON response", () => {
      const response = JSON.stringify({
        tadas: [
          { title: "Fixed the sink", category: "home", significance: "major" },
        ],
      });

      const result = parseExtractionResponse(response);
      expect(result.tadas).toHaveLength(1);
      expect(result.tadas[0]?.title).toBe("Fixed the sink");
    });

    it("should handle invalid JSON", () => {
      const result = parseExtractionResponse("not valid json");
      expect(result.tadas).toHaveLength(0);
      expect(result.error).toBeDefined();
    });
  });

  describe("extractTadasRuleBased", () => {
    it("should extract tada from simple sentence", () => {
      const result = extractTadasRuleBased("I finished my report today");
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]?.title).toContain("report");
    });

    it("should detect major significance from finally", () => {
      const result = extractTadasRuleBased("I finally fixed the kitchen sink");
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]?.significance).toBe("major");
    });
  });
});
