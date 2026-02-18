/**
 * Stripe Service
 *
 * Provides Stripe integration for subscription billing.
 * All functions gracefully handle the case where Stripe is not configured.
 *
 * @see design/commercial.md for full architecture
 */

import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users, subscriptionEvents } from "~/server/db/schema";
import { isBillingEnabled } from "~/server/utils/cloudMode";
import { createLogger } from "~/server/utils/logger";
import { generateId } from "~/server/utils/tokens";
import { sendEmail, isEmailConfigured } from "~/server/utils/email";
import {
  supporterWelcomeEmail,
  subscriptionRenewedEmail,
  subscriptionCancelledEmail,
  paymentFailedEmail,
  paymentRecoveredEmail,
} from "~/server/templates/email";

const logger = createLogger("services:stripe");

// Lazy-initialized Stripe client
let stripeClient: Stripe | null = null;

/**
 * Get the Stripe client instance.
 * Returns null if Stripe is not configured.
 */
export function getStripe(): Stripe | null {
  if (!isBillingEnabled()) {
    return null;
  }

  if (!stripeClient) {
    const secretKey = process.env["STRIPE_SECRET_KEY"];
    if (!secretKey) {
      return null;
    }

    stripeClient = new Stripe(secretKey, {
      // Use the latest API version from the installed package
      typescript: true,
    });
  }

  return stripeClient;
}

/**
 * Get or create a Stripe customer for a user.
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  username: string
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) {
    return null;
  }

  // Check if user already has a Stripe customer ID
  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new customer
  try {
    const customer = await stripe.customers.create({
      email,
      name: username,
      metadata: {
        userId,
        source: "tada",
      },
    });

    // Store customer ID
    await db
      .update(users)
      .set({
        stripeCustomerId: customer.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    logger.info("Created Stripe customer", { userId, customerId: customer.id });

    return customer.id;
  } catch (error) {
    logger.error("Failed to create Stripe customer", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId,
    });
    return null;
  }
}

/**
 * Get the subscription period end as an ISO string.
 * In Stripe API 2026-01-28+, current_period_end moved from subscription
 * top-level to subscription.items.data[].current_period_end.
 */
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string {
  // Try new location first (items), then legacy top-level
  const periodEnd =
    subscription.items?.data?.[0]?.current_period_end ??
    (subscription as Record<string, unknown>)["current_period_end"];

  if (typeof periodEnd === "number" && periodEnd > 0) {
    return new Date(periodEnd * 1000).toISOString();
  }

  // Fallback: 1 year from now
  logger.warn("Could not determine subscription period end, using 1 year default");
  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Get the Stripe Price ID for a given amount (yearly only).
 * Maps amounts to named support levels in environment variables.
 *
 * Support levels:
 *   £1/yr  → Seedling  (STRIPE_PRICE_SEEDLING)
 *   £5/yr  → Sapling   (STRIPE_PRICE_SAPLING)
 *   £12/yr → Oak       (STRIPE_PRICE_OAK)
 *   £25/yr → Redwood   (STRIPE_PRICE_REDWOOD)
 *   £50/yr → Forest    (STRIPE_PRICE_FOREST)
 */
function getPriceId(amount: number): string | undefined {
  const priceMap: Record<number, string> = {
    1: "STRIPE_PRICE_SEEDLING",
    5: "STRIPE_PRICE_SAPLING",
    12: "STRIPE_PRICE_OAK",
    25: "STRIPE_PRICE_REDWOOD",
    50: "STRIPE_PRICE_FOREST",
  };

  const envVarName = priceMap[amount];
  if (!envVarName) {
    return undefined;
  }

  return process.env[envVarName];
}

/**
 * Create a Stripe Checkout session for subscription.
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  username: string,
  plan: "monthly" | "yearly",
  amount: number,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { error: "Billing is not configured" };
  }

  // Only yearly plans are supported
  if (plan !== "yearly") {
    return { error: "Only yearly subscriptions are supported" };
  }

  const priceId = getPriceId(amount);

  if (!priceId) {
    return { error: `Price ID not configured for yearly plan at £${amount}. Please set STRIPE_PRICE_ID_YEARLY_${amount} in environment variables.` };
  }

  try {
    // Get or create customer
    const customerId = await getOrCreateCustomer(userId, email, username);
    if (!customerId) {
      return { error: "Failed to create customer" };
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          userId,
        },
      },
      metadata: {
        userId,
      },
    });

    if (!session.url) {
      return { error: "Failed to create checkout session" };
    }

    logger.info("Created checkout session", {
      userId,
      sessionId: session.id,
      plan,
    });

    return { url: session.url };
  } catch (error) {
    logger.error("Failed to create checkout session", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId,
    });
    return { error: "Failed to create checkout session" };
  }
}

/**
 * Create a Stripe Customer Portal session.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { error: "Billing is not configured" };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    logger.error("Failed to create portal session", {
      error: error instanceof Error ? error.message : "Unknown error",
      customerId,
    });
    return { error: "Failed to create portal session" };
  }
}

/**
 * Log a subscription event for audit trail.
 */
export async function logSubscriptionEvent(
  userId: string,
  eventType: string,
  stripeEventId?: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(subscriptionEvents).values({
      id: generateId(),
      userId,
      eventType,
      stripeEventId: stripeEventId || null,
      data: data || null,
    });
  } catch (error) {
    logger.error("Failed to log subscription event", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId,
      eventType,
    });
  }
}

