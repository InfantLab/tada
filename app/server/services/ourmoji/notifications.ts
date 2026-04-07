/**
 * Ourmoji nightly notification dispatch (US2, T047).
 *
 * Email-first per Decision 4 (research.md). The Receiver MUST be
 * blinded — their notification body never reveals the target emoji
 * or even whether the night is a control night. Only the Sender's
 * notification carries the target emoji.
 *
 * Delivery failures are logged + recorded against
 * `ourmoji_notification_deliveries` but do NOT raise — assignment
 * generation must remain idempotent and a flaky email path should
 * not block the scheduler sweep.
 */

import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { sendEmail, getAppUrl } from "~/server/utils/email";
import { recordDelivery } from "./delivery";
import { ourmojiChildLogger } from "./logger";
import type { OurmojiNightAssignment } from "~/server/db/schema";

const logger = ourmojiChildLogger("service:notifications");

export interface DispatchInput {
  assignment: OurmojiNightAssignment;
  /** User row of the participant this assignment belongs to. */
  recipientUserId: string;
}

/**
 * Dispatch the assignment notification to its recipient over email.
 * Returns true on success, false on any failure (already audited).
 */
export async function dispatchAssignmentNotification(
  input: DispatchInput,
): Promise<boolean> {
  const recipient = await loadUser(input.recipientUserId);
  if (!recipient?.email) {
    logger.warn("Recipient has no email; skipping dispatch", {
      assignmentId: input.assignment.id,
      userId: input.recipientUserId,
    });
    await recordDelivery({
      assignmentId: input.assignment.id,
      channel: "email",
      status: "failed",
      failureCode: "no_email",
      failureMessage: "Recipient has no email address",
    });
    return false;
  }

  const { subject, html, text } = buildBlindedEmail(
    input.assignment,
    recipient.username,
  );

  try {
    const sent = await sendEmail({
      to: recipient.email,
      subject,
      html,
      text,
    });
    if (!sent) {
      await recordDelivery({
        assignmentId: input.assignment.id,
        channel: "email",
        status: "failed",
        failureCode: "smtp_unconfigured",
        failureMessage: "sendEmail returned false",
      });
      return false;
    }
    await recordDelivery({
      assignmentId: input.assignment.id,
      channel: "email",
      status: "sent",
    });
    return true;
  } catch (err) {
    logger.error("Notification dispatch failed", err as Error);
    await recordDelivery({
      assignmentId: input.assignment.id,
      channel: "email",
      status: "failed",
      failureCode: "exception",
      failureMessage: (err as Error).message,
    });
    return false;
  }
}

async function loadUser(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Build the email body for an assignment.
 *
 * Blinding rules (FR-013, SC-006):
 *   - sender:   the body explicitly names the target emoji
 *   - receiver: NEVER mentions a target, never says "control" vs "send"
 *   - control:  receivers receive the same blinded body as on send nights
 *   - rest:     a brief rest-night note (no target, no flow link)
 */
export function buildBlindedEmail(
  assignment: OurmojiNightAssignment,
  username: string,
): EmailContent {
  const appUrl = getAppUrl();
  const flowUrl = `${appUrl}/ourmoji`;

  if (assignment.role === "sender") {
    const target = assignment.targetEmoji ?? "";
    const subject = `Tonight's Ourmoji target: ${target}`;
    const html = `
      <p>Hello ${username},</p>
      <p>Tonight's target emoji is <span style="font-size: 2rem">${target}</span>.</p>
      <p>Hold this image in your mind as you fall asleep. Don't tell anyone.</p>
      <p>— Ourmoji</p>
    `;
    return { subject, html, text: stripHtml(html) };
  }

  if (assignment.role === "rest") {
    const subject = "Tonight is a rest night";
    const html = `
      <p>Hello ${username},</p>
      <p>Tonight is a rest night — no Ourmoji assignment. Sleep well.</p>
      <p>— Ourmoji</p>
    `;
    return { subject, html, text: stripHtml(html) };
  }

  // Receivers (including the "control" double-receiver case) get the
  // same blinded body. Never mention target, condition, or sender.
  const subject = "Your Ourmoji morning awaits";
  const html = `
    <p>Hello ${username},</p>
    <p>Sleep on it. In the morning, open Ourmoji to record your dream and make your guess.</p>
    <p><a href="${flowUrl}">${flowUrl}</a></p>
    <p>— Ourmoji</p>
  `;
  return { subject, html, text: stripHtml(html) };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
