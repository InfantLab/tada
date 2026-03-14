/**
 * POST /api/billing/create-checkout
 *
 * Creates a Stripe Checkout session for subscription purchase.
 * Redirects the user to Stripe's hosted checkout page.
 *
 * Request body:
 * - plan: 'monthly' | 'yearly'
 *
 * Requirements:
 * - Authenticated user
 * - Verified email (in cloud mode)
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { createCheckoutSession } from "~/server/services/stripe";
import { isBillingEnabled, isCloudMode } from "~/server/utils/cloudMode";
import { getAppUrl } from "~/server/utils/email";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:billing:create-checkout");

interface CreateCheckoutBody {
  plan: "monthly" | "yearly";
  amount?: number;
}

export default defineEventHandler(async (event) => {
  // Require authentication
  if (!event.context.user) {
    throw createError(
      unauthorized(event)
    );
  }

  // Check if billing is enabled
  if (!isBillingEnabled()) {
    throw createError(
      apiError(event, "BILLING_NOT_CONFIGURED", "Billing is not enabled", 400)
    );
  }

  const userId = event.context.user.id;

  // Get user details
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw createError(
      notFound(event, "User")
    );
  }

  // In cloud mode, require verified email
  if (isCloudMode() && !user.emailVerified) {
    throw createError(
      apiError(event, "EMAIL_NOT_VERIFIED", "Please verify your email before upgrading", 400)
    );
  }

  // Require email to be set
  if (!user.email) {
    throw createError(
      apiError(event, "EMAIL_REQUIRED", "Please add an email address before upgrading", 400)
    );
  }

  // Check if already premium
  if (user.subscriptionTier === "premium" && user.subscriptionStatus === "active") {
    throw createError(
      apiError(event, "ALREADY_SUBSCRIBED", "You already have an active subscription", 400)
    );
  }

  // Parse request body
  const body = await readBody<CreateCheckoutBody>(event);

  if (!body.plan || !["monthly", "yearly"].includes(body.plan)) {
    throw createError(
      apiError(event, "INVALID_PLAN", "Invalid plan. Must be 'monthly' or 'yearly'", 400)
    );
  }

  // Validate amount if provided (must be one of the valid support levels)
  const validAmounts = [1, 5, 12, 25, 50];
  if (body.amount && !validAmounts.includes(body.amount)) {
    throw createError(
      apiError(event, "INVALID_AMOUNT", `Invalid amount. Must be one of: ${validAmounts.join(", ")}`, 400)
    );
  }

  // Create checkout session
  const appUrl = getAppUrl();
  const result = await createCheckoutSession(
    userId,
    user.email,
    user.username,
    body.plan,
    body.amount || 12, // Default to Oak level (£12) if not specified
    `${appUrl}/account?success=true`,
    `${appUrl}/account?canceled=true`
  );

  if ("error" in result) {
    logger.error("Failed to create checkout session", {
      error: result.error,
      userId,
    });
    throw createError(
      internalError(event, "Failed to create checkout session")
    );
  }

  return {
    url: result.url,
  };
});
