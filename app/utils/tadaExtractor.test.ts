/**
 * Tests for Tada Extractor
 */

import { describe, it, expect, vi } from "vitest";
import {
  validateExtractedTada,
  parseExtractionResponse,
  extractTadasRuleBased,
} from "./tadaExtractor";

vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "test-uuid-1234"),
});

describe("tadaExtractor", () => {
  describe("validateExtractedTada", () => {
    it("should validate a complete tada object", () => {
      const raw = {
        title: "Fixed the kitchen sink",
        category: "life_admin",
        significance: "major" as const,
        confidence: 0.95,
      };

      const result = validateExtractedTada(raw);
      expect(result).not.toBeNull();
      expect(result?.title).toBe("Fixed the kitchen sink");
      expect(result?.category).toBe("life_admin");
      expect(result?.significance).toBe("major");
    });

    it("should map legacy category names to current ontology", () => {
      const raw = {
        title: "Cleaned the house",
        category: "home",
        significance: "normal" as const,
      };

      const result = validateExtractedTada(raw);
      expect(result).not.toBeNull();
      expect(result?.category).toBe("life_admin");
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
          { title: "Fixed the sink", category: "life_admin", significance: "major" },
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
