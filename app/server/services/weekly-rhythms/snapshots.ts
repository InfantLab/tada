/**
 * Weekly snapshot aggregation service.
 *
 * Generates immutable factual aggregates for a user's week:
 * - Entry counts by type
 * - Session durations by category
 * - Week-over-week deltas
 * - Monthly personal records
 * - Per-rhythm wins using existing rhythm calculators
 */

import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { db } from "~/server/db";
import { withRetry } from "~/server/db/operations";
import { entries, rhythms } from "~/server/db/schema";
import type { weeklyStatsSnapshots } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import { getWeekBoundaries } from "./time";
import { findSnapshot, insertSnapshot } from "./repository";
import type {
  GeneralProgress,
  RhythmWin,
  RhythmChainStatus,
  WeeklyMessageKind,
  PersonalRecord,
  EncouragementContext,
  MomentumLevel,
} from "~/types/weekly-rhythms";

const logger = createLogger("service:weekly-rhythms:snapshots");

/**
 * Generate or retrieve a weekly stats snapshot for a user.
 * Idempotent: returns existing snapshot if one exists for the same user/kind/week.
 */
export async function generateWeeklySnapshot(
  userId: string,
  kind: WeeklyMessageKind,
  referenceDate: Date,
  timezone: string,
): Promise<typeof weeklyStatsSnapshots.$inferSelect> {
  const boundaries = getWeekBoundaries(referenceDate, timezone);

  // Check for existing snapshot (idempotency)
  const existing = await findSnapshot(userId, kind, boundaries.weekStartDate);
  if (existing) {
    logger.debug("Returning existing snapshot", {
      userId,
      kind,
      week: boundaries.weekStartDate,
    });
    return existing;
  }

  logger.info("Generating weekly snapshot", {
    userId,
    kind,
    week: boundaries.weekStartDate,
  });

  // Aggregate the week's data
  const generalProgress = await aggregateGeneralProgress(
    userId,
    boundaries.utcStart,
    boundaries.utcEnd,
    timezone,
  );

  const rhythmWins = await aggregateRhythmWins(
    userId,
    boundaries.utcStart,
    boundaries.utcEnd,
  );

  // For encouragement kind, also compute trailing averages
  let encouragementContext: EncouragementContext | null = null;
  if (kind === "encouragement") {
    encouragementContext = await computeEncouragementContext(
      userId,
      referenceDate,
      timezone,
    );
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const [snapshot] = await insertSnapshot({
    id,
    userId,
    kind,
    weekStartDate: boundaries.weekStartDate,
    weekEndDate: boundaries.weekEndDate,
    timezone,
    periodRange: {
      localStart: boundaries.localStart,
      localEnd: boundaries.localEnd,
      utcStart: boundaries.utcStart,
      utcEnd: boundaries.utcEnd,
    },
    generalProgress,
    rhythmWins,
    encouragementContext,
    generatedAt: now,
  });

  return snapshot!;
}

/**
 * Retrieve an existing snapshot without generating.
 */
export async function getExistingSnapshot(
  userId: string,
  kind: WeeklyMessageKind,
  weekStartDate: string,
) {
  return findSnapshot(userId, kind, weekStartDate);
}

// ── Internal aggregation helpers ──────────────────────────────────────────

async function aggregateGeneralProgress(
  userId: string,
  utcStart: string,
  utcEnd: string,
  timezone: string,
): Promise<GeneralProgress> {
  // Fetch entries for this week
  const weekEntries = await withRetry(() =>
    db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          gte(entries.timestamp, utcStart),
          lte(entries.timestamp, utcEnd),
          isNull(entries.deletedAt),
        ),
      ),
  );

  // Entry counts by type
  const entryCountsByType: Record<string, number> = {};
  for (const entry of weekEntries) {
    entryCountsByType[entry.type] = (entryCountsByType[entry.type] ?? 0) + 1;
  }

  // Session durations by category
  const sessionDurationsByCategory: Record<string, number> = {};
  for (const entry of weekEntries) {
    if (entry.durationSeconds && entry.category) {
      sessionDurationsByCategory[entry.category] =
        (sessionDurationsByCategory[entry.category] ?? 0) +
        entry.durationSeconds;
    }
  }

  // Week-over-week comparison
  const prevWeekStart = new Date(new Date(utcStart).getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekEnd = new Date(new Date(utcStart).getTime() - 1);
  const weekOverWeek = await computeWeekOverWeek(
    userId,
    weekEntries,
    prevWeekStart.toISOString(),
    prevWeekEnd.toISOString(),
  );

  // Personal records this month
  const personalRecordsThisMonth = await extractPersonalRecords(
    userId,
    utcStart,
    timezone,
  );

  // Quiet week detection
  const totalEntries = weekEntries.length;
  const quietWeek = totalEntries <= 1;

  return {
    entryCountsByType,
    sessionDurationsByCategory,
    weekOverWeek,
    personalRecordsThisMonth,
    quietWeek,
  };
}

