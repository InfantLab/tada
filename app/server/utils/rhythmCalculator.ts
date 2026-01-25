/**
 * Rhythm Calculator - Server-side functions for rhythm chain calculations
 *
 * Calculates chain statistics, selects encouragement messages, and
 * aggregates entry data for rhythm progress.
 *
 * Chain Types (v0.3.1+):
 * - daily: Consecutive days with min X minutes - counted in days
 * - weekly_high: 5+ days/week with min X min/day - counted in weeks
 * - weekly_low: 3+ days/week with min X min/day - counted in weeks
 * - weekly_target: Y+ cumulative minutes/week - counted in weeks
 * - monthly_target: Y+ cumulative minutes/month - counted in months
 */

import { eq, and, gte, lte } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { entries, encouragements } from "../db/schema";
import type { Rhythm, Entry } from "../db/schema";
import type * as schema from "../db/schema";
import {
  formatDate,
  getWeekStart,
  formatMonth,
  getChainConfig,
  type DayStatus,
  type ChainType,
  type ChainStat,
  type ChainUnit,
} from "~/utils/tierCalculator";

// ============================================================================
// Types
// ============================================================================

// Re-export ChainStat from tierCalculator for consistency
export type { ChainStat };

export interface RhythmTotals {
  totalSessions: number;
  totalSeconds: number;
  totalHours: number;
  totalCount: number; // For reps-based rhythms
  firstEntryDate: string | null;
  weeksActive: number;
  monthsActive: number;
}

export interface CurrentChainState {
  lastCompleteDate: string | null; // Last date with a complete entry (YYYY-MM-DD)
  lastPeriodKey: string | null; // Week start (YYYY-MM-DD) or month (YYYY-MM)
  thisPeriodDays: number; // Completed days in the current period so far
  thisPeriodSeconds: number; // Total seconds this period
}

export interface CachedChainData {
  chains: ChainStat[];
  currentChain: CurrentChainState;
  totals: RhythmTotals;
  lastCalculatedAt: string;
  lastEntryTimestamp: string | null;
}

export type JourneyStage = "starting" | "building" | "becoming" | "being";

// ============================================================================
// Functions
// ============================================================================

/**
 * Get entries matching a rhythm's criteria within a date range
 */
