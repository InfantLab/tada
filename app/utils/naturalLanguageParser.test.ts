/**
 * Tests for naturalLanguageParser
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseNaturalLanguage } from "./naturalLanguageParser";

describe("naturalLanguageParser", () => {
  beforeEach(() => {
    // Mock date to 2026-01-25 10:00:00 for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("parseNaturalLanguage", () => {
    it("should parse simple timed entry", () => {
      const result = parseNaturalLanguage("meditation for 20 minutes");

      expect(result.input.name).toBe("meditation");
      expect(result.input.durationSeconds).toBe(1200);
      expect(result.input.type).toBe("timed");
    });

    it("should parse duration with shorthand", () => {
      const result = parseNaturalLanguage("yoga 30m session");

      expect(result.input.durationSeconds).toBe(1800);
      expect(result.input.type).toBe("timed");
    });

    it("should parse tally entry with count first", () => {
      const result = parseNaturalLanguage("30 push-ups");

      expect(result.input.name).toBe("push-ups");
      expect(result.input.count).toBe(30);
      expect(result.input.type).toBe("tally");
    });

    it("should parse tally entry with multiplier format", () => {
      const result = parseNaturalLanguage("burpees x 20");

      expect(result.input.name).toBe("burpees");
      expect(result.input.count).toBe(20);
      expect(result.input.type).toBe("tally");
    });

    it("should extract category from meditation keyword", () => {
      const result = parseNaturalLanguage("meditation 20m");

      expect(result.input.category).toBe("mindfulness");
      expect(result.extracted.category).toBe(true);
    });

    it("should extract time reference 'this morning'", () => {
      const result = parseNaturalLanguage("this morning meditation 20m");

      expect(result.input.timestamp).toBeDefined();
      expect(result.extracted.timestamp).toBe(true);
    });

    it("should extract time reference 'yesterday'", () => {
      const result = parseNaturalLanguage("yesterday yoga 1h");

      expect(result.input.timestamp).toBeDefined();
      expect(result.extracted.timestamp).toBe(true);
    });

    it("should handle empty string", () => {
      const result = parseNaturalLanguage("");

      expect(result.input.name).toBeUndefined();
      expect(result.confidence).toBe(0);
    });

    it("should set confidence based on extractions", () => {
      const result = parseNaturalLanguage("meditation 20m");

      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should track extraction status", () => {
      const result = parseNaturalLanguage("meditation 20m");

      expect(result.extracted.duration).toBe(true);
      expect(result.extracted.type).toBe(true);
      expect(result.extracted.name).toBe(true);
    });

    it("should preserve original text", () => {
      const input = "30 burpees this morning";
      const result = parseNaturalLanguage(input);

      expect(result.originalText).toBe(input);
    });

    it("should use pattern method", () => {
      const result = parseNaturalLanguage("meditation 20m");

      expect(result.method).toBe("pattern");
    });
  });
});
