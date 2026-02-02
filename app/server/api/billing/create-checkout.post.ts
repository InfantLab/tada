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
}

export default defineEventHandler(async (event) => {
  // Require authentication
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  // Check if billing is enabled
  if (!isBillingEnabled()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Billing is not enabled",
    });
  }

  const userId = event.context.user.id;

  // Get user details
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  // In cloud mode, require verified email
  if (isCloudMode() && !user.emailVerified) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please verify your email before upgrading",
    });
  }

  // Require email to be set
  if (!user.email) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please add an email address before upgrading",
    });
  }

  // Check if already premium
  if (user.subscriptionTier === "premium" && user.subscriptionStatus === "active") {
    throw createError({
      statusCode: 400,
      statusMessage: "You already have an active subscription",
    });
  }

  // Parse request body
  const body = await readBody<CreateCheckoutBody>(event);

  if (!body.plan || !["monthly", "yearly"].includes(body.plan)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid plan. Must be 'monthly' or 'yearly'",
    });
  }

  // Create checkout session
  const appUrl = getAppUrl();
  const result = await createCheckoutSession(
    userId,
    user.email,
    user.username,
    body.plan,
    `${appUrl}/account?success=true`,
    `${appUrl}/account?canceled=true`
  );

  if ("error" in result) {
    logger.error("Failed to create checkout session", {
      error: result.error,
      userId,
    });
    throw createError({
      statusCode: 500,
      statusMessage: result.error,
    });
  }

  return {
    url: result.url,
  };
});
