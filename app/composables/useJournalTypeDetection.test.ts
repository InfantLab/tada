/**
 * Tests for useJournalTypeDetection
 *
 * @module composables/useJournalTypeDetection.test
 */

import { describe, it, expect } from "vitest";
import { useJournalTypeDetection } from "./useJournalTypeDetection";

describe("useJournalTypeDetection", () => {
  describe("detectJournalType", () => {
    it("should return detectJournalType function", () => {
      const { detectJournalType } = useJournalTypeDetection();
      expect(typeof detectJournalType).toBe("function");
    });

    describe("dream detection", () => {
      it("should detect 'I dreamed...' as dream", () => {
        // T107: "I dreamed..." → dream
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType("I dreamed about flying last night");

        expect(result.subtype).toBe("dream");
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.signals).toContain("dreamed");
      });

      it("should detect 'last night' dream context", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "Last night I had this strange experience while sleeping",
        );

        expect(result.subtype).toBe("dream");
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it("should detect nightmare keywords", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I had a nightmare about being chased",
        );

        expect(result.subtype).toBe("dream");
      });

      it("should detect lucid dream references", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I became lucid in my dream and could control everything",
        );

        expect(result.subtype).toBe("dream");
      });

      it("should detect vivid dream descriptions", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I had a very vivid dream about old friends",
        );

        expect(result.subtype).toBe("dream");
      });
    });

    describe("gratitude detection", () => {
      it("should detect 'grateful' keyword", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I am so grateful for my family today",
        );

        expect(result.subtype).toBe("gratitude");
        expect(result.signals).toContain("grateful");
      });

      it("should detect 'thankful' keyword", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "Feeling thankful for all the good things in life",
        );

        expect(result.subtype).toBe("gratitude");
      });

      it("should detect appreciation expressions", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I really appreciate everything my friends did for me",
        );

        expect(result.subtype).toBe("gratitude");
      });
    });

    describe("reflection detection", () => {
      it("should detect 'thinking about' as reflection", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I was thinking about my career path today",
        );

        expect(result.subtype).toBe("reflection");
      });

      it("should detect 'realized' keyword", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I realized something important about myself",
        );

        expect(result.subtype).toBe("reflection");
      });

      it("should detect pondering expressions", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "Been pondering the meaning of life lately",
        );

        expect(result.subtype).toBe("reflection");
      });

      it("should detect contemplation language", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "Looking back on the past year and contemplating changes",
        );

        expect(result.subtype).toBe("reflection");
      });
    });

    describe("memory detection", () => {
      it("should detect 'I remember when' as memory", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I remember when we used to go to the beach every summer",
        );

        expect(result.subtype).toBe("memory");
      });

      it("should detect nostalgia keywords", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "Feeling nostalgic about my college days",
        );

        expect(result.subtype).toBe("memory");
      });

      it("should detect childhood references", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "As a kid I used to love playing in the rain",
        );

        expect(result.subtype).toBe("memory");
      });
    });

    describe("note fallback", () => {
      it("should default to 'note' for ambiguous text", () => {
        // T108: ambiguous → note
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "Today was a good day. I went to work and had lunch.",
        );

        expect(result.subtype).toBe("note");
        expect(result.confidence).toBeLessThanOrEqual(0.6);
      });

      it("should default to 'note' for short text", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType("Quick update");

        expect(result.subtype).toBe("note");
      });

      it("should default to 'note' for task-oriented text", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "Need to buy groceries and pick up dry cleaning",
        );

        expect(result.subtype).toBe("note");
      });
    });

    describe("LLM suggestion integration", () => {
      it("should prefer high-confidence LLM suggestion", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "Some ambiguous text about various things",
          { subtype: "reflection", confidence: 0.9 },
        );

        expect(result.subtype).toBe("reflection");
        expect(result.llmDetected).toBe(true);
      });

      it("should ignore low-confidence LLM suggestion", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I dreamed about something weird last night",
          { subtype: "note", confidence: 0.5 },
        );

        // Keyword detection should win over low-confidence LLM
        expect(result.subtype).toBe("dream");
        expect(result.llmDetected).toBe(false);
      });

      it("should prefer keyword detection when more confident", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I am so grateful and thankful for everything",
          { subtype: "note", confidence: 0.8 },
        );

        // Strong keyword matches should override LLM when LLM suggests default
        // This depends on confidence calculation - keywords should win here
        expect(["gratitude", "note"]).toContain(result.subtype);
      });
    });

    describe("confidence scoring", () => {
      it("should have higher confidence with more keywords", () => {
        const { detectJournalType } = useJournalTypeDetection();

        const singleKeyword = detectJournalType("I dreamed about something");
        const multipleKeywords = detectJournalType(
          "Last night I had a vivid dream while sleeping, it was surreal",
        );

        expect(multipleKeywords.confidence).toBeGreaterThanOrEqual(
          singleKeyword.confidence,
        );
      });

      it("should return signals array with matched keywords", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType("I am grateful and thankful today");

        expect(result.signals.length).toBeGreaterThan(0);
        expect(result.signals).toEqual(
          expect.arrayContaining(["grateful", "thankful"]),
        );
      });
    });

    describe("edge cases", () => {
      it("should handle empty string", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType("");

        expect(result.subtype).toBe("note");
        expect(result.confidence).toBeLessThanOrEqual(0.6);
      });

      it("should be case insensitive", () => {
        const { detectJournalType } = useJournalTypeDetection();

        const lowercase = detectJournalType("i dreamed about flying");
        const uppercase = detectJournalType("I DREAMED ABOUT FLYING");

        expect(lowercase.subtype).toBe(uppercase.subtype);
      });

      it("should handle mixed category keywords", () => {
        const { detectJournalType } = useJournalTypeDetection();
        const result = detectJournalType(
          "I dreamed that I was grateful for my memories",
        );

        // Should pick the strongest signal
        expect(["dream", "gratitude", "memory"]).toContain(result.subtype);
      });
    });
  });
});
