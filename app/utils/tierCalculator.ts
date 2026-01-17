/**
 * Tier Calculator - Pure functions for rhythm tier calculations
 *
 * Tiers represent flexible frequency targets that "bend, not break":
 * - Daily: 7 days per week
 * - Most Days: 5-6 days per week
 * - Few Times: 3-4 days per week
 * - Weekly: 1-2 days per week
 * - Starting: New rhythm, not enough data yet
 */

// ============================================================================
// Types
// ============================================================================

export type TierName =
  | "daily"
  | "most_days"
  | "few_times"
  | "weekly"
  | "starting";

export interface FrequencyTier {
  name: TierName;
  label: string;
  minDays: number;
  maxDays: number;
}

export interface WeeklyProgress {
  startDate: string; // Monday of the week (YYYY-MM-DD)
  endDate: string; // Sunday of the week (YYYY-MM-DD)
  daysCompleted: number;
  achievedTier: TierName;
  bestPossibleTier: TierName;
  daysRemaining: number;
}

export interface DayStatus {
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  isComplete: boolean;
  entryCount: number;
}

// ============================================================================
// Constants
// ============================================================================

export const TIERS: FrequencyTier[] = [
  { name: "daily", label: "Daily", minDays: 7, maxDays: 7 },
  { name: "most_days", label: "Most Days", minDays: 5, maxDays: 6 },
  { name: "few_times", label: "Few Times", minDays: 3, maxDays: 4 },
  { name: "weekly", label: "Weekly", minDays: 1, maxDays: 2 },
  { name: "starting", label: "Starting", minDays: 0, maxDays: 0 },
];

export const TIER_ORDER: TierName[] = [
  "daily",
  "most_days",
  "few_times",
  "weekly",
  "starting",
];

// ============================================================================
// Functions
// ============================================================================

/**
 * Get the tier for a given number of completed days in a week
 */
export function getTierForDaysCompleted(daysCompleted: number): TierName {
  if (daysCompleted >= 7) return "daily";
  if (daysCompleted >= 5) return "most_days";
  if (daysCompleted >= 3) return "few_times";
  if (daysCompleted >= 1) return "weekly";
  return "starting";
}

/**
 * Get the tier metadata for a tier name
 */
export function getTierInfo(tierName: TierName): FrequencyTier {
  const tier = TIERS.find((t) => t.name === tierName);
  // TIERS[4] is always 'starting' tier - use type assertion to confirm non-undefined
  return tier ?? (TIERS[4] as FrequencyTier);
}

/**
 * Get the human-readable label for a tier
 */
export function getTierLabel(tierName: TierName): string {
  return getTierInfo(tierName).label;
}

/**
 * Calculate the best tier that can still be achieved given days completed and remaining
 */
export function getBestPossibleTier(
  daysCompleted: number,
  daysRemaining: number,
): TierName {
  const potentialDays = daysCompleted + daysRemaining;
  return getTierForDaysCompleted(potentialDays);
}

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Sunday = 0, we want Monday = 0
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the week (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const parts = date.toISOString().split("T");
  return parts[0] ?? "";
}

/**
 * Calculate how many days remain in the current week (including today if not complete)
 */
export function getDaysRemainingInWeek(
  today: Date,
  completedToday: boolean,
): number {
  const dayOfWeek = today.getDay(); // 0 = Sunday
  // Monday = 1, ... Saturday = 6, Sunday = 0
  // Days remaining: Sunday(0) = 0, Monday(1) = 6, ... Saturday(6) = 1
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  // If today is not complete, include today in remaining
  return completedToday ? daysUntilSunday : daysUntilSunday + 1;
}

/**
 * Calculate weekly progress for a rhythm given day statuses
 */
export function calculateWeeklyProgress(
  dayStatuses: DayStatus[],
  weekStartDate: Date,
): WeeklyProgress {
  const startDate = getWeekStart(weekStartDate);
  const endDate = getWeekEnd(weekStartDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Count completed days in this week
  let daysCompleted = 0;
  let completedToday = false;

  for (const day of dayStatuses) {
    const dayDate = new Date(day.date);
    if (dayDate >= startDate && dayDate <= endDate && day.isComplete) {
      daysCompleted++;
      if (formatDate(dayDate) === formatDate(today)) {
        completedToday = true;
      }
    }
  }

  const daysRemaining = getDaysRemainingInWeek(today, completedToday);
  const achievedTier = getTierForDaysCompleted(daysCompleted);
  const bestPossibleTier = getBestPossibleTier(daysCompleted, daysRemaining);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    daysCompleted,
    achievedTier,
    bestPossibleTier,
    daysRemaining,
  };
}

/**
 * Generate a nudge message for mid-week guidance
 * Returns null if no nudge is needed (already on track or too late)
 */
export function generateNudgeMessage(
  progress: WeeklyProgress,
  targetTier: TierName,
): string | null {
  const targetInfo = getTierInfo(targetTier);
  const daysNeeded = targetInfo.minDays - progress.daysCompleted;

  // Already achieved target tier
  if (daysNeeded <= 0) {
    return null;
  }

  // Can't achieve target tier anymore
  if (daysNeeded > progress.daysRemaining) {
    // Suggest the best achievable tier instead
    if (progress.bestPossibleTier !== "starting") {
      const bestInfo = getTierInfo(progress.bestPossibleTier);
      const bestNeeded = bestInfo.minDays - progress.daysCompleted;
      if (bestNeeded > 0 && bestNeeded <= progress.daysRemaining) {
        return `${bestNeeded} more ${bestNeeded === 1 ? "time" : "times"} to hit '${bestInfo.label}'`;
      }
    }
    return null;
  }

  return `${daysNeeded} more ${daysNeeded === 1 ? "time" : "times"} to hit '${targetInfo.label}'`;
}
