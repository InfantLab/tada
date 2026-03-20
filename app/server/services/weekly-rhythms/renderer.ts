/**
 * Tier 1 (stats-only) renderer for weekly celebrations and encouragements.
 *
 * Produces structured SummaryBlock[] output with no AI dependency.
 * Always succeeds — this is the fallback for all higher tiers.
 */

import { formatWeekLabel } from "./time";
import type { WeeklyStatsSnapshot } from "~/server/db/schema";
import type { SummaryBlock } from "~/types/weekly-rhythms";

export interface Tier1RenderResult {
  title: string;
  summaryBlocks: SummaryBlock[];
  narrativeText: null;
}

/**
 * Render a Tier 1 stats-only celebration.
 * Two sections: General Progress + Rhythm Wins.
 */
export function renderTier1Stats(
  snapshot: WeeklyStatsSnapshot,
): Tier1RenderResult {
  const weekLabel = formatWeekLabel(
    snapshot.weekStartDate,
    snapshot.weekEndDate,
  );

  const blocks: SummaryBlock[] = [];

  // Section 1: General Progress
  const progressLines = renderProgressLines(snapshot);
  blocks.push({
    section: "general_progress",
    heading: "General progress",
    lines: progressLines,
  });

  // Section 2: Rhythm Wins
  const rhythmLines = renderRhythmWinLines(snapshot);
  if (rhythmLines.length > 0) {
    blocks.push({
      section: "rhythm_wins",
      heading: "Rhythm wins",
      lines: rhythmLines,
    });
  }

  const title = snapshot.generalProgress.quietWeek
    ? "A quieter week — and that's okay"
    : `Your week in Ta-Da! (${weekLabel})`;

  return {
    title,
    summaryBlocks: blocks,
    narrativeText: null,
  };
}

/**
 * Render a Tier 1 stats-only encouragement.
 * Two sections: Your week so far + Small moves that would count.
 */
export function renderTier1Encouragement(
  snapshot: WeeklyStatsSnapshot,
): Tier1RenderResult {
  const blocks: SummaryBlock[] = [];

  // Section 1: Progress so far this week
  const progressLines = renderProgressLines(snapshot);
  blocks.push({
    section: "general_progress",
    heading: "Your week so far",
    lines: progressLines,
  });

  // Section 2: Stretch goals
  const stretchLines = renderStretchGoalLines(snapshot);
  if (stretchLines.length > 0) {
    blocks.push({
      section: "stretch_goals",
      heading: "Small moves that would count",
      lines: stretchLines,
    });
  }

  const title = "There is still room in this week";

  return {
    title,
    summaryBlocks: blocks,
    narrativeText: null,
  };
}

// ── Line renderers ────────────────────────────────────────────────────────

function renderProgressLines(snapshot: WeeklyStatsSnapshot): string[] {
  const gp = snapshot.generalProgress;
  const lines: string[] = [];

  // Total entry count
  const totalEntries = Object.values(gp.entryCountsByType).reduce(
    (sum, n) => sum + n,
    0,
  );
  if (totalEntries === 0) {
    lines.push("No entries this week — fresh start ahead");
    return lines;
  }

  // Entry summary
  const typeLabels: string[] = [];
  for (const [type, count] of Object.entries(gp.entryCountsByType)) {
    typeLabels.push(`${count} ${type}${count !== 1 ? "s" : ""}`);
  }
  lines.push(typeLabels.join(", "));

  // Duration summary
  const totalSeconds = Object.values(gp.sessionDurationsByCategory).reduce(
    (sum, n) => sum + n,
    0,
  );
  if (totalSeconds > 0) {
    lines.push(formatDuration(totalSeconds) + " total tracked time");
  }

  // Week-over-week delta
  const delta = gp.weekOverWeek.entryCountDelta;
  if (delta > 0) {
    lines.push(`${delta} more entries than last week`);
  } else if (delta < 0) {
    lines.push(`${Math.abs(delta)} fewer entries than last week`);
  }

  // Personal records
  for (const pr of gp.personalRecordsThisMonth) {
    lines.push(`${pr.label}: ${formatRecordValue(pr)}`);
  }

  return lines;
}

function renderRhythmWinLines(snapshot: WeeklyStatsSnapshot): string[] {
  const lines: string[] = [];

  for (const win of snapshot.rhythmWins) {
    if (win.chainStatus === "quiet") continue;

    let line = win.rhythmName;
    if (win.chainStatus === "extended") {
      line += " chain extended";
    } else if (win.chainStatus === "maintained") {
      line += " chain maintained";
    } else if (win.chainStatus === "bending") {
      line += " chain bending — still time";
    }

    if (win.completedDays > 0) {
      line += ` (${win.completedDays} day${win.completedDays !== 1 ? "s" : ""})`;
    }

    lines.push(line);

    // Add milestones
    for (const m of win.allTimeMilestones) {
      lines.push(`  ${m.label}`);
    }
  }

  if (lines.length === 0 && snapshot.rhythmWins.length > 0) {
    lines.push("Quiet week for rhythms — rest counts too");
  }

  return lines;
}

function renderStretchGoalLines(snapshot: WeeklyStatsSnapshot): string[] {
  const lines: string[] = [];

  for (const win of snapshot.rhythmWins) {
    if (win.stretchGoal) {
      lines.push(win.stretchGoal);
    } else if (
      win.chainStatus === "bending" ||
      win.chainStatus === "quiet"
    ) {
      lines.push(
        `One more ${win.rhythmName.toLowerCase()} session would keep the chain alive`,
      );
    }
  }

  return lines;
}

// ── Formatting helpers ────────────────────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

function formatRecordValue(pr: { value: number; unit: string }): string {
  if (pr.unit === "seconds") {
    return formatDuration(pr.value);
  }
  return `${pr.value} ${pr.unit}`;
}
