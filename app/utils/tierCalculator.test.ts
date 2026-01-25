import { describe, it, expect } from "vitest";
import {
  getTierForDaysCompleted,
  getTierInfo,
  getTierLabel,
  getBestPossibleTier,
  getWeekStart,
  getWeekEnd,
  formatDate,
  getDaysRemainingInWeek,
  calculateWeeklyProgress,
  generateNudgeMessage,
  TIERS,
  TIER_ORDER,
  type DayStatus,
  type WeeklyProgress,
} from "./tierCalculator";

describe("tierCalculator", () => {
  describe("getTierForDaysCompleted", () => {
    it("returns 'daily' for 7 days", () => {
      expect(getTierForDaysCompleted(7)).toBe("daily");
    });

    it("returns 'most_days' for 5-6 days", () => {
      expect(getTierForDaysCompleted(5)).toBe("most_days");
      expect(getTierForDaysCompleted(6)).toBe("most_days");
    });

    it("returns 'few_times' for 3-4 days", () => {
      expect(getTierForDaysCompleted(3)).toBe("few_times");
      expect(getTierForDaysCompleted(4)).toBe("few_times");
    });

    it("returns 'weekly' for 1-2 days", () => {
      expect(getTierForDaysCompleted(1)).toBe("weekly");
      expect(getTierForDaysCompleted(2)).toBe("weekly");
    });

    it("returns 'starting' for 0 days", () => {
      expect(getTierForDaysCompleted(0)).toBe("starting");
    });

    it("handles values above 7", () => {
      expect(getTierForDaysCompleted(10)).toBe("daily");
    });
  });

  describe("getTierInfo", () => {
    it("returns correct info for each tier", () => {
      expect(getTierInfo("daily")).toEqual({
        name: "daily",
        label: "Every Day",
        shortLabel: "Daily",
        description: "7 days per week",
        minDays: 7,
        maxDays: 7,
      });
      expect(getTierInfo("most_days")).toEqual({
        name: "most_days",
        label: "Most Days",
        shortLabel: "5-6×",
        description: "5-6 days per week",
        minDays: 5,
        maxDays: 6,
      });
      expect(getTierInfo("few_times")).toEqual({
        name: "few_times",
        label: "Several Times",
        shortLabel: "3-4×",
        description: "3-4 days per week",
        minDays: 3,
        maxDays: 4,
      });
    });
  });

  describe("getTierLabel", () => {
    it("returns human-readable labels", () => {
      expect(getTierLabel("daily")).toBe("Every Day");
      expect(getTierLabel("most_days")).toBe("Most Days");
      expect(getTierLabel("few_times")).toBe("Several Times");
      expect(getTierLabel("weekly")).toBe("At Least Once");
      expect(getTierLabel("starting")).toBe("Starting");
    });
  });

  describe("getBestPossibleTier", () => {
    it("calculates best tier when all days remain", () => {
      expect(getBestPossibleTier(0, 7)).toBe("daily");
    });

    it("calculates best tier with partial progress", () => {
      expect(getBestPossibleTier(2, 3)).toBe("most_days"); // 2+3=5
      expect(getBestPossibleTier(2, 2)).toBe("few_times"); // 2+2=4
      expect(getBestPossibleTier(1, 1)).toBe("weekly"); // 1+1=2
    });

    it("shows current tier when no days remain", () => {
      expect(getBestPossibleTier(4, 0)).toBe("few_times");
      expect(getBestPossibleTier(0, 0)).toBe("starting");
    });
  });

  describe("getWeekStart", () => {
    it("returns Monday for any day in the week", () => {
      // Test a Wednesday (Jan 15, 2026)
      const wed = new Date(2026, 0, 15);
      const monday = getWeekStart(wed);
      expect(monday.getDay()).toBe(1); // Monday
      expect(formatDate(monday)).toBe("2026-01-12");
    });

    it("returns same Monday when given a Monday", () => {
      const monday = new Date(2026, 0, 12);
      const result = getWeekStart(monday);
      expect(formatDate(result)).toBe("2026-01-12");
    });

    it("handles Sunday correctly (goes back to previous Monday)", () => {
      const sunday = new Date(2026, 0, 18);
      const monday = getWeekStart(sunday);
      expect(formatDate(monday)).toBe("2026-01-12");
    });
  });

  describe("getWeekEnd", () => {
    it("returns Sunday for any day in the week", () => {
      const wed = new Date(2026, 0, 15);
      const sunday = getWeekEnd(wed);
      expect(sunday.getDay()).toBe(0); // Sunday
      expect(formatDate(sunday)).toBe("2026-01-18");
    });
  });

  describe("formatDate", () => {
    it("formats date as YYYY-MM-DD", () => {
      expect(formatDate(new Date(2026, 0, 15))).toBe("2026-01-15");
      expect(formatDate(new Date(2026, 11, 31))).toBe("2026-12-31");
    });
  });

  describe("getDaysRemainingInWeek", () => {
    it("returns 0 on Sunday when complete", () => {
      const sunday = new Date(2026, 0, 18);
      sunday.setHours(0, 0, 0, 0);
      // Mock Sunday by checking day of week = 0
      expect(getDaysRemainingInWeek(sunday, true)).toBe(0);
    });

    it("returns 1 on Sunday when not complete", () => {
      const sunday = new Date(2026, 0, 18);
      expect(getDaysRemainingInWeek(sunday, false)).toBe(1);
    });

    it("returns 6 on Monday when complete", () => {
      const monday = new Date(2026, 0, 12);
      expect(getDaysRemainingInWeek(monday, true)).toBe(6);
    });

    it("returns 7 on Monday when not complete", () => {
      const monday = new Date(2026, 0, 12);
      expect(getDaysRemainingInWeek(monday, false)).toBe(7);
    });
  });

  describe("calculateWeeklyProgress", () => {
    it("calculates progress with completed days", () => {
      const weekStart = new Date(2026, 0, 12); // Monday
      const dayStatuses: DayStatus[] = [
        {
          date: "2026-01-12",
          totalSeconds: 600,
          isComplete: true,
          entryCount: 1,
          totalCount: 0,
        },
        {
          date: "2026-01-13",
          totalSeconds: 0,
          isComplete: false,
          entryCount: 0,
          totalCount: 0,
        },
        {
          date: "2026-01-14",
          totalSeconds: 720,
          isComplete: true,
          entryCount: 2,
          totalCount: 0,
        },
        {
          date: "2026-01-15",
          totalSeconds: 360,
          isComplete: true,
          entryCount: 1,
          totalCount: 0,
        },
      ];

      const progress = calculateWeeklyProgress(dayStatuses, weekStart);

      expect(progress.startDate).toBe("2026-01-12");
      expect(progress.endDate).toBe("2026-01-18");
      expect(progress.daysCompleted).toBe(3);
      expect(progress.achievedTier).toBe("few_times");
    });

    it("returns starting tier for empty week", () => {
      const weekStart = new Date(2026, 0, 12);
      const progress = calculateWeeklyProgress([], weekStart);

      expect(progress.daysCompleted).toBe(0);
      expect(progress.achievedTier).toBe("starting");
    });
  });

  describe("generateNudgeMessage", () => {
    it("returns null when target tier is already achieved", () => {
      const progress: WeeklyProgress = {
        startDate: "2026-01-12",
        endDate: "2026-01-18",
        daysCompleted: 5,
        achievedTier: "most_days",
        bestPossibleTier: "daily",
        daysRemaining: 2,
      };

      expect(generateNudgeMessage(progress, "most_days")).toBeNull();
    });

    it("returns nudge for achievable tier", () => {
      const progress: WeeklyProgress = {
        startDate: "2026-01-12",
        endDate: "2026-01-18",
        daysCompleted: 4,
        achievedTier: "few_times",
        bestPossibleTier: "daily",
        daysRemaining: 3,
      };

      expect(generateNudgeMessage(progress, "daily")).toBe(
        "3 more times to hit 'Every Day'",
      );
    });

    it("suggests best achievable when target is impossible", () => {
      const progress: WeeklyProgress = {
        startDate: "2026-01-12",
        endDate: "2026-01-18",
        daysCompleted: 2,
        achievedTier: "weekly",
        bestPossibleTier: "few_times",
        daysRemaining: 2,
      };

      // Target daily (7 days) is impossible with 2+2=4 max
      expect(generateNudgeMessage(progress, "daily")).toBe(
        "1 more time to hit 'Several Times'",
      );
    });

    it("handles singular 'time' correctly", () => {
      const progress: WeeklyProgress = {
        startDate: "2026-01-12",
        endDate: "2026-01-18",
        daysCompleted: 4,
        achievedTier: "few_times",
        bestPossibleTier: "most_days",
        daysRemaining: 2,
      };

      expect(generateNudgeMessage(progress, "most_days")).toBe(
        "1 more time to hit 'Most Days'",
      );
    });
  });

  describe("TIERS and TIER_ORDER", () => {
    it("has 5 tiers in order", () => {
      expect(TIERS).toHaveLength(5);
      expect(TIER_ORDER).toEqual([
        "daily",
        "most_days",
        "few_times",
        "weekly",
        "starting",
      ]);
    });
  });
});
