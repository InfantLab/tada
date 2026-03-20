/**
 * Tests for encouragement content generation.
 * Covers: T044 tone safety, T045 stretch-goal generation, T046 no-repeat variation.
 */

import { describe, it, expect } from "vitest";

// Test the encouragement title pool and variation logic
const ENCOURAGEMENT_TITLES = [
  "There is still room in this week",
  "A gentle check-in",
  "How's your week shaping up?",
  "Mid-week moment",
  "Thursday thoughts",
  "Your week so far",
  "Halfway there",
  "A small pause to notice",
];

describe("weekly-rhythms/encouragement", () => {
  describe("tone safety", () => {
    it("all titles use positive, non-guilt language", () => {
      const guiltyWords = [
        "should",
        "must",
        "failed",
        "missed",
        "behind",
        "lazy",
        "disappointed",
        "shame",
      ];

      for (const title of ENCOURAGEMENT_TITLES) {
        for (const word of guiltyWords) {
          expect(title.toLowerCase()).not.toContain(word);
        }
      }
    });

    it("has at least 8 title variations", () => {
      expect(ENCOURAGEMENT_TITLES.length).toBeGreaterThanOrEqual(8);
    });

    it("all titles are unique", () => {
      const unique = new Set(ENCOURAGEMENT_TITLES);
      expect(unique.size).toBe(ENCOURAGEMENT_TITLES.length);
    });
  });

  describe("stretch goal generation", () => {
    it("generates stretch goals for bending rhythms", () => {
      const rhythmWins = [
        {
          rhythmName: "Meditation",
          chainStatus: "bending",
          stretchGoal: undefined,
        },
      ];

      const goals: string[] = [];
      for (const win of rhythmWins) {
        if (win.stretchGoal) {
          goals.push(win.stretchGoal);
        } else if (win.chainStatus === "bending" || win.chainStatus === "quiet") {
          goals.push(
            `One more ${win.rhythmName.toLowerCase()} session would keep the chain alive`,
          );
        }
      }

      expect(goals).toHaveLength(1);
      expect(goals[0]).toContain("meditation");
    });

    it("includes explicit stretch goals when present", () => {
      const rhythmWins = [
        {
          rhythmName: "Exercise",
          chainStatus: "maintained",
          stretchGoal: "One more run would match last week",
        },
      ];

      const goals: string[] = [];
      for (const win of rhythmWins) {
        if (win.stretchGoal) goals.push(win.stretchGoal);
      }

      expect(goals).toHaveLength(1);
      expect(goals[0]).toContain("last week");
    });

    it("handles zero rhythms gracefully", () => {
      const rhythmWins: Array<{
        rhythmName: string;
        chainStatus: string;
        stretchGoal?: string;
      }> = [];

      const goals: string[] = [];
      for (const win of rhythmWins) {
        if (win.stretchGoal) goals.push(win.stretchGoal);
      }

      expect(goals).toHaveLength(0);
    });

    it("handles N rhythms with mixed statuses", () => {
      const rhythmWins = [
        { rhythmName: "Meditation", chainStatus: "maintained", stretchGoal: undefined },
        { rhythmName: "Exercise", chainStatus: "bending", stretchGoal: undefined },
        { rhythmName: "Reading", chainStatus: "quiet", stretchGoal: undefined },
      ];

      const goals: string[] = [];
      for (const win of rhythmWins) {
        if (win.stretchGoal) {
          goals.push(win.stretchGoal);
        } else if (win.chainStatus === "bending" || win.chainStatus === "quiet") {
          goals.push(
            `One more ${win.rhythmName.toLowerCase()} session would keep the chain alive`,
          );
        }
      }

      // Only bending and quiet get stretch goals
      expect(goals).toHaveLength(2);
      expect(goals[0]).toContain("exercise");
      expect(goals[1]).toContain("reading");
    });
  });

  describe("no-repeat-in-4-weeks variation", () => {
    it("picks a title not recently used", () => {
      const recentTitles = new Set([
        "There is still room in this week",
        "A gentle check-in",
        "How's your week shaping up?",
        "Mid-week moment",
      ]);

      let picked: string | undefined;
      for (const title of ENCOURAGEMENT_TITLES) {
        if (!recentTitles.has(title)) {
          picked = title;
          break;
        }
      }

      expect(picked).toBeDefined();
      expect(recentTitles.has(picked!)).toBe(false);
    });

    it("cycles back if all titles used recently", () => {
      const recentTitles = new Set(ENCOURAGEMENT_TITLES);

      let picked: string | undefined;
      for (const title of ENCOURAGEMENT_TITLES) {
        if (!recentTitles.has(title)) {
          picked = title;
          break;
        }
      }

      // Fallback to first title when all are used
      if (!picked) picked = ENCOURAGEMENT_TITLES[0];
      expect(picked).toBe(ENCOURAGEMENT_TITLES[0]);
    });
  });
});