/**
 * Handle Stripe webhook events.
 */
export async function handleWebhookEvent(
  payload: string,
  signature: string
): Promise<{ success: boolean; message: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { success: false, message: "Billing is not configured" };
  }

  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!webhookSecret) {
    return { success: false, message: "Webhook secret not configured" };
  }

  let event: Stripe.Event;

  try {
    // Use async version - Bun's SubtleCrypto doesn't support synchronous HMAC
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
    logger.error("Webhook signature verification failed", {
      error: errorMessage,
      secretPrefix: webhookSecret.substring(0, 10) + "...",
    });
    return { success: false, message: "Invalid signature" };
  }

  logger.info("Processing webhook event", {
    type: event.type,
    id: event.id,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(event);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event);
        break;

      case "invoice.paid":
        await handlePaymentSucceeded(event);
        break;

      default:
        logger.info("Unhandled webhook event type", { type: event.type });
    }

    return { success: true, message: "Event processed" };
  } catch (error) {
    const errorMsg = error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
    logger.error("Error processing webhook event", error instanceof Error ? error : new Error(errorMsg), {
      type: event.type,
      id: event.id,
    });
    return { success: false, message: "Error processing event" };
  }
}

/**
 * Handle checkout.session.completed event.
 */
async function handleCheckoutComplete(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.["userId"];

  if (!userId) {
    logger.error("Checkout session missing userId", { sessionId: session.id });
    return;
  }

  // Get subscription details
  const stripe = getStripe();
  if (!stripe || !session.subscription) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Update user to premium
  await db
    .update(users)
    .set({
      subscriptionTier: "premium",
      subscriptionStatus: "active",
      stripeCustomerId: session.customer as string,
      subscriptionExpiresAt: getSubscriptionPeriodEnd(subscription),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  await logSubscriptionEvent(userId, "created", event.id, {
    plan: subscription.items.data[0]?.price.id,
    customerId: session.customer,
  });

  logger.info("User upgraded to premium", { userId, sessionId: session.id });

  // Send supporter welcome email
  await sendSubscriptionEmail(userId, supporterWelcomeEmail);
}

/**
 * Handle customer.subscription.updated event.
 */
async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata?.["userId"];

  if (!userId) {
    // Try to find user by customer ID
    const customerId = subscription.customer as string;
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    if (!user) {
      logger.error("Could not find user for subscription", {
        subscriptionId: subscription.id,
        customerId,
      });
      return;
    }

    await updateUserSubscription(user.id, subscription, event.id);
  } else {
    await updateUserSubscription(userId, subscription, event.id);
  }
}

/**
 * Handle customer.subscription.deleted event.
 */
async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) {
    logger.error("Could not find user for deleted subscription", {
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  // Downgrade to free tier
  await db
    .update(users)
    .set({
      subscriptionTier: "free",
      subscriptionStatus: "cancelled",
      subscriptionExpiresAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, user.id));

  await logSubscriptionEvent(user.id, "cancelled", event.id);

  logger.info("User downgraded to free", { userId: user.id });

  // Send cancellation email
  await sendSubscriptionEmail(user.id, subscriptionCancelledEmail);
}

/**
 * Handle invoice.payment_failed event.
 */
async function handlePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) {
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionStatus: "past_due",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, user.id));

  await logSubscriptionEvent(user.id, "payment_failed", event.id);

  logger.warn("Payment failed for user", { userId: user.id });

  // Send payment failed email
  await sendSubscriptionEmail(user.id, paymentFailedEmail);
}

