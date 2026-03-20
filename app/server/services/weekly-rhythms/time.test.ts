/**
 * Tests for time window helpers and token utilities.
 */

import { describe, it, expect } from "vitest";
import {
  getWeekBoundaries,
  getThursdayWindow,
  getNextScheduledUtc,
  formatWeekLabel,
  formatLocalDate,
} from "~/server/services/weekly-rhythms/time";

describe("weekly-rhythms/time", () => {
  describe("getWeekBoundaries", () => {
    it("returns Monday–Sunday for a mid-week date in UTC", () => {
      // Wednesday 2026-03-18 in UTC
      const date = new Date("2026-03-18T12:00:00Z");
      const result = getWeekBoundaries(date, "UTC");

      expect(result.weekStartDate).toBe("2026-03-16");
      expect(result.weekEndDate).toBe("2026-03-22");
    });

    it("returns correct boundaries for a Monday", () => {
      const date = new Date("2026-03-16T00:00:00Z");
      const result = getWeekBoundaries(date, "UTC");

      expect(result.weekStartDate).toBe("2026-03-16");
      expect(result.weekEndDate).toBe("2026-03-22");
    });

    it("returns correct boundaries for a Sunday", () => {
      const date = new Date("2026-03-22T23:00:00Z");
      const result = getWeekBoundaries(date, "UTC");

      expect(result.weekStartDate).toBe("2026-03-16");
      expect(result.weekEndDate).toBe("2026-03-22");
    });

    it("handles timezone offsets (Europe/London BST)", () => {
      // 2026-03-30 is after BST starts (clocks forward on 2026-03-29)
      const date = new Date("2026-03-30T12:00:00Z");
      const result = getWeekBoundaries(date, "Europe/London");

      expect(result.weekStartDate).toBe("2026-03-30");
      expect(result.weekEndDate).toBe("2026-04-05");
    });

    it("handles negative UTC offset (America/New_York)", () => {
      // Wednesday 2026-03-18 at 03:00 UTC = Tuesday 2026-03-17 at 23:00 ET
      const date = new Date("2026-03-18T03:00:00Z");
      const result = getWeekBoundaries(date, "America/New_York");

      // In ET this is still Tuesday, so the week starts Mon 2026-03-16
      expect(result.weekStartDate).toBe("2026-03-16");
    });

    it("handles positive UTC offset (Asia/Tokyo)", () => {
      // Monday 2026-03-16 00:00 UTC = Monday 09:00 JST
      const date = new Date("2026-03-16T00:00:00Z");
      const result = getWeekBoundaries(date, "Asia/Tokyo");

      expect(result.weekStartDate).toBe("2026-03-16");
    });

    it("includes UTC ISO strings in the result", () => {
      const date = new Date("2026-03-18T12:00:00Z");
      const result = getWeekBoundaries(date, "UTC");

      expect(result.utcStart).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.utcEnd).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("getThursdayWindow", () => {
    it("returns Monday–Thursday window for default time", () => {
      const date = new Date("2026-03-18T12:00:00Z"); // Wednesday UTC
      const result = getThursdayWindow(date, "UTC");

      expect(result.weekStartDate).toBe("2026-03-16");
      expect(result.localEnd).toContain("2026-03-19T15:03:00");
    });

    it("respects custom encouragement time", () => {
      const date = new Date("2026-03-18T12:00:00Z");
      const result = getThursdayWindow(date, "UTC", "14:00");

      expect(result.localEnd).toContain("2026-03-19T14:00:00");
    });
  });

  describe("getNextScheduledUtc", () => {
    it("returns correct UTC for Monday 03:33 in UTC", () => {
      const now = new Date("2026-03-18T12:00:00Z"); // Wednesday
      const result = getNextScheduledUtc(now, "UTC", 0, "03:33");

      // Monday of this week = 2026-03-16
      expect(result.toISOString()).toBe("2026-03-16T03:33:00.000Z");
    });

    it("returns correct UTC for Thursday 15:03 in UTC", () => {
      const now = new Date("2026-03-18T12:00:00Z");
      const result = getNextScheduledUtc(now, "UTC", 3, "15:03");

      expect(result.toISOString()).toBe("2026-03-19T15:03:00.000Z");
    });
  });

  describe("formatWeekLabel", () => {
    it("formats same-month range", () => {
      expect(formatWeekLabel("2026-03-16", "2026-03-22")).toBe(
        "Mar 16 – 22, 2026",
      );
    });

    it("formats cross-month range", () => {
      expect(formatWeekLabel("2026-03-30", "2026-04-05")).toBe(
        "Mar 30 – Apr 5, 2026",
      );
    });

    it("formats cross-year range", () => {
      expect(formatWeekLabel("2025-12-29", "2026-01-04")).toBe(
        "Dec 29, 2025 – Jan 4, 2026",
      );
    });
  });

  describe("formatLocalDate", () => {
    it("formats a UTC date to local YYYY-MM-DD", () => {
      const date = new Date("2026-03-18T12:00:00Z");
      expect(formatLocalDate(date, "UTC")).toBe("2026-03-18");
    });

    it("adjusts for timezone offset", () => {
      // 2026-03-19 01:00 UTC = 2026-03-18 20:00 in New York (EDT)
      const date = new Date("2026-03-19T01:00:00Z");
      expect(formatLocalDate(date, "America/New_York")).toBe("2026-03-18");
    });
  });
});
