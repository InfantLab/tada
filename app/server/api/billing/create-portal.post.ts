/**
 * POST /api/billing/create-portal
 *
 * Creates a Stripe Customer Portal session.
 * Allows users to manage their subscription, update payment methods, etc.
 *
 * Requirements:
 * - Authenticated user
 * - User must have a Stripe customer ID
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { createPortalSession } from "~/server/services/stripe";
import { isBillingEnabled } from "~/server/utils/cloudMode";
import { getAppUrl } from "~/server/utils/email";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:billing:create-portal");

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

  // Get user with Stripe customer ID
  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.stripeCustomerId) {
    throw createError({
      statusCode: 400,
      statusMessage: "No billing account found. Please upgrade first.",
    });
  }

  // Create portal session
  const appUrl = getAppUrl();
  const result = await createPortalSession(
    user.stripeCustomerId,
    `${appUrl}/account`
  );

  if ("error" in result) {
    logger.error("Failed to create portal session", {
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
