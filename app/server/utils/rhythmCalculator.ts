/**
 * Rhythm Calculator - Server-side functions for rhythm chain calculations
 *
 * Calculates chain statistics, selects encouragement messages, and
 * aggregates entry data for rhythm progress.
 */

import { eq, and, gte, lte, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { entries, rhythms, encouragements } from "../db/schema";
import type { Rhythm, Entry, Encouragement } from "../db/schema";
import {
  getTierForDaysCompleted,
  getTierLabel,
  formatDate,
  getWeekStart,
  type TierName,
  type DayStatus,
  TIER_ORDER,
} from "~/utils/tierCalculator";

// ============================================================================
// Types
// ============================================================================

export interface ChainStats {
  tier: TierName;
  current: number; // Current consecutive weeks at this tier
  longest: number; // Longest ever at this tier
}

export interface RhythmTotals {
  totalSessions: number;
  totalSeconds: number;
  totalHours: number;
  firstEntryDate: string | null;
  weeksActive: number;
}

export type JourneyStage = "starting" | "building" | "becoming";

// ============================================================================
// Functions
// ============================================================================

/**
 * Get entries matching a rhythm's criteria within a date range
 */
export async function getMatchingEntries(
  db: LibSQLDatabase,
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
    { totalSeconds: number; entryCount: number }
  >();

  for (const entry of matchingEntries) {
    const datePart = entry.timestamp.split("T")[0];
    if (!datePart) continue; // Skip invalid timestamps
    const existing = dayMap.get(datePart) || { totalSeconds: 0, entryCount: 0 };
    existing.totalSeconds += entry.durationSeconds || 0;
    existing.entryCount += 1;
    dayMap.set(datePart, existing);
  }

  const dayStatuses: DayStatus[] = [];
  for (const [date, data] of dayMap.entries()) {
    dayStatuses.push({
      date,
      totalSeconds: data.totalSeconds,
      isComplete: data.totalSeconds >= durationThresholdSeconds,
      entryCount: data.entryCount,
    });
  }

  // Sort by date
  dayStatuses.sort((a, b) => a.date.localeCompare(b.date));

  return dayStatuses;
}

/**
 * Calculate chain statistics for all tiers
 *
 * A chain is a consecutive run of weeks at or above a tier level.
 * For example, a "most_days" chain continues as long as each week
 * has 5+ completed days.
 */
export function calculateChainStats(dayStatuses: DayStatus[]): ChainStats[] {
  if (dayStatuses.length === 0) {
    return TIER_ORDER.filter((t) => t !== "starting").map((tier) => ({
      tier,
      current: 0,
      longest: 0,
    }));
  }

  // Group days by week (Monday-Sunday)
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
      tier: getTierForDaysCompleted(daysCompleted),
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // Calculate chains for each tier (excluding "starting")
  const chains: ChainStats[] = [];
  const tiersToTrack: TierName[] = [
    "daily",
    "most_days",
    "few_times",
    "weekly",
  ];

  for (const tier of tiersToTrack) {
    const tierIndex = TIER_ORDER.indexOf(tier);
    let current = 0;
    let longest = 0;
    let currentChain = 0;

    // Walk through weeks in reverse (most recent first) for current chain
    const reversedWeeks = [...weeks].reverse();

    for (let i = 0; i < reversedWeeks.length; i++) {
      const week = reversedWeeks[i];
      if (!week) continue; // Skip if undefined
      const weekTierIndex = TIER_ORDER.indexOf(week.tier);

      // A week counts towards a tier if it achieved that tier or better
      if (weekTierIndex <= tierIndex && week.tier !== "starting") {
        if (i === 0 || currentChain > 0) {
          currentChain++;
        }
      } else {
        // Chain broken - this only affects current chain calculation
        if (i === 0) {
          currentChain = 0;
        }
        break;
      }
    }
    current = currentChain;

    // Calculate longest chain by walking forward
    currentChain = 0;
    for (const week of weeks) {
      const weekTierIndex = TIER_ORDER.indexOf(week.tier);
      if (weekTierIndex <= tierIndex && week.tier !== "starting") {
        currentChain++;
        longest = Math.max(longest, currentChain);
      } else {
        currentChain = 0;
      }
    }

    chains.push({ tier, current, longest });
  }

  return chains;
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

  // First entry date
  const firstEntry = matchingEntries[0];
  const firstEntryDate: string | null = firstEntry
    ? (firstEntry.timestamp.split("T")[0] ?? null)
    : null;

  // Count unique weeks with activity
  const activeWeeks = new Set<string>();
  for (const day of dayStatuses) {
    if (day.isComplete) {
      activeWeeks.add(formatDate(getWeekStart(new Date(day.date))));
    }
  }

  return {
    totalSessions,
    totalSeconds,
    totalHours,
    firstEntryDate,
    weeksActive: activeWeeks.size,
  };
}

/**
 * Determine journey stage based on weeks of consistent practice
 */
export function getJourneyStage(weeksActive: number): JourneyStage {
  if (weeksActive >= 4) return "becoming";
  if (weeksActive >= 2) return "building";
  return "starting";
}

/**
 * Select an encouragement message based on stage and context
 */
export async function selectEncouragement(
  db: LibSQLDatabase,
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
    becoming: "This is who you are now",
  };

  return fallbacks[stage];
}