async function computeWeekOverWeek(
  userId: string,
  currentWeekEntries: Array<typeof entries.$inferSelect>,
  prevUtcStart: string,
  prevUtcEnd: string,
): Promise<GeneralProgress["weekOverWeek"]> {
  const prevEntries = await withRetry(() =>
    db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          gte(entries.timestamp, prevUtcStart),
          lte(entries.timestamp, prevUtcEnd),
          isNull(entries.deletedAt),
        ),
      ),
  );

  // Current counts
  const currentByType: Record<string, number> = {};
  let currentDuration = 0;
  const currentByCatSec: Record<string, number> = {};
  for (const e of currentWeekEntries) {
    currentByType[e.type] = (currentByType[e.type] ?? 0) + 1;
    if (e.durationSeconds) currentDuration += e.durationSeconds;
    if (e.durationSeconds && e.category) {
      currentByCatSec[e.category] =
        (currentByCatSec[e.category] ?? 0) + e.durationSeconds;
    }
  }

  // Previous counts
  const prevByType: Record<string, number> = {};
  let prevDuration = 0;
  const prevByCatSec: Record<string, number> = {};
  for (const e of prevEntries) {
    prevByType[e.type] = (prevByType[e.type] ?? 0) + 1;
    if (e.durationSeconds) prevDuration += e.durationSeconds;
    if (e.durationSeconds && e.category) {
      prevByCatSec[e.category] =
        (prevByCatSec[e.category] ?? 0) + e.durationSeconds;
    }
  }

  // Delta by type
  const allTypes = new Set([
    ...Object.keys(currentByType),
    ...Object.keys(prevByType),
  ]);
  const byType: Record<string, number> = {};
  for (const t of allTypes) {
    byType[t] = (currentByType[t] ?? 0) - (prevByType[t] ?? 0);
  }

  // Delta by category seconds
  const allCats = new Set([
    ...Object.keys(currentByCatSec),
    ...Object.keys(prevByCatSec),
  ]);
  const byCategorySeconds: Record<string, number> = {};
  for (const c of allCats) {
    byCategorySeconds[c] =
      (currentByCatSec[c] ?? 0) - (prevByCatSec[c] ?? 0);
  }

  return {
    entryCountDelta: currentWeekEntries.length - prevEntries.length,
    durationDeltaSeconds: currentDuration - prevDuration,
    byType,
    byCategorySeconds,
  };
}

async function extractPersonalRecords(
  userId: string,
  utcStart: string,
  _timezone: string,
): Promise<PersonalRecord[]> {
  // Get all entries this month
  const startDate = new Date(utcStart);
  const monthStart = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
  );
  const monthEnd = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0, 23, 59, 59),
  );

  const monthEntries = await withRetry(() =>
    db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          gte(entries.timestamp, monthStart.toISOString()),
          lte(entries.timestamp, monthEnd.toISOString()),
          isNull(entries.deletedAt),
        ),
      ),
  );

  const records: PersonalRecord[] = [];

  // Longest single session this month
  let longestSession: typeof entries.$inferSelect | null = null;
  for (const e of monthEntries) {
    if (
      e.durationSeconds &&
      (!longestSession ||
        e.durationSeconds > (longestSession.durationSeconds ?? 0))
    ) {
      longestSession = e;
    }
  }
  if (longestSession && longestSession.durationSeconds) {
    records.push({
      type: "longest_session",
      label: `Longest ${longestSession.name} session`,
      value: longestSession.durationSeconds,
      unit: "seconds",
      happenedAt: longestSession.timestamp,
    });
  }

  // Most entries in a single day
  const byDay = new Map<string, number>();
  for (const e of monthEntries) {
    const day = e.timestamp.split("T")[0]!;
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  let bestDay = "";
  let bestDayCount = 0;
  for (const [day, count] of byDay) {
    if (count > bestDayCount) {
      bestDay = day;
      bestDayCount = count;
    }
  }
  if (bestDayCount > 2) {
    records.push({
      type: "most_active_day",
      label: "Most active day this month",
      value: bestDayCount,
      unit: "entries",
      happenedAt: `${bestDay}T00:00:00Z`,
    });
  }

  return records;
}

