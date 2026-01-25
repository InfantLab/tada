/**
 * Tests for conflictDetector
 */

import { describe, it, expect } from "vitest";
import {
  formatOverlap,
  type OverlappingEntry,
} from "~/server/services/conflictDetector";
import type { OverlapType } from "~/utils/entrySchemas";

describe("conflictDetector", () => {
  describe("formatOverlap", () => {
    function makeOverlap(
      name: string,
      overlapType: OverlapType,
      durationSeconds = 1800,
    ): OverlappingEntry {
      return {
        id: Math.random().toString(36).substring(7),
        name,
        timestamp: "2026-01-25T09:00:00.000Z",
        durationSeconds,
        overlapType,
      };
    }

    it("should format 'contains' overlap", () => {
      const overlap = makeOverlap("meditation", "contains");

      const result = formatOverlap(overlap);

      expect(result).toContain("meditation");
      expect(result.toLowerCase()).toContain("covers");
    });

    it("should format 'contained' overlap", () => {
      const overlap = makeOverlap("meditation", "contained");

      const result = formatOverlap(overlap);

      expect(result).toContain("meditation");
      expect(result.toLowerCase()).toContain("within");
    });

    it("should format 'partial-start' overlap", () => {
      const overlap = makeOverlap("meditation", "partial-start");

      const result = formatOverlap(overlap);

      expect(result).toContain("meditation");
      expect(result.toLowerCase()).toContain("overlaps");
    });

    it("should format 'partial-end' overlap", () => {
      const overlap = makeOverlap("meditation", "partial-end");

      const result = formatOverlap(overlap);

      expect(result).toContain("meditation");
      expect(result.toLowerCase()).toContain("overlaps");
    });
  });
});
