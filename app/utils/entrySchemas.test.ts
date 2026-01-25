/**
 * Tests for entrySchemas
 */

import { describe, it, expect } from "vitest";
import {
  validateEntryInput,
  EntryInputSchema,
  requiresDuration,
  requiresCount,
  type EntryInput,
} from "./entrySchemas";

describe("entrySchemas", () => {
  describe("EntryInputSchema", () => {
    it("should validate a valid timed entry", () => {
      const input: EntryInput = {
        type: "timed",
        name: "meditation",
        durationSeconds: 1200,
        category: "mindfulness",
      };

      const result = EntryInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate a valid reps entry", () => {
      const input: EntryInput = {
        type: "reps",
        name: "push-ups",
        count: 30,
        category: "movement",
      };

      const result = EntryInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate a valid journal entry", () => {
      const input: EntryInput = {
        type: "journal",
        name: "dream",
        content: "I was flying over mountains...",
        mood: 4,
      };

      const result = EntryInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate a valid tada entry", () => {
      const input: EntryInput = {
        type: "tada",
        name: "Fixed the bug",
        significance: "major",
      };

      const result = EntryInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject timed entry without duration", () => {
      const input = {
        type: "timed",
        name: "meditation",
        // Missing durationSeconds
      };

      const result = EntryInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject reps entry without count", () => {
      const input = {
        type: "reps",
        name: "push-ups",
        // Missing count
      };

      const result = EntryInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const input = {
        type: "journal",
        name: "",
      };

      const result = EntryInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid entry type", () => {
      const input = {
        type: "invalid",
        name: "test",
      };

      const result = EntryInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should validate mood in range 1-5", () => {
      const validInput = {
        type: "journal",
        name: "note",
        mood: 3,
      };
      expect(EntryInputSchema.safeParse(validInput).success).toBe(true);

      const invalidLow = {
        type: "journal",
        name: "note",
        mood: 0,
      };
      expect(EntryInputSchema.safeParse(invalidLow).success).toBe(false);

      const invalidHigh = {
        type: "journal",
        name: "note",
        mood: 6,
      };
      expect(EntryInputSchema.safeParse(invalidHigh).success).toBe(false);
    });

    it("should accept valid timestamp", () => {
      const input: EntryInput = {
        type: "journal",
        name: "note",
        timestamp: "2026-01-25T09:00:00.000Z",
      };

      const result = EntryInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept optional fields", () => {
      const input: EntryInput = {
        type: "timed",
        name: "meditation",
        durationSeconds: 1200,
        category: "mindfulness",
        subcategory: "sitting",
        emoji: "🧘",
        tags: ["morning", "peaceful"],
        notes: "Great session",
        source: "timer",
        timezone: "America/New_York",
      };

      const result = EntryInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["morning", "peaceful"]);
        expect(result.data.notes).toBe("Great session");
      }
    });
  });

  describe("validateEntryInput", () => {
    it("should return valid=true for valid input", () => {
      const input = {
        type: "timed",
        name: "yoga",
        durationSeconds: 3600,
      };

      const result = validateEntryInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toBeDefined();
    });

    it("should return errors for invalid input", () => {
      const input = {
        type: "timed",
        name: "", // Empty name
      };

      const result = validateEntryInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("requiresDuration", () => {
    it("should return true for timed type", () => {
      expect(requiresDuration("timed")).toBe(true);
    });

    it("should return false for other types", () => {
      expect(requiresDuration("reps")).toBe(false);
      expect(requiresDuration("journal")).toBe(false);
      expect(requiresDuration("tada")).toBe(false);
    });
  });

  describe("requiresCount", () => {
    it("should return true for reps type", () => {
      expect(requiresCount("reps")).toBe(true);
    });

    it("should return false for other types", () => {
      expect(requiresCount("timed")).toBe(false);
      expect(requiresCount("journal")).toBe(false);
      expect(requiresCount("tada")).toBe(false);
    });
  });
});
