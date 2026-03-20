/**
 * Tests for Tier 1 stats-only renderer.
 * Covers: T022 zero-rhythm and quiet-week tests.
 */

import { describe, it, expect } from "vitest";
import {
  renderTier1Stats,
  renderTier1Encouragement,
} from "~/server/services/weekly-rhythms/renderer";
import type { WeeklyStatsSnapshot } from "~/server/db/schema";

function makeSnapshot(
  overrides: Partial<WeeklyStatsSnapshot> = {},
): WeeklyStatsSnapshot {
  return {
    id: "snap-1",
    userId: "user-1",
    kind: "celebration",
    weekStartDate: "2026-03-16",
    weekEndDate: "2026-03-22",
    timezone: "UTC",
    periodRange: {
      localStart: "2026-03-16T00:00:00",
      localEnd: "2026-03-22T23:59:59",
      utcStart: "2026-03-16T00:00:00.000Z",
      utcEnd: "2026-03-22T23:59:59.000Z",
    },
    generalProgress: {
      entryCountsByType: { timed: 5, moment: 2 },
      sessionDurationsByCategory: { mindfulness: 3600, creative: 1800 },
      weekOverWeek: {
        entryCountDelta: 2,
        durationDeltaSeconds: 600,
        byType: { timed: 1, moment: 1 },
        byCategorySeconds: { mindfulness: 300, creative: 300 },
      },
      personalRecordsThisMonth: [],
      quietWeek: false,
    },
    rhythmWins: [
      {
        rhythmId: "r1",
        rhythmName: "Daily Meditation",
        chainType: "daily",
        chainStatus: "maintained",
        achievedTier: "most_days",
        completedDays: 5,
        totalSeconds: 3600,
        totalCount: 5,
        allTimeMilestones: [],
      },
    ],
    encouragementContext: null,
    generatedAt: "2026-03-23T03:33:00.000Z",
    ...overrides,
  } as WeeklyStatsSnapshot;
}