export async function getMatchingEntries(
  db: LibSQLDatabase<typeof schema>,
  rhythm: Rhythm,
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<Entry[]> {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  // Build query based on rhythm's matching criteria
  const conditions = [
    eq(entries.userId, userId),
    gte(entries.timestamp, startISO),
    lte(entries.timestamp, endISO),
  ];

  if (rhythm.matchCategory) {
    conditions.push(eq(entries.category, rhythm.matchCategory));
  }
  if (rhythm.matchSubcategory) {
    conditions.push(eq(entries.subcategory, rhythm.matchSubcategory));
  }
  if (rhythm.matchType) {
    conditions.push(eq(entries.type, rhythm.matchType));
  }
  if (rhythm.matchName) {
    conditions.push(eq(entries.name, rhythm.matchName));
  }

  const result = await db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(entries.timestamp);

  return result;
}

/**
 * Convert entries to day statuses, summing durations per day
 */
export function entriesToDayStatuses(
  matchingEntries: Entry[],
  durationThresholdSeconds: number,
): DayStatus[] {
  const dayMap = new Map<
    string,
    { totalSeconds: number; totalCount: number; entryCount: number }
  >();

  for (const entry of matchingEntries) {
    const datePart = entry.timestamp.split("T")[0];
    if (!datePart) continue; // Skip invalid timestamps
    const existing = dayMap.get(datePart) || {
      totalSeconds: 0,
      totalCount: 0,
      entryCount: 0,
    };
    existing.totalSeconds += entry.durationSeconds || 0;
    // Extract count from entry data
    const data = entry.data as Record<string, unknown> | null;
    const count = data?.["count"];
    existing.totalCount += typeof count === "number" ? count : 0;
    existing.entryCount += 1;
    dayMap.set(datePart, existing);
  }

  const dayStatuses: DayStatus[] = [];
  for (const [date, data] of dayMap.entries()) {
    dayStatuses.push({
      date,
      totalSeconds: data.totalSeconds,
      totalCount: data.totalCount,
      isComplete: data.totalSeconds >= durationThresholdSeconds,
      entryCount: data.entryCount,
    });
  }

  // Sort by date
  dayStatuses.sort((a, b) => a.date.localeCompare(b.date));

  return dayStatuses;
}

/**
 * Calculate chain statistics for a specific chain type
 *
 * Supports multiple chain types:
 * - daily: Consecutive days with activity - counted in days
 * - weekly_high: 5+ days per week - counted in weeks
 * - weekly_low: 3+ days per week - counted in weeks
 * - weekly_target: Cumulative minutes per week - counted in weeks
 * - monthly_target: Cumulative minutes per month - counted in months
 */
export function calculateTypedChainStats(
  dayStatuses: DayStatus[],
  chainType: ChainType,
  targetMinutes?: number, // Required for weekly_target and monthly_target
): ChainStat {
  const config = getChainConfig(chainType);

  if (dayStatuses.length === 0) {
    return { type: chainType, current: 0, longest: 0, unit: config.unit };
  }

  switch (chainType) {
    case "daily":
      return calculateDailyChain(dayStatuses, config.unit);
    case "weekly_high":
      return calculateWeeklyDaysChain(dayStatuses, 5, config.unit);
    case "weekly_low":
      return calculateWeeklyDaysChain(dayStatuses, 3, config.unit);
    case "weekly_target":
      return calculateWeeklyTargetChain(
        dayStatuses,
        (targetMinutes || 0) * 60,
        config.unit,
      );
    case "monthly_target":
      return calculateMonthlyTargetChain(
        dayStatuses,
        (targetMinutes || 0) * 60,
        config.unit,
      );
    default:
      return { type: chainType, current: 0, longest: 0, unit: config.unit };
  }
}

/**
 * Calculate daily chain: consecutive days with activity
 */
function calculateDailyChain(
  dayStatuses: DayStatus[],
  unit: ChainUnit,
): ChainStat {
  // Sort by date
  const sorted = [...dayStatuses]
    .filter((d) => d.isComplete)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return { type: "daily", current: 0, longest: 0, unit };
  }

  let current = 0;
  let longest = 0;
  let currentChain = 0;
  let prevDate: Date | null = null;

  // Walk forward to calculate longest
  for (const day of sorted) {
    const date = new Date(day.date);

    if (prevDate) {
      const diffDays = Math.round(
        (date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) {
        // Consecutive day
        currentChain++;
      } else {
        // Gap - chain broken
        currentChain = 1;
      }
    } else {
      currentChain = 1;
    }

    longest = Math.max(longest, currentChain);
    prevDate = date;
  }

  // Walk backward from today for current chain
  const today = formatDate(new Date());
  const reversedSorted = [...sorted].reverse();
  currentChain = 0;
  prevDate = null;

  for (const day of reversedSorted) {
    const date = new Date(day.date);

    if (currentChain === 0) {
      // First iteration - check if it's today or yesterday
      const diffFromToday = Math.round(
        (new Date(today).getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffFromToday > 1) {
        // More than 1 day ago - chain is broken
        break;
      }
      currentChain = 1;
      prevDate = date;
    } else if (prevDate) {
      const diffDays = Math.round(
        (prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) {
        // Consecutive day (going backward)
        currentChain++;
        prevDate = date;
      } else {
        // Gap - chain broken
        break;
      }
    }
  }

  current = currentChain;

  return { type: "daily", current, longest, unit };
}

/**
 * Calculate weekly chain based on days per week threshold
 */
function calculateWeeklyDaysChain(
  dayStatuses: DayStatus[],
  minDays: number,
  unit: ChainUnit,
): ChainStat {
  const chainType: ChainType = minDays >= 5 ? "weekly_high" : "weekly_low";

  // Group days by week
  const weekMap = new Map<string, number>(); // weekStart -> daysCompleted

  for (const day of dayStatuses) {
    if (day.isComplete) {
      const weekStart = formatDate(getWeekStart(new Date(day.date)));
      weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + 1);
    }
  }

  // Sort weeks chronologically
  const weeks = Array.from(weekMap.entries())
    .map(([weekStart, daysCompleted]) => ({
      weekStart,
      daysCompleted,
      meetsThreshold: daysCompleted >= minDays,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  if (weeks.length === 0) {
    return { type: chainType, current: 0, longest: 0, unit };
  }

  // Calculate longest chain
  let longest = 0;
  let currentChain = 0;

  for (const week of weeks) {
    if (week.meetsThreshold) {
      currentChain++;
      longest = Math.max(longest, currentChain);
    } else {
      currentChain = 0;
    }
  }

  // Calculate current chain (from most recent week)
  const reversedWeeks = [...weeks].reverse();
  currentChain = 0;

  for (let i = 0; i < reversedWeeks.length; i++) {
    const week = reversedWeeks[i];
    if (!week) continue;

    // Check if weeks are consecutive
    if (i > 0) {
      const prevWeek = reversedWeeks[i - 1];
      if (prevWeek && !isConsecutiveWeek(week.weekStart, prevWeek.weekStart)) {
        break;
      }
    }

    if (week.meetsThreshold) {
      currentChain++;
    } else {
      // For the most recent week, allow partial progress
      if (i === 0) {
        currentChain = 0;
      }
      break;
    }
  }

  return { type: chainType, current: currentChain, longest, unit };
}

/**
 * Calculate weekly target chain: cumulative seconds per week
 */
function calculateWeeklyTargetChain(
  dayStatuses: DayStatus[],
  targetSeconds: number,
  unit: ChainUnit,
): ChainStat {
  // Group by week and sum seconds
  const weekMap = new Map<string, number>(); // weekStart -> totalSeconds

  for (const day of dayStatuses) {
    const weekStart = formatDate(getWeekStart(new Date(day.date)));
    weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + day.totalSeconds);
  }

  // Sort weeks chronologically
  const weeks = Array.from(weekMap.entries())
    .map(([weekStart, totalSeconds]) => ({
      weekStart,
      totalSeconds,
      meetsTarget: totalSeconds >= targetSeconds,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  if (weeks.length === 0) {
    return { type: "weekly_target", current: 0, longest: 0, unit };
  }

  // Calculate longest chain
  let longest = 0;
  let currentChain = 0;

  for (const week of weeks) {
    if (week.meetsTarget) {
      currentChain++;
      longest = Math.max(longest, currentChain);
    } else {
      currentChain = 0;
    }
  }

  // Calculate current chain (from most recent week)
  const reversedWeeks = [...weeks].reverse();
  currentChain = 0;

  for (let i = 0; i < reversedWeeks.length; i++) {
    const week = reversedWeeks[i];
    if (!week) continue;

    // Check if weeks are consecutive
    if (i > 0) {
      const prevWeek = reversedWeeks[i - 1];
      if (prevWeek && !isConsecutiveWeek(week.weekStart, prevWeek.weekStart)) {
        break;
      }
    }

    if (week.meetsTarget) {
      currentChain++;
    } else {
      if (i === 0) {
        currentChain = 0;
      }
      break;
    }
  }

  return { type: "weekly_target", current: currentChain, longest, unit };
}

/**
 * Calculate monthly target chain: cumulative seconds per month
 */
function calculateMonthlyTargetChain(
  dayStatuses: DayStatus[],
  targetSeconds: number,
  unit: ChainUnit,
): ChainStat {
  // Group by month and sum seconds
  const monthMap = new Map<string, number>(); // YYYY-MM -> totalSeconds

  for (const day of dayStatuses) {
    const monthKey = formatMonth(new Date(day.date));
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + day.totalSeconds);
  }

  // Sort months chronologically
  const months = Array.from(monthMap.entries())
    .map(([monthKey, totalSeconds]) => ({
      monthKey,
      totalSeconds,
      meetsTarget: totalSeconds >= targetSeconds,
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  if (months.length === 0) {
    return { type: "monthly_target", current: 0, longest: 0, unit };
  }

  // Calculate longest chain
  let longest = 0;
  let currentChain = 0;

  for (const month of months) {
    if (month.meetsTarget) {
      currentChain++;
      longest = Math.max(longest, currentChain);
    } else {
      currentChain = 0;
    }
  }

  // Calculate current chain (from most recent month)
  const reversedMonths = [...months].reverse();
  currentChain = 0;

  for (let i = 0; i < reversedMonths.length; i++) {
    const month = reversedMonths[i];
    if (!month) continue;

    // Check if months are consecutive
    if (i > 0) {
      const prevMonth = reversedMonths[i - 1];
      if (
        prevMonth &&
        !isConsecutiveMonth(month.monthKey, prevMonth.monthKey)
      ) {
        break;
      }
    }

    if (month.meetsTarget) {
      currentChain++;
    } else {
      if (i === 0) {
        currentChain = 0;
      }
      break;
    }
  }

  return { type: "monthly_target", current: currentChain, longest, unit };
}

/**
 * Check if month2 is the month immediately after month1
 */
function isConsecutiveMonth(month1: string, month2: string): boolean {
  const [y1, m1] = month1.split("-").map(Number);
  const [y2, m2] = month2.split("-").map(Number);

  if (
    y1 === undefined ||
    m1 === undefined ||
    y2 === undefined ||
    m2 === undefined
  ) {
    return false;
  }

  // Month 2 should be exactly 1 month after month 1
  if (y1 === y2) {
    return m2 === m1 + 1;
  } else if (y2 === y1 + 1) {
    return m1 === 12 && m2 === 1;
  }
  return false;
}

/**
 * Calculate aggregate totals for a rhythm
 */
export function calculateTotals(
  matchingEntries: Entry[],
  dayStatuses: DayStatus[],
): RhythmTotals {
  const totalSessions = matchingEntries.length;
  const totalSeconds = matchingEntries.reduce(
    (sum, e) => sum + (e.durationSeconds || 0),
    0,
  );
  const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;

  // Sum counts from entry data (for reps-based entries)
  const totalCount = matchingEntries.reduce((sum, e) => {
    const data = e.data as Record<string, unknown> | null;
    const count = data?.["count"];
    return sum + (typeof count === "number" ? count : 0);
  }, 0);

  // First entry date
  const firstEntry = matchingEntries[0];
  const firstEntryDate: string | null = firstEntry
    ? (firstEntry.timestamp.split("T")[0] ?? null)
    : null;

  // Count unique weeks with activity
  const activeWeeks = new Set<string>();
  // Count unique months with activity
  const activeMonths = new Set<string>();

  for (const day of dayStatuses) {
    if (day.isComplete) {
      activeWeeks.add(formatDate(getWeekStart(new Date(day.date))));
      activeMonths.add(formatMonth(new Date(day.date)));
    }
  }

  return {
    totalSessions,
    totalSeconds,
    totalHours,
    totalCount,
    firstEntryDate,
    weeksActive: activeWeeks.size,
    monthsActive: activeMonths.size,
  };
}

/**
 * Determine journey stage based on total hours of practice
 *
 * - Starting: < 10 hours (just getting started)
 * - Building: 10-100 hours (developing the habit)
 * - Becoming: 100-1000 hours (established practitioner)
 * - Being: 1000+ hours (you ARE this - fully embodied identity)
 */
export function getJourneyStage(totalHours: number): JourneyStage {
  if (totalHours >= 1000) return "being";
  if (totalHours >= 100) return "becoming";
  if (totalHours >= 10) return "building";
  return "starting";
}

/**
 * Select an encouragement message based on stage and context
 */
export async function selectEncouragement(
  db: LibSQLDatabase<typeof schema>,
  stage: JourneyStage,
  context: string,
  activityType: string = "general",
  tierName?: TierName,
): Promise<string> {
  // Build query conditions
  const conditions = [
    eq(encouragements.stage, stage),
    eq(encouragements.isActive, true),
  ];

  // Try to find context-specific message first
  const contextConditions = [
    ...conditions,
    eq(encouragements.context, context),
  ];

  // Add activity type filter (prefer specific, fall back to general)
  const activityConditions = [
    ...contextConditions,
    eq(encouragements.activityType, activityType),
  ];

  // Add tier filter if provided
  if (tierName) {
    activityConditions.push(eq(encouragements.tierName, tierName));
  }

  // Try most specific query first
  let results = await db
    .select()
    .from(encouragements)
    .where(and(...activityConditions));

  // Fall back to any activity type for this context
  if (results.length === 0) {
    results = await db
      .select()
      .from(encouragements)
      .where(and(...contextConditions));
  }

  // Fall back to general context for this stage
  if (results.length === 0) {
    results = await db
      .select()
      .from(encouragements)
      .where(
        and(
          eq(encouragements.stage, stage),
          eq(encouragements.context, "general"),
          eq(encouragements.isActive, true),
        ),
      );
  }

  // Return random selection or default
  if (results.length > 0) {
    const randomIndex = Math.floor(Math.random() * results.length);
    const selected = results[randomIndex];
    if (selected) return selected.message;
  }

  // Fallback messages by stage
  const fallbacks: Record<JourneyStage, string> = {
    starting: "Every journey begins with a single step",
    building: "A practice is forming",
    becoming: "This is who you are becoming",
    being: "This is who you are",
  };

  return fallbacks[stage];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if week2 is the week immediately after week1
 */
function isConsecutiveWeek(week1Start: string, week2Start: string): boolean {
  const w1 = new Date(week1Start);
  w1.setDate(w1.getDate() + 7);
  return formatDate(w1) === week2Start;
}

/**
 * Build initial cache data from a full calculation
 *
 * Note: The legacy tryIncrementalChainUpdate and updateChainsForNewDay functions
 * have been removed in favor of simpler full recalculation with caching.
 * The new chain type system (daily, weekly_high, weekly_low, weekly_target, monthly_target)
 * uses calculateTypedChainStats which is designed for full recalculation with efficient caching.
 */
export function buildCacheData(
  chains: ChainStat[],
  totals: RhythmTotals,
  dayStatuses: DayStatus[],
  lastEntryTimestamp: string | null,
): CachedChainData {
  // Find the last complete date and current period stats
  const today = new Date();
  const todayWeekStart = formatDate(getWeekStart(today));

  let lastCompleteDate: string | null = null;
  let thisPeriodDays = 0;
  let thisPeriodSeconds = 0;

  // Find this week's stats from day statuses (use week as default period)
  for (const day of dayStatuses) {
    const dayWeekStart = formatDate(getWeekStart(new Date(day.date)));
    if (dayWeekStart === todayWeekStart) {
      thisPeriodSeconds += day.totalSeconds;
      if (day.isComplete) {
        thisPeriodDays += 1;
        if (!lastCompleteDate || day.date > lastCompleteDate) {
          lastCompleteDate = day.date;
        }
      }
    } else if (day.isComplete) {
      // Track last complete date from previous weeks too
      if (!lastCompleteDate || day.date > lastCompleteDate) {
        lastCompleteDate = day.date;
      }
    }
  }

  // Find the last period with activity for chain tracking
  let lastPeriodKey: string | null = null;
  const periodsWithActivity = new Set<string>();
  for (const day of dayStatuses) {
    if (day.isComplete) {
      periodsWithActivity.add(formatDate(getWeekStart(new Date(day.date))));
    }
  }
  const sortedPeriods = Array.from(periodsWithActivity).sort();
  if (sortedPeriods.length > 0) {
    lastPeriodKey = sortedPeriods[sortedPeriods.length - 1] || null;
  }

  return {
    chains,
    currentChain: {
      lastCompleteDate,
      lastPeriodKey,
      thisPeriodDays,
      thisPeriodSeconds,
    },
    totals,
    lastCalculatedAt: new Date().toISOString(),
    lastEntryTimestamp,
  };
}
