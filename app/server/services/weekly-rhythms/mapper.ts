/**
 * Summary-only narrative input mapper.
 *
 * Converts a WeeklyStatsSnapshot into the privacy-safe WeeklyNarrativeInput
 * that is the only payload sent to AI providers.
 */

import type { WeeklyStatsSnapshot } from "~/server/db/schema";
import type { WeeklyNarrativeInput } from "~/types/weekly-rhythms";
import { formatWeekLabel } from "./time";

/**
 * Map a snapshot to the summary-only input for AI rendering.
 * Strips all raw user content — only aggregated statistics cross this boundary.
 */
export function mapSnapshotToNarrativeInput(
  snapshot: WeeklyStatsSnapshot,
): WeeklyNarrativeInput {
  const gp = snapshot.generalProgress;

  return {
    kind: snapshot.kind as "celebration" | "encouragement",
    weekLabel: formatWeekLabel(snapshot.weekStartDate, snapshot.weekEndDate),
    timezone: snapshot.timezone,
    generalProgress: {
      countsByType: gp.entryCountsByType,
      durationByCategorySeconds: gp.sessionDurationsByCategory,
      weekOverWeek: {
        entryCountDelta: gp.weekOverWeek.entryCountDelta,
        durationDeltaSeconds: gp.weekOverWeek.durationDeltaSeconds,
        byType: gp.weekOverWeek.byType,
      },
      monthlyHighlights: gp.personalRecordsThisMonth.map((pr) => ({
        label: pr.label,
        value: pr.value,
        unit: pr.unit,
      })),
      quietWeek: gp.quietWeek,
    },
    rhythmWins: snapshot.rhythmWins.map((w) => ({
      rhythmName: w.rhythmName,
      chainStatus: w.chainStatus,
      achievedTier: w.achievedTier,
      completedDays: w.completedDays,
      milestones: w.allTimeMilestones.map((m) => m.label),
      stretchGoal: w.stretchGoal,
    })),
  };
}