describe("weekly-rhythms/renderer", () => {
  describe("renderTier1Stats", () => {
    it("produces a title and two sections for a normal week", () => {
      const snapshot = makeSnapshot();
      const result = renderTier1Stats(snapshot);

      expect(result.title).toContain("Ta-Da!");
      expect(result.summaryBlocks.length).toBeGreaterThanOrEqual(1);
      expect(result.narrativeText).toBeNull();

      const sections = result.summaryBlocks.map((b) => b.section);
      expect(sections).toContain("general_progress");
      expect(sections).toContain("rhythm_wins");
    });

    it("produces gentle title for quiet week", () => {
      const snapshot = makeSnapshot({
        generalProgress: {
          entryCountsByType: {},
          sessionDurationsByCategory: {},
          weekOverWeek: {
            entryCountDelta: 0,
            durationDeltaSeconds: 0,
            byType: {},
            byCategorySeconds: {},
          },
          personalRecordsThisMonth: [],
          quietWeek: true,
        },
      });
      const result = renderTier1Stats(snapshot);

      expect(result.title.toLowerCase()).toContain("quiet");
    });

    it("includes entry counts in general progress lines", () => {
      const snapshot = makeSnapshot();
      const result = renderTier1Stats(snapshot);

      const progressBlock = result.summaryBlocks.find(
        (b) => b.section === "general_progress",
      );
      expect(progressBlock).toBeDefined();
      expect(progressBlock!.lines.some((l) => l.includes("5"))).toBe(true);
    });

    it("includes duration summary in progress lines", () => {
      const snapshot = makeSnapshot();
      const result = renderTier1Stats(snapshot);

      const progressBlock = result.summaryBlocks.find(
        (b) => b.section === "general_progress",
      );
      expect(progressBlock!.lines.some((l) => l.includes("1h 30m"))).toBe(
        true,
      );
    });

    it("includes week-over-week delta", () => {
      const snapshot = makeSnapshot();
      const result = renderTier1Stats(snapshot);

      const progressBlock = result.summaryBlocks.find(
        (b) => b.section === "general_progress",
      );
      expect(
        progressBlock!.lines.some((l) => l.includes("more entries")),
      ).toBe(true);
    });

    it("handles zero rhythms — no rhythm_wins section", () => {
      const snapshot = makeSnapshot({
        rhythmWins: [],
      });
      const result = renderTier1Stats(snapshot);

      const sections = result.summaryBlocks.map((b) => b.section);
      expect(sections).not.toContain("rhythm_wins");
    });

    it("shows rhythm chain status in wins section", () => {
      const snapshot = makeSnapshot();
      const result = renderTier1Stats(snapshot);

      const winsBlock = result.summaryBlocks.find(
        (b) => b.section === "rhythm_wins",
      );
      expect(winsBlock).toBeDefined();
      expect(
        winsBlock!.lines.some((l) => l.includes("Meditation")),
      ).toBe(true);
      expect(
        winsBlock!.lines.some((l) => l.includes("maintained")),
      ).toBe(true);
    });

    it("shows gentle message when all rhythms are quiet", () => {
      const snapshot = makeSnapshot({
        rhythmWins: [
          {
            rhythmId: "r1",
            rhythmName: "Meditation",
            chainType: "daily",
            chainStatus: "quiet",
            achievedTier: "none",
            completedDays: 0,
            totalSeconds: 0,
            totalCount: 0,
            allTimeMilestones: [],
          },
        ],
      });
      const result = renderTier1Stats(snapshot);

      const winsBlock = result.summaryBlocks.find(
        (b) => b.section === "rhythm_wins",
      );
      expect(winsBlock).toBeDefined();
      expect(
        winsBlock!.lines.some((l) => l.toLowerCase().includes("rest")),
      ).toBe(true);
    });

    it("shows no-entry message for empty week", () => {
      const snapshot = makeSnapshot({
        generalProgress: {
          entryCountsByType: {},
          sessionDurationsByCategory: {},
          weekOverWeek: {
            entryCountDelta: -3,
            durationDeltaSeconds: 0,
            byType: {},
            byCategorySeconds: {},
          },
          personalRecordsThisMonth: [],
          quietWeek: true,
        },
        rhythmWins: [],
      });
      const result = renderTier1Stats(snapshot);

      const progressBlock = result.summaryBlocks.find(
        (b) => b.section === "general_progress",
      );
      expect(
        progressBlock!.lines.some((l) => l.toLowerCase().includes("no entries")),
      ).toBe(true);
    });
  });

  describe("renderTier1Encouragement", () => {
    it("produces progress and stretch goal sections", () => {
      const snapshot = makeSnapshot({
        kind: "encouragement",
        rhythmWins: [
          {
            rhythmId: "r1",
            rhythmName: "Meditation",
            chainType: "daily",
            chainStatus: "bending",
            achievedTier: "weekly",
            completedDays: 2,
            totalSeconds: 1200,
            totalCount: 2,
            allTimeMilestones: [],
          },
        ],
      });
      const result = renderTier1Encouragement(snapshot);

      expect(result.title).toContain("still room");
      const sections = result.summaryBlocks.map((b) => b.section);
      expect(sections).toContain("general_progress");
      expect(sections).toContain("stretch_goals");
    });

    it("produces stretch goal for bending rhythm", () => {
      const snapshot = makeSnapshot({
        kind: "encouragement",
        rhythmWins: [
          {
            rhythmId: "r1",
            rhythmName: "Meditation",
            chainType: "daily",
            chainStatus: "bending",
            achievedTier: "weekly",
            completedDays: 2,
            totalSeconds: 1200,
            totalCount: 2,
            allTimeMilestones: [],
          },
        ],
      });
      const result = renderTier1Encouragement(snapshot);

      const stretchBlock = result.summaryBlocks.find(
        (b) => b.section === "stretch_goals",
      );
      expect(stretchBlock).toBeDefined();
      expect(
        stretchBlock!.lines.some((l) => l.toLowerCase().includes("meditation")),
      ).toBe(true);
    });
  });
});
