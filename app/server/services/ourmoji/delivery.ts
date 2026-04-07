/**
 * Notification delivery audit persistence for Ourmoji.
 *
 * Records every dispatch attempt against the
 * `ourmoji_notification_deliveries` table. The notifications service
 * (`notifications.ts`) records one row per (assignment, channel,
 * attempt). Failures are not retried inline — a future scheduler tick
 * can pick up `status = 'failed'` rows.
 */

import { nanoid } from "nanoid";

import { insertDelivery } from "./repository";
import type {
  OurmojiDeliveryChannel,
  OurmojiDeliveryStatus,
} from "~/server/db/schema";

export interface RecordDeliveryInput {
  assignmentId: string;
  channel: OurmojiDeliveryChannel;
  status: OurmojiDeliveryStatus;
  attemptNumber?: number;
  scheduledFor?: string;
  failureCode?: string | null;
  failureMessage?: string | null;
}

export async function recordDelivery(input: RecordDeliveryInput) {
  const now = new Date().toISOString();
  return insertDelivery({
    id: nanoid(),
    assignmentId: input.assignmentId,
    channel: input.channel,
    status: input.status,
    attemptNumber: input.attemptNumber ?? 1,
    scheduledFor: input.scheduledFor ?? now,
    attemptedAt: input.status === "queued" ? null : now,
    failureCode: input.failureCode ?? null,
    failureMessage: input.failureMessage ?? null,
  });
}
