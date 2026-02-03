/**
 * DELETE /api/account
 *
 * Permanently deletes the user's account and all associated data.
 * This action is irreversible.
 *
 * Steps:
 * 1. Validate user session
 * 2. Cancel any active Stripe subscription (cloud mode)
 * 3. Invalidate all user sessions
 * 4. Delete user record (cascades to all related data)
 */

import { defineEventHandler, createError, readBody } from "h3";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { lucia, validateSessionRequest } from "~/server/utils/auth";
import { getStripe, logSubscriptionEvent } from "~/server/services/stripe";
import { isCloudMode } from "~/server/utils/cloudMode";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:account:delete");

export default defineEventHandler(async (event) => {
  // Validate session
  const { user } = await validateSessionRequest(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  // Require confirmation phrase in body
  const body = await readBody(event);
  if (body?.confirmation !== "DELETE") {
    throw createError({
      statusCode: 400,
      statusMessage: "Please confirm deletion by sending confirmation: 'DELETE'",
    });
  }

  const userId = user.id;

  logger.info("Account deletion requested", { userId, username: user.username });

  try {
    // Step 1: Cancel Stripe subscription if in cloud mode
    if (isCloudMode()) {
      const [dbUser] = await db
        .select({ stripeCustomerId: users.stripeCustomerId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (dbUser?.stripeCustomerId) {
        const stripe = getStripe();
        if (stripe) {
          try {
            // List active subscriptions for this customer
            const subscriptions = await stripe.subscriptions.list({
              customer: dbUser.stripeCustomerId,
              status: "active",
            });

            // Cancel all active subscriptions
            for (const subscription of subscriptions.data) {
              await stripe.subscriptions.cancel(subscription.id);
              logger.info("Cancelled Stripe subscription", {
                userId,
                subscriptionId: subscription.id,
              });
            }

            // Log the account deletion event before we delete the user
            await logSubscriptionEvent(userId, "account_deleted", undefined, {
              reason: "user_requested",
            });
          } catch (stripeError) {
            logger.error("Failed to cancel Stripe subscription", {
              userId,
              error: stripeError instanceof Error ? stripeError.message : "Unknown error",
            });
            // Continue with deletion even if Stripe fails
            // The subscription will eventually expire and Stripe webhooks
            // will fail gracefully since the user no longer exists
          }
        }
      }
    }

    // Step 2: Invalidate all user sessions
    await lucia.invalidateUserSessions(userId);
    logger.info("Invalidated all user sessions", { userId });

    // Step 3: Delete the user (cascade handles all related data)
    await db.delete(users).where(eq(users.id, userId));
    logger.info("User account deleted", { userId, username: user.username });

    // Step 4: Clear session cookie
    const blankCookie = lucia.createBlankSessionCookie();
    setCookie(
      event,
      blankCookie.name,
      blankCookie.value,
      blankCookie.attributes
    );

    return {
      success: true,
      message: "Account deleted successfully",
    };
  } catch (error) {
    logger.error("Failed to delete account", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete account",
    });
  }
});
