/**
 * Admin endpoint to send a test email
 *
 * POST /api/v1/admin/test-email
 * Body: { to: string, template: "verify" | "welcome" | "reset" | "changed" | "supporter" | "cancelled" | "payment-failed" | "payment-recovered" | "renewed" }
 *
 * Requires admin access.
 */

import { sendEmail, isEmailConfigured } from "~/server/utils/email";
import {
  emailVerificationEmail,
  welcomeEmail,
  passwordResetEmail,
  passwordChangedEmail,
  supporterWelcomeEmail,
  subscriptionRenewedEmail,
  subscriptionCancelledEmail,
  paymentFailedEmail,
  paymentRecoveredEmail,
} from "~/server/templates/email";
import { requireAdmin } from "~/server/utils/admin";
import { success } from "~/server/utils/response";

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:health");

  const body = await readBody(event);
  const to = body?.to as string;
  const template = (body?.template as string) || "verify";

  if (!to || !to.includes("@")) {
    throw createError({
      statusCode: 400,
      message: "Valid email address required",
    });
  }

  if (!isEmailConfigured()) {
    throw createError({
      statusCode: 503,
      message: "SMTP not configured",
    });
  }

  const auth = event.context.auth;
  const username = "friend";

  // Generate email content based on template
  let emailContent: { subject: string; html: string; text: string };

  switch (template) {
    case "verify":
      emailContent = emailVerificationEmail(username, "test-token-preview");
      break;
    case "welcome":
      emailContent = welcomeEmail(username);
      break;
    case "reset":
      emailContent = passwordResetEmail(username, "test-token-preview");
      break;
    case "changed":
      emailContent = passwordChangedEmail(username);
      break;
    case "supporter":
      emailContent = supporterWelcomeEmail(username);
      break;
    case "renewed":
      emailContent = subscriptionRenewedEmail(username, "February 18, 2027");
      break;
    case "cancelled":
      emailContent = subscriptionCancelledEmail(username);
      break;
    case "payment-failed":
      emailContent = paymentFailedEmail(username);
      break;
    case "payment-recovered":
      emailContent = paymentRecoveredEmail(username);
      break;
    default:
      throw createError({
        statusCode: 400,
        message: `Unknown template: ${template}`,
      });
  }

  const sent = await sendEmail({
    to,
    subject: `[TEST] ${emailContent.subject}`,
    html: emailContent.html,
    text: emailContent.text,
  });

  if (!sent) {
    throw createError({
      statusCode: 500,
      message: "Failed to send email",
    });
  }

  return success(event, {
    message: `Test "${template}" email sent to ${to}`,
  });
});