/**
 * Handle invoice.paid event.
 */
async function handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

  const [user] = await db
    .select({ id: users.id, subscriptionStatus: users.subscriptionStatus })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) {
    return;
  }

  // Only update if was past_due
  if (user.subscriptionStatus === "past_due") {
    await db
      .update(users)
      .set({
        subscriptionStatus: "active",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    await logSubscriptionEvent(user.id, "payment_succeeded", event.id);

    logger.info("Payment succeeded, status cleared", { userId: user.id });

    // Send payment recovered email
    await sendSubscriptionEmail(user.id, paymentRecoveredEmail);
  }
}

/**
 * Update user subscription from Stripe subscription object.
 */
async function updateUserSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  eventId: string
): Promise<void> {
  let status: "active" | "past_due" | "cancelled" | "expired" = "active";

  switch (subscription.status) {
    case "active":
    case "trialing":
      status = "active";
      break;
    case "past_due":
      status = "past_due";
      break;
    case "canceled":
    case "unpaid":
      status = "cancelled";
      break;
    default:
      status = "active";
  }

  await db
    .update(users)
    .set({
      subscriptionTier: status === "cancelled" ? "free" : "premium",
      subscriptionStatus: status,
      subscriptionExpiresAt: getSubscriptionPeriodEnd(subscription),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  await logSubscriptionEvent(userId, "renewed", eventId, {
    status: subscription.status,
    periodEnd: getSubscriptionPeriodEnd(subscription),
  });

  logger.info("Updated user subscription", { userId, status });

  // Send renewal email for active renewals (not downgrades)
  if (status === "active") {
    const nextDate = new Date(getSubscriptionPeriodEnd(subscription))
      .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    await sendSubscriptionEmailWithArgs(userId, (username) =>
      subscriptionRenewedEmail(username, nextDate),
    );
  }
}

/**
 * Helper: look up user email/username and send a subscription lifecycle email.
 * Silently fails if email not configured or user has no email.
 */
async function sendSubscriptionEmail(
  userId: string,
  templateFn: (username: string) => { subject: string; html: string; text: string },
): Promise<void> {
  await sendSubscriptionEmailWithArgs(userId, templateFn);
}

async function sendSubscriptionEmailWithArgs(
  userId: string,
  templateFn: (username: string) => { subject: string; html: string; text: string },
): Promise<void> {
  if (!isEmailConfigured()) return;

  try {
    const [user] = await db
      .select({ username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.email) {
      logger.debug("No email for user, skipping subscription email", { userId });
      return;
    }

    const emailContent = templateFn(user.username);
    const sent = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (sent) {
      logger.info("Sent subscription email", { userId, subject: emailContent.subject });
    }
  } catch (error) {
    logger.error("Failed to send subscription email", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId,
    });
  }
}
