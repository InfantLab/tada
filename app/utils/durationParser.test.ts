/**
 * Tests for durationParser
 */

import { describe, it, expect } from "vitest";
import {
  parseDuration,
  formatDuration,
  formatDurationShort,
  getDurationPresets,
  getQuickPickValues,
} from "./durationParser";

describe("durationParser", () => {
  describe("parseDuration", () => {
    it("should parse bare number as minutes", () => {
      const result = parseDuration("20");
      expect(result).not.toBeNull();
      expect(result?.seconds).toBe(1200); // 20 * 60
      expect(result?.confidence).toBe(0.9);
    });

    it("should parse minutes with 'm' suffix", () => {
      expect(parseDuration("20m")?.seconds).toBe(1200);
      expect(parseDuration("20min")?.seconds).toBe(1200);
      expect(parseDuration("20 min")?.seconds).toBe(1200);
      expect(parseDuration("20 minutes")?.seconds).toBe(1200);
    });

    it("should parse hours", () => {
      expect(parseDuration("1h")?.seconds).toBe(3600);
      expect(parseDuration("1hr")?.seconds).toBe(3600);
      expect(parseDuration("1 hour")?.seconds).toBe(3600);
      expect(parseDuration("2 hours")?.seconds).toBe(7200);
    });

    it("should parse seconds", () => {
      expect(parseDuration("45s")?.seconds).toBe(45);
      expect(parseDuration("45 sec")?.seconds).toBe(45);
      expect(parseDuration("45 seconds")?.seconds).toBe(45);
    });

    it("should parse combined hours and minutes", () => {
      expect(parseDuration("1h 30m")?.seconds).toBe(5400);
      expect(parseDuration("1h30m")?.seconds).toBe(5400);
      expect(parseDuration("2h 15m")?.seconds).toBe(8100);
    });

    it("should parse H:MM format", () => {
      expect(parseDuration("1:30")?.seconds).toBe(5400);
      expect(parseDuration("2:00")?.seconds).toBe(7200);
      expect(parseDuration("0:45")?.seconds).toBe(2700);
    });

    it("should parse HH:MM:SS format", () => {
      expect(parseDuration("1:30:00")?.seconds).toBe(5400);
      expect(parseDuration("0:20:30")?.seconds).toBe(1230);
      expect(parseDuration("2:15:45")?.seconds).toBe(8145);
    });

    it("should return null for empty string", () => {
      expect(parseDuration("")).toBeNull();
      expect(parseDuration("   ")).toBeNull();
    });

    it("should return null for invalid input", () => {
      expect(parseDuration("abc")).toBeNull();
      expect(parseDuration("not a duration")).toBeNull();
    });

    it("should include display format", () => {
      const result = parseDuration("90m");
      expect(result?.display).toBe("1h 30m");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds only", () => {
      expect(formatDuration(45)).toBe("45s");
    });

    it("should format minutes only", () => {
      expect(formatDuration(1200)).toBe("20m");
    });

    it("should format hours only", () => {
      expect(formatDuration(3600)).toBe("1h");
    });

    it("should format hours and minutes", () => {
      expect(formatDuration(5400)).toBe("1h 30m");
    });

    it("should format hours, minutes, and seconds (omit seconds)", () => {
      // Seconds are only shown if < 1 hour
      expect(formatDuration(5445)).toBe("1h 30m");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(75)).toBe("1m 15s");
    });

    it("should handle zero", () => {
      expect(formatDuration(0)).toBe("0s");
    });

    it("should handle negative", () => {
      expect(formatDuration(-100)).toBe("0s");
    });
  });

  describe("formatDurationShort", () => {
    it("should format as total minutes for non-exact hours", () => {
      expect(formatDurationShort(5400)).toBe("90m");
    });

    it("should format as hours for exact hours", () => {
      expect(formatDurationShort(3600)).toBe("1h");
      expect(formatDurationShort(7200)).toBe("2h");
    });

    it("should handle zero", () => {
      expect(formatDurationShort(0)).toBe("0");
    });
  });

  describe("getDurationPresets", () => {
    it("should return meditation presets", () => {
      const presets = getDurationPresets("meditation");
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.value === 1200)).toBe(true); // 20m
    });

    it("should return exercise presets", () => {
      const presets = getDurationPresets("exercise");
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.value === 5400)).toBe(true); // 90m
    });

    it("should return work presets with Pomodoro", () => {
      const presets = getDurationPresets("work");
      expect(presets.some((p) => p.value === 1500)).toBe(true); // 25m Pomodoro
    });

    it("should default to general presets", () => {
      const presets = getDurationPresets("general");
      expect(presets.length).toBeGreaterThan(0);
    });
  });

  describe("getQuickPickValues", () => {
    it("should return array of seconds", () => {
      const values = getQuickPickValues("meditation");
      expect(Array.isArray(values)).toBe(true);
      expect(values.every((v) => typeof v === "number")).toBe(true);
    });
  });
});
