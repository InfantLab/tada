/**
 * GET /api/billing/status
 *
 * Returns the current user's billing/subscription status.
 * This is separate from /api/subscription/status which focuses on
 * usage limits. This endpoint is for billing-specific information.
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { isBillingEnabled, isCloudMode } from "~/server/utils/cloudMode";

export default defineEventHandler(async (event) => {
  // Require authentication
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const userId = event.context.user.id;

  // Get user with subscription fields
  const [user] = await db
    .select({
      email: users.email,
      emailVerified: users.emailVerified,
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      subscriptionExpiresAt: users.subscriptionExpiresAt,
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  // If billing is not enabled, return minimal response
  if (!isBillingEnabled()) {
    return {
      billingEnabled: false,
      cloudMode: isCloudMode(),
      tier: "unlimited",
      canUpgrade: false,
    };
  }

  const tier = user.subscriptionTier || "free";
  const status = user.subscriptionStatus || "active";
  const isPremium = tier === "premium" && status === "active";
  const hasStripeAccount = !!user.stripeCustomerId;

  // Determine if user can upgrade
  const canUpgrade = !isPremium && user.emailVerified && !!user.email;

  // Pricing info (could be fetched from Stripe in production)
  const pricing = {
    monthly: {
      price: 5,
      currency: "USD",
      interval: "month",
    },
    yearly: {
      price: 50,
      currency: "USD",
      interval: "year",
      savings: 10, // $10 saved vs monthly
    },
  };

  return {
    billingEnabled: true,
    cloudMode: isCloudMode(),
    tier,
    status,
    isPremium,
    canUpgrade,
    hasStripeAccount,
    expiresAt: user.subscriptionExpiresAt,
    pricing,
    email: user.email,
    emailVerified: user.emailVerified,
  };
});
