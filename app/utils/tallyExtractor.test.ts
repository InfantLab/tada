/**
 * Tests for tallyExtractor utility
 * @module utils/tallyExtractor.test
 */

import { describe, it, expect } from "vitest";
import {
  extractTalliesRuleBased,
  parseNumber,
  parseTallyExtractionResponse,
} from "./tallyExtractor";

describe("tallyExtractor", () => {
  describe("parseNumber", () => {
    it("parses digit numbers", () => {
      expect(parseNumber("10")).toBe(10);
      expect(parseNumber("123")).toBe(123);
      expect(parseNumber("0")).toBe(0);
    });

    it("parses word numbers", () => {
      expect(parseNumber("ten")).toBe(10);
      expect(parseNumber("twelve")).toBe(12);
      expect(parseNumber("twenty")).toBe(20);
    });

    it("parses compound numbers", () => {
      expect(parseNumber("twenty five")).toBe(25);
      expect(parseNumber("thirty-two")).toBe(32);
    });

    it("handles case insensitivity", () => {
      expect(parseNumber("TEN")).toBe(10);
      expect(parseNumber("Twenty")).toBe(20);
    });

    it("returns null for invalid input", () => {
      expect(parseNumber("hello")).toBeNull();
      expect(parseNumber("")).toBeNull();
    });
  });

  describe("extractTalliesRuleBased", () => {
    it("extracts simple count + activity", () => {
      const result = extractTalliesRuleBased("10 push-ups");
      expect(result.tallies).toHaveLength(1);
      expect(result.tallies[0]?.activity).toBe("Push-ups");
      expect(result.tallies[0]?.count).toBe(10);
      expect(result.tallies[0]?.category).toBe("movement");
    });

    it("extracts multiple activities from comma-separated list", () => {
      const result = extractTalliesRuleBased(
        "10 push-ups, 12 kettlebells and 30 squats",
      );
      expect(result.tallies).toHaveLength(3);
      expect(result.tallies[0]?.count).toBe(10);
      expect(result.tallies[0]?.activity).toBe("Push-ups");
      expect(result.tallies[1]?.count).toBe(12);
      expect(result.tallies[1]?.activity).toBe("Kettlebells");
      expect(result.tallies[2]?.count).toBe(30);
      expect(result.tallies[2]?.activity).toBe("Squats");
    });

    it("extracts word numbers", () => {
      const result = extractTalliesRuleBased("twenty push-ups");
      expect(result.tallies).toHaveLength(1);
      expect(result.tallies[0]?.count).toBe(20);
    });

    it("handles 'did X activity' format", () => {
      const result = extractTalliesRuleBased("did 50 jumping jacks");
      expect(result.tallies).toHaveLength(1);
      expect(result.tallies[0]?.activity).toBe("Jumping Jacks");
      expect(result.tallies[0]?.count).toBe(50);
    });

    it("extracts activities with high confidence for known patterns", () => {
      const result = extractTalliesRuleBased("25 burpees");
      expect(result.tallies[0]?.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("extracts unknown activities with lower confidence", () => {
      const result = extractTalliesRuleBased("15 cartwheels");
      expect(result.tallies).toHaveLength(1);
      expect(result.tallies[0]?.activity).toBe("Cartwheels");
      expect(result.tallies[0]?.confidence).toBeLessThan(0.9);
    });

    it("assigns correct categories and emojis", () => {
      const result = extractTalliesRuleBased("5 pages read");
      // The pattern should match "pages"
      const pagesTally = result.tallies.find((t) =>
        t.activity.toLowerCase().includes("page"),
      );
      expect(pagesTally?.category).toBe("learning");
      expect(pagesTally?.emoji).toBe("📖");
    });

    it("handles empty input", () => {
      const result = extractTalliesRuleBased("");
      expect(result.tallies).toHaveLength(0);
    });

    it("ignores text without counts", () => {
      const result = extractTalliesRuleBased(
        "I went for a nice walk today and felt great",
      );
      expect(result.tallies).toHaveLength(0);
    });

    it("filters out unreasonable counts", () => {
      const result = extractTalliesRuleBased("1000000 push-ups");
      expect(result.tallies).toHaveLength(0);
    });
  });

  describe("parseTallyExtractionResponse", () => {
    it("parses valid JSON response", () => {
      const response = JSON.stringify({
        tallies: [
          {
            activity: "Push-ups",
            count: 10,
            category: "movement",
            confidence: 0.95,
          },
        ],
      });
      const result = parseTallyExtractionResponse(response);
      expect(result.tallies).toHaveLength(1);
      expect(result.tallies[0]?.activity).toBe("Push-ups");
    });

    it("handles markdown code blocks", () => {
      const response =
        '```json\n{"tallies": [{"activity": "Squats", "count": 20}]}\n```';
      const result = parseTallyExtractionResponse(response);
      expect(result.tallies).toHaveLength(1);
      expect(result.tallies[0]?.activity).toBe("Squats");
    });

    it("filters invalid tallies", () => {
      const response = JSON.stringify({
        tallies: [
          { activity: "Valid", count: 10 },
          { activity: "", count: 5 }, // Invalid: empty activity
          { activity: "NoCount" }, // Invalid: no count
          { activity: "Negative", count: -5 }, // Invalid: negative count
        ],
      });
      const result = parseTallyExtractionResponse(response);
      expect(result.tallies).toHaveLength(1);
      expect(result.tallies[0]?.activity).toBe("Valid");
    });

    it("returns error for invalid JSON", () => {
      const result = parseTallyExtractionResponse("not valid json");
      expect(result.error).toBeDefined();
      expect(result.tallies).toHaveLength(0);
    });
  });
});
