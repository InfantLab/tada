/**
 * Rhythms Service
 *
 * Provides rhythm data with calculated statistics for API v1 endpoints.
 * Wraps existing rhythm calculation logic for API consumption.
 */

import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { rhythms, entries } from "~/server/db/schema";
import { withRetry } from "~/server/db/operations";
import type { Rhythm } from "~/server/db/schema";

interface PeriodStats {
  sessions: number;
  totalMinutes: number;
  averageDuration: number;
}

interface RhythmWithStats {
  id: string;
  name: string;
  description: string | null;
  goalType: string;
  goalValue: number;
  frequency: string;
  streak: {
    current: number;
    longest: number;
    lastCompleted: string | null;
    startedAt: string | null;
  };
  stats: {
    today: PeriodStats;
    thisWeek: PeriodStats;
    thisMonth: PeriodStats;
    allTime: PeriodStats;
  };
}

/**
 * Calculate period statistics for a rhythm
 */
async function calculatePeriodStats(
  rhythm: Rhythm,
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<PeriodStats> {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  // Build matching conditions
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

  // Query matching entries
  const matchingEntries = await withRetry(() =>
    db
      .select({
        durationSeconds: entries.durationSeconds,
      })
      .from(entries)
      .where(and(...conditions)),
  );

  const sessions = matchingEntries.length;
  const totalSeconds =
    matchingEntries.reduce(
      (sum, e) => sum + (e.durationSeconds || 0),
      0,
    );
  const totalMinutes = totalSeconds / 60;
  const averageDuration = sessions > 0 ? totalMinutes / sessions : 0;

  return {
    sessions,
    totalMinutes,
    averageDuration,
  };
}

/**
 * Get rhythms with calculated statistics for a user
 */
export async function getRhythmsWithStats(
  userId: string,
): Promise<RhythmWithStats[]> {
  // Get all rhythms for user
  const userRhythms = await withRetry(() =>
    db.query.rhythms.findMany({
      where: eq(rhythms.userId, userId),
      orderBy: [desc(rhythms.createdAt)],
    }),
  );

  const now = new Date();

  // Calculate stats for each rhythm
  const rhythmsWithStats: RhythmWithStats[] = [];

  for (const rhythm of userRhythms) {
    // Today's stats
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const todayStats = await calculatePeriodStats(
      rhythm,
      userId,
      todayStart,
      todayEnd,
    );

    // This week's stats (last 7 days)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekStats = await calculatePeriodStats(
      rhythm,
      userId,
      weekStart,
      now,
    );

    // This month's stats
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthStats = await calculatePeriodStats(
      rhythm,
      userId,
      monthStart,
      now,
    );

    // All time stats
    const allTimeStart = new Date(0); // Unix epoch

    const allTimeStats = await calculatePeriodStats(
      rhythm,
      userId,
      allTimeStart,
      now,
    );

    // Get streak data from cached stats or calculate
    let currentStreak = rhythm.currentStreak;
    let longestStreak = rhythm.longestStreak;
    let lastCompleted = rhythm.lastCompletedDate;
    let startedAt: string | null = null;

    // If cached chain stats exist, use them
    if (rhythm.cachedChainStats) {
      const cached = rhythm.cachedChainStats as any;
      if (cached.chains && cached.chains.length > 0) {
        const primaryChain = cached.chains[0];
        currentStreak = primaryChain.current || 0;
        longestStreak = primaryChain.longest || 0;
      }
      if (cached.currentChain) {
        lastCompleted = cached.currentChain.lastCompleteDate || null;
      }
      if (cached.totals?.firstEntryDate) {
        startedAt = cached.totals.firstEntryDate;
      }
    }

    rhythmsWithStats.push({
      id: rhythm.id,
      name: rhythm.name,
      description: rhythm.description,
      goalType: rhythm.goalType,
      goalValue: rhythm.goalValue,
      frequency: rhythm.frequency,
      streak: {
        current: currentStreak,
        longest: longestStreak,
        lastCompleted,
        startedAt,
      },
      stats: {
        today: todayStats,
        thisWeek: weekStats,
        thisMonth: monthStats,
        allTime: allTimeStats,
      },
    });
  }

  return rhythmsWithStats;
}

/**
 * Get a single rhythm with stats by ID
 */
export async function getRhythmById(
  rhythmId: string,
  userId: string,
): Promise<RhythmWithStats | null> {
  const allRhythms = await getRhythmsWithStats(userId);
  return allRhythms.find((r) => r.id === rhythmId) || null;
}
