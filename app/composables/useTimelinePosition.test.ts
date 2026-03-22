import { describe, it, expect } from "vitest";
import { useTimelinePosition } from "./useTimelinePosition";

// Day range: midnight to midnight
const dayStart = new Date("2026-03-22T00:00:00");
const dayEnd = new Date("2026-03-23T00:00:00");

describe("useTimelinePosition", () => {
  const { getPosition, getWidth, getClippedWidth, isDot, getColor, toTimelineEntry } =
    useTimelinePosition(dayStart, dayEnd);

  describe("getPosition", () => {
    it("returns ~50% for noon", () => {
      const pos = getPosition("2026-03-22T12:00:00");
      expect(pos).toBeCloseTo(50, 1);
    });

    it("returns ~25% for 6am", () => {
      const pos = getPosition("2026-03-22T06:00:00");
      expect(pos).toBeCloseTo(25, 1);
    });

    it("returns 0% for midnight start", () => {
      const pos = getPosition("2026-03-22T00:00:00");
      expect(pos).toBeCloseTo(0, 1);
    });

    it("returns ~75% for 6pm", () => {
      const pos = getPosition("2026-03-22T18:00:00");
      expect(pos).toBeCloseTo(75, 1);
    });

    it("clamps position at range end", () => {
      const pos = getPosition("2026-03-23T02:00:00");
      expect(pos).toBeCloseTo(100, 1);
    });

    it("clamps position at range start", () => {
      const pos = getPosition("2026-03-21T22:00:00");
      expect(pos).toBeCloseTo(0, 1);
    });
  });

  describe("getWidth", () => {
    it("returns correct width for 47 minutes", () => {
      const width = getWidth(47 * 60);
      const expected = ((47 * 60 * 1000) / (24 * 60 * 60 * 1000)) * 100;
      expect(width).toBeCloseTo(expected, 1);
    });

    it("enforces minimum 0.5% width", () => {
      const width = getWidth(60); // 1 minute
      expect(width).toBeGreaterThanOrEqual(0.5);
    });

    it("returns correct width for 1 hour", () => {
      const width = getWidth(3600);
      expect(width).toBeCloseTo(100 / 24, 1);
    });
  });

  describe("getClippedWidth — midnight clipping", () => {
    it("clips entry that spans past range end", () => {
      // 11:30pm + 60 min = 12:30am next day, should clip at midnight
      const width = getClippedWidth("2026-03-22T23:30:00", 3600);
      // Only 30 minutes should show
      const expected = ((30 * 60 * 1000) / (24 * 60 * 60 * 1000)) * 100;
      expect(width).toBeCloseTo(expected, 1);
    });

    it("returns full width for entry within range", () => {
      const width = getClippedWidth("2026-03-22T12:00:00", 3600);
      expect(width).toBeCloseTo(100 / 24, 1);
    });
  });

  describe("isDot", () => {
    it("returns true for ta-da type", () => {
      expect(isDot("tada")).toBe(true);
    });

    it("returns true for moment type", () => {
      expect(isDot("moment")).toBe(true);
    });

    it("returns true for tally type", () => {
      expect(isDot("tally")).toBe(true);
    });

    it("returns true for timed entry with duration < 5 min", () => {
      expect(isDot("timed", 240)).toBe(true);
    });

    it("returns false for timed entry with duration >= 5 min", () => {
      expect(isDot("timed", 300)).toBe(false);
    });

    it("returns false for exercise with duration >= 5 min", () => {
      expect(isDot("exercise", 600)).toBe(false);
    });

    it("returns true for timed entry with null duration", () => {
      expect(isDot("timed", null)).toBe(true);
    });

    it("returns true for 0-second duration", () => {
      expect(isDot("timed", 0)).toBe(true);
    });
  });

  describe("getColor", () => {
    it("returns mindfulness color", () => {
      expect(getColor("mindfulness")).toBe("#7C3AED");
    });

    it("returns movement color", () => {
      expect(getColor("movement")).toBe("#059669");
    });

    it("returns fallback for null category", () => {
      expect(getColor(null)).toBe("#6B7280");
    });

    it("returns fallback for unknown category", () => {
      expect(getColor("nonexistent")).toBe("#6B7280");
    });

    it("returns fallback for undefined category", () => {
      expect(getColor(undefined)).toBe("#6B7280");
    });
  });

  describe("toTimelineEntry", () => {
    it("creates a bar entry for timed type", () => {
      const result = toTimelineEntry({
        id: "1",
        type: "timed",
        timestamp: "2026-03-22T07:15:00",
        durationSeconds: 47 * 60,
        category: "mindfulness",
      });
      expect(result.isDot).toBe(false);
      expect(result.positionPercent).toBeCloseTo(30.2, 0);
      expect(result.widthPercent).toBeGreaterThan(0);
      expect(result.color).toBe("#7C3AED");
    });

    it("creates a dot entry for ta-da type", () => {
      const result = toTimelineEntry({
        id: "2",
        type: "tada",
        timestamp: "2026-03-22T15:20:00",
        category: "work",
      });
      expect(result.isDot).toBe(true);
      expect(result.widthPercent).toBe(0);
      expect(result.positionPercent).toBeCloseTo(63.9, 0);
    });

    it("creates a dot for short timed entry", () => {
      const result = toTimelineEntry({
        id: "3",
        type: "timed",
        timestamp: "2026-03-22T10:00:00",
        durationSeconds: 120,
        category: "creative",
      });
      expect(result.isDot).toBe(true);
      expect(result.widthPercent).toBe(0);
    });
  });
});
