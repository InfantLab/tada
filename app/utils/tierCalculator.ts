/**
 * Tier Calculator - Pure functions for rhythm tier calculations
 *
 * Tiers represent flexible frequency targets that "bend, not break":
 * - Daily: 7 days per week (every day)
 * - Most Days: 5-6 days per week
 * - Few Times: 3-4 days per week
 * - Weekly: 1-2 days per week
 * - Starting: New rhythm, not enough data yet
 *
 * Chain Types (v0.3.1+):
 * - daily: Consecutive days with min X minutes - counted in days
 * - weekly_high: 5+ days/week with min X min/day - counted in weeks
 * - weekly_low: 3+ days/week with min X min/day - counted in weeks
 * - weekly_target: Y+ cumulative minutes/week - counted in weeks
 * - monthly_target: Y+ cumulative minutes/month - counted in months
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

/**
 * Chain types determine how streaks are calculated and counted
 */
export type ChainType =
  | "daily" // Consecutive days with min duration
  | "weekly_high" // 5+ days per week - counted in weeks
  | "weekly_low" // 3+ days per week - counted in weeks
  | "weekly_target" // Cumulative minutes per week - counted in weeks
  | "monthly_target"; // Cumulative minutes per month - counted in months

/**
 * Unit of measurement for a chain
 */
export type ChainUnit = "days" | "weeks" | "months";

/**
 * Configuration for a specific chain type
 */
export interface ChainConfig {
  type: ChainType;
  label: string;
  shortLabel: string;
  description: string;
  unit: ChainUnit;
  // For day-based chains (daily, weekly_high, weekly_low)
  minDaysPerPeriod?: number; // Days required per period (7 for daily, 5 for high, 3 for low)
  // For target-based chains: targetMinutes is configured per-rhythm
}

/**
 * Statistics for a single chain type
 */
export interface ChainStat {
  type: ChainType;
  current: number; // Current chain length in the chain's unit
  longest: number; // All-time best in the chain's unit
  unit: ChainUnit;
}

export interface FrequencyTier {
  name: TierName;
  label: string;
  shortLabel: string;
  description: string;
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

/**
 * Chain type configurations
 */
export const CHAIN_CONFIGS: ChainConfig[] = [
  {
    type: "daily",
    label: "Daily Chain",
    shortLabel: "Daily",
    description: "Every day",
    unit: "days",
    minDaysPerPeriod: 1, // Per day
  },
  {
    type: "weekly_high",
    label: "Weekly (High)",
    shortLabel: "5×/wk",
    description: "5+ days per week",
    unit: "weeks",
    minDaysPerPeriod: 5,
  },
  {
    type: "weekly_low",
    label: "Weekly (Regular)",
    shortLabel: "3×/wk",
    description: "3+ days per week",
    unit: "weeks",
    minDaysPerPeriod: 3,
  },
  {
    type: "weekly_target",
    label: "Weekly Target",
    shortLabel: "Wk Goal",
    description: "Minutes per week",
    unit: "weeks",
  },
  {
    type: "monthly_target",
    label: "Monthly Target",
    shortLabel: "Mo Goal",
    description: "Minutes per month",
    unit: "months",
  },
];

/**
 * Order of chain types from most demanding to least
 */
export const CHAIN_TYPE_ORDER: ChainType[] = [
  "daily",
  "weekly_high",
  "weekly_low",
  "weekly_target",
  "monthly_target",
];

export interface FrequencyTier {
  name: TierName;
  label: string;
  shortLabel: string;
  description: string;
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
  {
    name: "daily",
    label: "Every Day",
    shortLabel: "Daily",
    description: "7 days per week",
    minDays: 7,
    maxDays: 7,
  },
  {
    name: "most_days",
    label: "Most Days",
    shortLabel: "5-6×",
    description: "5-6 days per week",
    minDays: 5,
    maxDays: 6,
  },
  {
    name: "few_times",
    label: "Several Times",
    shortLabel: "3-4×",
    description: "3-4 days per week",
    minDays: 3,
    maxDays: 4,
  },
  {
    name: "weekly",
    label: "At Least Once",
    shortLabel: "1-2×",
    description: "1-2 days per week",
    minDays: 1,
    maxDays: 2,
  },
  {
    name: "starting",
    label: "Starting",
    shortLabel: "—",
    description: "No activity yet",
    minDays: 0,
    maxDays: 0,
  },
];

export const TIER_ORDER: TierName[] = [
  "daily",
  "most_days",
  "few_times",
  "weekly",
  "starting",
];

// ============================================================================
// Chain Helper Functions
// ============================================================================

/**
 * Get the chain configuration for a chain type
 */
export function getChainConfig(chainType: ChainType): ChainConfig {
  const config = CHAIN_CONFIGS.find((c) => c.type === chainType);
  // Default to weekly_low if not found
  return config ?? (CHAIN_CONFIGS[2] as ChainConfig);
}

/**
 * Get the label for a chain type
 */
export function getChainLabel(chainType: ChainType): string {
  return getChainConfig(chainType).label;
}

/**
 * Get the short label for a chain type
 */
export function getChainShortLabel(chainType: ChainType): string {
  return getChainConfig(chainType).shortLabel;
}

/**
 * Get the description for a chain type
 */
export function getChainDescription(chainType: ChainType): string {
  return getChainConfig(chainType).description;
}

/**
 * Get the unit for a chain type
 */
export function getChainUnit(chainType: ChainType): ChainUnit {
  return getChainConfig(chainType).unit;
}

/**
 * Format a chain value with its unit (e.g., "5 days", "3 weeks", "2 months")
 */
export function formatChainValue(value: number, unit: ChainUnit): string {
  if (value === 0) return "—";
  const singular = unit.slice(0, -1); // Remove 's'
  return value === 1 ? `1 ${singular}` : `${value} ${unit}`;
}

/**
 * Get the start of a month for a given date
 */
export function getMonthStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of a month for a given date
 */
export function getMonthEnd(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0); // Last day of previous month
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Format a date as YYYY-MM (for monthly grouping)
 */
export function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

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
 * Get the short label for a tier (for compact displays)
 */
export function getTierShortLabel(tierName: TierName): string {
  return getTierInfo(tierName).shortLabel;
}

/**
 * Get the description for a tier (explains the rule)
 */
export function getTierDescription(tierName: TierName): string {
  return getTierInfo(tierName).description;
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
