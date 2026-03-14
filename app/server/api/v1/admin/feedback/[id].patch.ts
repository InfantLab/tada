/**
 * PATCH /api/v1/admin/feedback/:id
 *
 * Update feedback status, add internal notes, and optionally send a reply email.
 */

import { z } from "zod";
import { requireAdmin } from "~/server/utils/admin";
import { success, notFound, validationError } from "~/server/utils/response";
import { logAuthEvent } from "~/server/utils/authEvents";
import { db } from "~/server/db";
import { feedback } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { sendEmail, isEmailConfigured } from "~/server/utils/email";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:admin:feedback");

const bodySchema = z
  .object({
    status: z
      .enum(["new", "reviewed", "in_progress", "resolved", "closed"])
      .optional(),
    internalNotes: z.string().optional(),
    replyEmail: z.string().optional(),
  })
  .strict();

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:feedback");

  const feedbackId = getRouterParam(event, "id");
  if (!feedbackId) {
    throw createError(notFound(event, "Feedback"));
  }

  const body = await readBody(event);
  const parseResult = bodySchema.safeParse(body);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    throw createError(validationError(event, errors));
  }

  const { status, internalNotes, replyEmail } = parseResult.data;

  if (!status && !internalNotes && !replyEmail) {
    throw createError(apiError(event, "NO_FIELDS", "No fields to update"));
  }

  // Fetch existing feedback
  const existing = await db
    .select()
    .from(feedback)
    .where(eq(feedback.id, feedbackId))
    .limit(1);

  if (existing.length === 0) {
    throw createError(notFound(event, "Feedback"));
  }

  const feedbackItem = existing[0]!;
  let emailSent = false;

  // Send reply email if requested
  if (replyEmail) {
    const recipientEmail = feedbackItem.email;
    if (!recipientEmail) {
      throw createError(apiError(event, "NO_EMAIL", "Feedback has no associated email address"));
    }

    if (isEmailConfigured()) {
      const sent = await sendEmail({
        to: recipientEmail,
        subject: `Re: Your ${feedbackItem.type} report — Ta-Da!`,
        text: replyEmail,
        html: `<p>${replyEmail.replace(/\n/g, "<br>")}</p>`,
      });

      if (sent) {
        emailSent = true;
      } else {
        logger.error("Failed to send feedback reply email", {
          feedbackId,
          email: recipientEmail,
        });
      }
    } else {
      logger.warn("SMTP not configured, skipping feedback reply email", {
        feedbackId,
      });
    }
  }

  // Build update fields
  const updateFields: Record<string, unknown> = {
    updatedAt: sql`(datetime('now'))`,
  };

  if (status) {
    updateFields.status = status;
    if (status === "resolved") {
      updateFields.resolvedAt = sql`(datetime('now'))`;
    }
  }

  if (internalNotes !== undefined || replyEmail) {
    // Append reply to internal notes if email was sent
    let notes = internalNotes ?? feedbackItem.internalNotes ?? "";
    if (replyEmail && emailSent) {
      const timestamp = new Date().toISOString();
      const replyNote = `\n\n[${timestamp}] Email reply sent: ${replyEmail}`;
      notes = notes + replyNote;
    }
    updateFields.internalNotes = notes;
  }

  await db
    .update(feedback)
    .set(updateFields)
    .where(eq(feedback.id, feedbackId));

  // Fetch updated feedback
  const updated = await db
    .select()
    .from(feedback)
    .where(eq(feedback.id, feedbackId))
    .limit(1);

  const auth = event.context.auth!;
  await logAuthEvent({
    event,
    userId: auth.userId,
    eventType: "admin:feedback_updated",
    metadata: {
      feedbackId,
      changes: { status, internalNotes: !!internalNotes },
      replyEmailSent: emailSent,
    },
  });

  return success(event, updated[0], emailSent ? { emailSent: true } : undefined);
});
