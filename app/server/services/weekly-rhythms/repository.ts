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
  systemMessages,
  systemMessageDeliveries,
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
    db.query.systemMessages.findFirst({
      where: and(
        eq(systemMessages.userId, userId),
        eq(systemMessages.kind, kind),
        eq(systemMessages.weekStartDate, weekStartDate),
      ),
    }),
  );
}

export async function insertMessage(
  values: typeof systemMessages.$inferInsert,
) {
  return withRetry(() =>
    db.insert(systemMessages).values(values).returning(),
  );
}

export async function updateMessageStatus(
  messageId: string,
  updates: Partial<typeof systemMessages.$inferInsert>,
) {
  return withRetry(() =>
    db
      .update(systemMessages)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(systemMessages.id, messageId)),
  );
}

// ── Delivery Attempts ─────────────────────────────────────────────────────

export async function insertDeliveryAttempt(
  values: typeof systemMessageDeliveries.$inferInsert,
) {
  return withRetry(() =>
    db.insert(systemMessageDeliveries).values(values).returning(),
  );
}

export async function findDueRepository(status: string, _beforeUtc: string) {
  return withRetry(() =>
    db
      .select()
      .from(systemMessageDeliveries)
      .where(
        and(
          eq(systemMessageDeliveries.status, status),
        ),
      ),
  );
}

export async function upsertRepository() {
  // Placeholder for future use
  logger.debug("upsertRepository called — placeholder");
}
