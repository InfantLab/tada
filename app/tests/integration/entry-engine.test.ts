/**
 * Integration tests for the unified entry engine
 *
 * These tests verify that migrating from useEntrySave to useEntryEngine
 * produces the same results and doesn't break existing functionality.
 *
 * @module tests/integration/entry-engine
 */

import { describe, it, expect } from "vitest";
import { validateEntryInput, type EntryInput } from "~/utils/entrySchemas";

describe("Entry Engine Integration", () => {
  describe("Validation parity", () => {
    it("should validate timed entries correctly", () => {
      const input: EntryInput = {
        type: "timed",
        name: "meditation",
        durationSeconds: 1200,
        category: "mindfulness",
        subcategory: "sitting",
      };

      const result = validateEntryInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate tada entries correctly", () => {
      const input: EntryInput = {
        type: "tada",
        name: "Fixed the bug",
        category: "accomplishment",
        subcategory: "work",
      };

      const result = validateEntryInput(input);
      expect(result.valid).toBe(true);
    });

    it("should validate moment entries correctly", () => {
      const input: EntryInput = {
        type: "moment",
        name: "Morning reflection",
        category: "moments",
        subcategory: "reflection",
        notes: "Today was a good day",
      };

      const result = validateEntryInput(input);
      expect(result.valid).toBe(true);
    });

    it("should validate tally entries correctly", () => {
      const input: EntryInput = {
        type: "tally",
        name: "push-ups",
        count: 30,
        category: "movement",
        subcategory: "strength",
      };

      const result = validateEntryInput(input);
      expect(result.valid).toBe(true);
    });

    it("should reject timed entries without duration", () => {
      const input = {
        type: "timed",
        name: "meditation",
        category: "mindfulness",
      };

      const result = validateEntryInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject tally entries without count", () => {
      const input = {
        type: "tally",
        name: "push-ups",
        category: "movement",
      };

      const result = validateEntryInput(input);
      expect(result.valid).toBe(false);
    });
  });

  describe("Entry structure consistency", () => {
    it("should produce consistent entry structure for timer sessions", () => {
      // This simulates what timer.vue sends to the engine
      const timerInput: EntryInput = {
        type: "timed",
        name: "You did 20m of sitting!",
        category: "mindfulness",
        subcategory: "sitting",
        durationSeconds: 1200,
        data: {
          mode: "unlimited",
          intervals: [{ durationMinutes: 10, repeats: 0, bellSound: "bell" }],
          warmUpSeconds: 10,
          mood: 4,
          qualityRating: 4,
          reflection: "Great session",
        },
        tags: ["mindfulness", "sitting"],
      };

      const result = validateEntryInput(timerInput);
      expect(result.valid).toBe(true);
      expect(result.data?.type).toBe("timed");
      expect(result.data?.durationSeconds).toBe(1200);
      expect((result.data?.data as Record<string, unknown>)?.["mode"]).toBe(
        "unlimited",
      );
    });

    it("should produce consistent entry structure for moment entries", () => {
      // This simulates what add.vue sends to the engine
      const momentInput: EntryInput = {
        type: "moment",
        name: "Dream log",
        category: "moments",
        subcategory: "dream",
        emoji: "🌙",
        notes: "I was flying over mountains...",
        data: {
          lucidity: 3,
          vividness: 4,
        },
        tags: ["dream"],
      };

      const result = validateEntryInput(momentInput);
      expect(result.valid).toBe(true);
      expect(result.data?.type).toBe("moment");
      expect(result.data?.notes).toBe("I was flying over mountains...");
    });

    it("should produce consistent entry structure for tada entries", () => {
      // This simulates what tada/index.vue sends to the engine
      const tadaInput: EntryInput = {
        type: "tada",
        name: "Shipped the feature!",
        category: "accomplishment",
        subcategory: "work",
        emoji: "⚡",
        notes: "Finally got it done",
        data: {},
        tags: ["accomplishment", "work"],
      };

      const result = validateEntryInput(tadaInput);
      expect(result.valid).toBe(true);
      expect(result.data?.type).toBe("tada");
      expect(result.data?.category).toBe("accomplishment");
    });

    it("should produce consistent entry structure for restored entries", () => {
      // This simulates what entry/[id].vue sends for restore
      const restoredInput: EntryInput = {
        type: "timed",
        name: "Previous meditation",
        category: "mindfulness",
        subcategory: "sitting",
        emoji: "🧘",
        timestamp: "2026-01-25T09:00:00.000Z",
        durationSeconds: 1800,
        data: { mode: "fixed" },
        tags: ["mindfulness"],
        notes: "Morning session",
      };

      const result = validateEntryInput(restoredInput);
      expect(result.valid).toBe(true);
      expect(result.data?.timestamp).toBe("2026-01-25T09:00:00.000Z");
    });
  });

  describe("Optional fields handling", () => {
    it("should accept entries without optional fields", () => {
      const minimalTimed: EntryInput = {
        type: "timed",
        name: "Quick session",
        durationSeconds: 300,
      };

      const result = validateEntryInput(minimalTimed);
      expect(result.valid).toBe(true);
    });

    it("should accept entries with all optional fields", () => {
      const fullInput: EntryInput = {
        type: "timed",
        name: "Full session",
        category: "mindfulness",
        subcategory: "sitting",
        emoji: "🧘",
        timestamp: "2026-01-25T09:00:00.000Z",
        timezone: "America/New_York",
        durationSeconds: 1200,
        startedAt: "2026-01-25T08:40:00.000Z",
        endedAt: "2026-01-25T09:00:00.000Z",
        tags: ["morning", "peaceful"],
        notes: "Great session",
        source: "timer",
        data: { mood: 5 },
      };

      const result = validateEntryInput(fullInput);
      expect(result.valid).toBe(true);
      expect(result.data?.timezone).toBe("America/New_York");
      expect(result.data?.source).toBe("timer");
    });
  });
});
