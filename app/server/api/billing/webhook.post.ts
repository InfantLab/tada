/**
 * POST /api/billing/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle.
 *
 * Events handled:
 * - checkout.session.completed: User completed checkout
 * - customer.subscription.updated: Subscription changed
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.payment_failed: Payment failed
 * - invoice.paid: Payment succeeded
 *
 * IMPORTANT: This endpoint should NOT have any auth middleware.
 * Stripe signs the webhook payload and we verify it manually.
 */

import { handleWebhookEvent } from "~/server/services/stripe";
import { isBillingEnabled } from "~/server/utils/cloudMode";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:billing:webhook");

export default defineEventHandler(async (event) => {
  // Check if billing is enabled
  if (!isBillingEnabled()) {
    throw createError(
      apiError(event, "BILLING_NOT_CONFIGURED", "Billing is not enabled", 400)
    );
  }

  // Get the raw body for signature verification
  const body = await readRawBody(event);
  if (!body) {
    throw createError(
      apiError(event, "WEBHOOK_ERROR", "Missing request body", 400)
    );
  }

  // Get the Stripe signature header
  const signature = getHeader(event, "stripe-signature");
  if (!signature) {
    logger.warn("Webhook received without signature");
    throw createError(
      apiError(event, "WEBHOOK_ERROR", "Missing Stripe signature", 400)
    );
  }

  // Process the webhook
  const result = await handleWebhookEvent(body, signature);

  if (!result.success) {
    logger.error("Webhook processing failed", { message: result.message });
    throw createError(
      apiError(event, "WEBHOOK_ERROR", result.message, 400)
    );
  }

  // Return 200 to acknowledge receipt
  return { received: true };
});
