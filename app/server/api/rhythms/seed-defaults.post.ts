/**
 * POST /api/rhythms/seed-defaults - Create demo rhythms for new users
 *
 * Creates 3 starter rhythms to help new users understand how rhythms work:
 * - Meditation (timed, mindfulness, 6 min/day threshold)
 * - Press Ups (tally, movement, 5 reps/day threshold)
 * - Ta-das today! (activity/tada, just show up)
 *
 * Only creates if the user has 0 existing rhythms.
 */

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { rhythms } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:rhythms:seed-defaults");

const DEMO_RHYTHMS = [
  {
    name: "Meditation",
    matchType: "timed",
    matchCategory: "mindfulness",
    completionMode: "threshold",
    journeyThresholdType: "hours",
    durationThresholdSeconds: 360, // 6 minutes
    countThreshold: null,
    frequency: "daily",
    chainType: "daily",
    goalType: "duration",
    goalValue: 6,
    goalUnit: "minutes",
  },
  {
    name: "Press Ups",
    matchType: "tally",
    matchCategory: "movement",
    matchSubcategory: null,
    matchName: null,
    completionMode: "threshold",
    journeyThresholdType: "count",
    durationThresholdSeconds: 1,
    countThreshold: 5,
    frequency: "daily",
    chainType: "daily",
    goalType: "count",
    goalValue: 5,
    goalUnit: "reps",
  },
  {
    name: "Ta-das today!",
    matchType: "tada",
    matchCategory: null,
    completionMode: "session",
    journeyThresholdType: "sessions",
    durationThresholdSeconds: 0,
    countThreshold: null,
    frequency: "daily",
    chainType: "daily",
    goalType: "boolean",
    goalValue: 1,
    goalUnit: "sessions",
  },
];

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.userId) {
    throw createError(unauthorized(event));
  }

  const userId = session.userId;

  // Only seed if user has no rhythms
  const existing = await db
    .select({ id: rhythms.id })
    .from(rhythms)
    .where(eq(rhythms.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return { created: 0, message: "User already has rhythms" };
  }

  const now = new Date().toISOString();
  let created = 0;

  for (const demo of DEMO_RHYTHMS) {
    const id = randomUUID();
    await db.insert(rhythms).values({
      id,
      userId,
      name: demo.name,
      matchType: demo.matchType,
      matchCategory: demo.matchCategory ?? null,
      matchSubcategory: null,
      matchName: null,
      completionMode: demo.completionMode,
      journeyThresholdType: demo.journeyThresholdType,
      durationThresholdSeconds: demo.durationThresholdSeconds,
      countThreshold: demo.countThreshold,
      frequency: demo.frequency,
      frequencyTarget: null,
      chainType: demo.chainType,
      goalType: demo.goalType,
      goalValue: demo.goalValue,
      goalUnit: demo.goalUnit,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      panelPreferences: {
        showYearTracker: true,
        showMonthCalendar: true,
        showChainStats: true,
        monthViewMode: "calendar" as const,
        expandedByDefault: true,
      },
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }

  logger.info(`Seeded ${created} demo rhythms for user ${userId}`);
  return { created, message: `Created ${created} demo rhythms` };
});
