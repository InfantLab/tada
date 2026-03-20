/**
 * Base repository helpers for weekly-rhythms records.
 * Wraps Drizzle ORM operations with withRetry for consistency.
 */

import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";
import { withRetry } from "~/server/db/operations";
import {
  weeklyRhythmSettings,
  weeklyStatsSnapshots,
  weeklyMessages,
  weeklyDeliveryAttempts,
} from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("service:weekly-rhythms:repository");

// ── Settings ──────────────────────────────────────────────────────────────

export async function findSettingsByUserId(userId: string) {
  return withRetry(() =>
    db.query.weeklyRhythmSettings.findFirst({
      where: eq(weeklyRhythmSettings.userId, userId),
    }),
  );
}

export async function findAllEnabledSettings() {
  return withRetry(() =>
    db
      .select()
      .from(weeklyRhythmSettings)
      .where(
        eq(weeklyRhythmSettings.celebrationEnabled, true),
      ),
  );
}

// ── Snapshots ─────────────────────────────────────────────────────────────

export async function findSnapshot(
  userId: string,
  kind: string,
  weekStartDate: string,
) {
  return withRetry(() =>
    db.query.weeklyStatsSnapshots.findFirst({
      where: and(
        eq(weeklyStatsSnapshots.userId, userId),
        eq(weeklyStatsSnapshots.kind, kind),
        eq(weeklyStatsSnapshots.weekStartDate, weekStartDate),
      ),
    }),
  );
}

export async function insertSnapshot(
  values: typeof weeklyStatsSnapshots.$inferInsert,
) {
  return withRetry(() =>
    db.insert(weeklyStatsSnapshots).values(values).returning(),
  );
}

// ── Messages ──────────────────────────────────────────────────────────────

export async function findMessage(
  userId: string,
  kind: string,
  weekStartDate: string,
) {
  return withRetry(() =>
    db.query.weeklyMessages.findFirst({
      where: and(
        eq(weeklyMessages.userId, userId),
        eq(weeklyMessages.kind, kind),
        eq(weeklyMessages.weekStartDate, weekStartDate),
      ),
    }),
  );
}

export async function insertMessage(
  values: typeof weeklyMessages.$inferInsert,
) {
  return withRetry(() =>
    db.insert(weeklyMessages).values(values).returning(),
  );
}

export async function updateMessageStatus(
  messageId: string,
  updates: Partial<typeof weeklyMessages.$inferInsert>,
) {
  return withRetry(() =>
    db
      .update(weeklyMessages)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(weeklyMessages.id, messageId)),
  );
}

// ── Delivery Attempts ─────────────────────────────────────────────────────

export async function insertDeliveryAttempt(
  values: typeof weeklyDeliveryAttempts.$inferInsert,
) {
  return withRetry(() =>
    db.insert(weeklyDeliveryAttempts).values(values).returning(),
  );
}

export async function findDueRepository(status: string, _beforeUtc: string) {
  return withRetry(() =>
    db
      .select()
      .from(weeklyDeliveryAttempts)
      .where(
        and(
          eq(weeklyDeliveryAttempts.status, status),
        ),
      ),
  );
}

export async function upsertRepository() {
  // Placeholder for future use
  logger.debug("upsertRepository called — placeholder");
}
