/**
 * Weekly message persistence service.
 *
 * Handles creating and retrieving weekly messages (celebrations and encouragements)
 * with idempotency guarantees.
 */

import { eq, and, desc, lte, isNull } from "drizzle-orm";
import { db } from "~/server/db";
import { withRetry } from "~/server/db/operations";
import { systemMessages } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import type { WeeklyMessageKind, SummaryBlock } from "~/types/weekly-rhythms";

const logger = createLogger("service:weekly-rhythms:messages");

interface PersistMessageInput {
  userId: string;
  snapshotId: string;
  kind: WeeklyMessageKind;
  weekStartDate: string;
  tierRequested: string;
  tierApplied: string;
  fallbackReason: string | null;
  title: string;
  summaryBlocks: SummaryBlock[];
  narrativeText: string | null;
  inAppVisibleFrom: string;
  scheduledDeliveryAt: string | null;
}

/**
 * Persist a weekly message. Returns existing message if one exists for the
 * same user/kind/weekStartDate (idempotent).
 */
export async function persistWeeklyMessage(
  input: PersistMessageInput,
): Promise<typeof systemMessages.$inferSelect> {
  // Check idempotency
  const existing = await getExistingMessage(
    input.userId,
    input.kind,
    input.weekStartDate,
  );
  if (existing) {
    logger.debug("Message already exists, returning existing", {
      userId: input.userId,
      kind: input.kind,
      week: input.weekStartDate,
    });
    return existing;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const [message] = await withRetry(() =>
    db
      .insert(systemMessages)
      .values({
        id,
        userId: input.userId,
        snapshotId: input.snapshotId,
        kind: input.kind,
        weekStartDate: input.weekStartDate,
        tierRequested: input.tierRequested,
        tierApplied: input.tierApplied,
        fallbackReason: input.fallbackReason,
        status: "generated",
        title: input.title,
        summaryBlocks: input.summaryBlocks,
        narrativeText: input.narrativeText,
        inAppVisibleFrom: input.inAppVisibleFrom,
        scheduledDeliveryAt: input.scheduledDeliveryAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning(),
  );

  logger.info("Weekly message persisted", {
    id,
    userId: input.userId,
    kind: input.kind,
    week: input.weekStartDate,
    tier: input.tierApplied,
  });

  return message!;
}

/**
 * Get an existing message for idempotency checks.
 */
export async function getExistingMessage(
  userId: string,
  kind: WeeklyMessageKind | string,
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

/**
 * Get active (non-dismissed) messages visible to the user.
 */
export async function getActiveMessages(
  userId: string,
  now: string = new Date().toISOString(),
) {
  return withRetry(() =>
    db
      .select()
      .from(systemMessages)
      .where(
        and(
          eq(systemMessages.userId, userId),
          lte(systemMessages.inAppVisibleFrom, now),
          isNull(systemMessages.dismissedAt),
        ),
      )
      .orderBy(desc(systemMessages.createdAt))
      .limit(10),
  );
}

/**
 * Get the most recent messages for history display.
 */
export async function getMessageHistory(
  userId: string,
  options: { kind?: WeeklyMessageKind; limit?: number } = {},
) {
  const { kind, limit = 8 } = options;
  const conditions = [eq(systemMessages.userId, userId)];
  if (kind) {
    conditions.push(eq(systemMessages.kind, kind));
  }

  return withRetry(() =>
    db
      .select()
      .from(systemMessages)
      .where(and(...conditions))
      .orderBy(desc(systemMessages.createdAt))
      .limit(Math.min(Math.max(limit, 1), 26)),
  );
}

/**
 * Dismiss an in-app message.
 */
export async function dismissMessage(messageId: string, userId: string) {
  const now = new Date().toISOString();
  return withRetry(() =>
    db
      .update(systemMessages)
      .set({
        dismissedAt: now,
        status: "dismissed",
        updatedAt: now,
      })
      .where(
        and(
          eq(systemMessages.id, messageId),
          eq(systemMessages.userId, userId),
        ),
      ),
  );
}