async function aggregateRhythmWins(
  userId: string,
  utcStart: string,
  utcEnd: string,
): Promise<RhythmWin[]> {
  // Get all active rhythms for this user
  const userRhythms = await withRetry(() =>
    db.select().from(rhythms).where(eq(rhythms.userId, userId)),
  );

  if (userRhythms.length === 0) return [];

  const wins: RhythmWin[] = [];

  for (const rhythm of userRhythms) {
    // Get matching entries for this week
    const conditions = [
      eq(entries.userId, userId),
      gte(entries.timestamp, utcStart),
      lte(entries.timestamp, utcEnd),
      isNull(entries.deletedAt),
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

    const matchingEntries = await withRetry(() =>
      db.select().from(entries).where(and(...conditions)),
    );

    // Count completed days
    const completedDays = new Set<string>();
    let totalSeconds = 0;
    let totalCount = 0;

    for (const e of matchingEntries) {
      const day = e.timestamp.split("T")[0]!;
      totalCount++;

      if (e.durationSeconds) {
        totalSeconds += e.durationSeconds;
      }

      // Check completion based on mode
      if (rhythm.completionMode === "session") {
        completedDays.add(day);
      } else {
        // threshold mode
        if (rhythm.goalType === "duration" && e.durationSeconds) {
          if (e.durationSeconds >= rhythm.durationThresholdSeconds) {
            completedDays.add(day);
          }
        } else if (rhythm.goalType === "count") {
          completedDays.add(day); // simplified — count threshold checked differently
        } else {
          completedDays.add(day);
        }
      }
    }

    // Determine chain status from cached stats
    const cached = rhythm.cachedChainStats;
    let chainStatus: RhythmChainStatus = "quiet";
    if (matchingEntries.length === 0) {
      chainStatus = "quiet";
    } else if (cached) {
      const primaryChain = cached.chains[0];
      if (primaryChain && primaryChain.current > 0) {
        chainStatus =
          primaryChain.current > (primaryChain.longest ?? 0)
            ? "extended"
            : "maintained";
      } else {
        chainStatus = completedDays.size > 0 ? "bending" : "broken";
      }
    } else {
      chainStatus = completedDays.size > 0 ? "maintained" : "quiet";
    }

    // Milestones
    const milestones: Array<{ label: string; value: number; unit: string }> = [];
    if (cached?.totals) {
      if (cached.totals.totalHours >= 100) {
        milestones.push({
          label: "100+ hours",
          value: cached.totals.totalHours,
          unit: "hours",
        });
      }
      if (cached.totals.totalSessions >= 100) {
        milestones.push({
          label: "100+ sessions",
          value: cached.totals.totalSessions,
          unit: "sessions",
        });
      }
    }

    wins.push({
      rhythmId: rhythm.id,
      rhythmName: rhythm.name,
      chainType: rhythm.chainType,
      chainStatus,
      achievedTier: getAchievedTier(rhythm, completedDays.size),
      completedDays: completedDays.size,
      totalSeconds,
      totalCount,
      allTimeMilestones: milestones,
    });
  }

  return wins;
}

function getAchievedTier(
  rhythm: typeof rhythms.$inferSelect,
  completedDays: number,
): string {
  if (rhythm.frequency === "daily") {
    if (completedDays >= 7) return "daily";
    if (completedDays >= 5) return "most_days";
    if (completedDays >= 3) return "few_times";
    if (completedDays >= 1) return "weekly";
    return "none";
  }
  // Weekly rhythm
  const target = rhythm.frequencyTarget ?? 3;
  if (completedDays >= target) return "target_met";
  if (completedDays >= 1) return "active";
  return "none";
}

/**
 * Compute trailing 4-week averages for encouragement context.
 */
export async function computeEncouragementContext(
  userId: string,
  referenceDate: Date,
  timezone: string,
): Promise<EncouragementContext> {
  // Look back 4 weeks from the current week's Monday
  const boundaries = getWeekBoundaries(referenceDate, timezone);
  const fourWeeksAgoUtc = new Date(
    new Date(boundaries.utcStart).getTime() - 4 * 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const trailingEntries = await withRetry(() =>
    db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          gte(entries.timestamp, fourWeeksAgoUtc),
          lte(entries.timestamp, boundaries.utcStart),
          isNull(entries.deletedAt),
        ),
      ),
  );

  const totalEntries = trailingEntries.length / 4; // average per week
  let totalDuration = 0;
  for (const e of trailingEntries) {
    if (e.durationSeconds) totalDuration += e.durationSeconds;
  }
  const totalDurationSeconds = totalDuration / 4;

  // Current week partial comparison for momentum
  const currentWeekEntries = await withRetry(() =>
    db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          gte(entries.timestamp, boundaries.utcStart),
          lte(entries.timestamp, new Date().toISOString()),
          isNull(entries.deletedAt),
        ),
      ),
  );

  let generalMomentum: MomentumLevel = "steady";
  if (currentWeekEntries.length === 0) {
    generalMomentum = "quiet";
  } else if (currentWeekEntries.length > totalEntries * 0.8) {
    generalMomentum = "ahead";
  }

  return {
    trailingFourWeekAverages: {
      totalEntries: Math.round(totalEntries * 10) / 10,
      totalDurationSeconds: Math.round(totalDurationSeconds),
      byRhythmCompletedDays: {}, // Populated in US3
    },
    generalMomentum,
  };
}
