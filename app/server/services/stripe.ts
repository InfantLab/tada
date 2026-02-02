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
 * Create a Stripe Checkout session for subscription.
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  username: string,
  plan: "monthly" | "yearly",
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { error: "Billing is not configured" };
  }

  const priceId =
    plan === "monthly"
      ? process.env["STRIPE_PRICE_ID_MONTHLY"]
      : process.env["STRIPE_PRICE_ID_YEARLY"];

  if (!priceId) {
    return { error: `Price ID not configured for ${plan} plan` };
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
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    logger.error("Webhook signature verification failed", {
      error: error instanceof Error ? error.message : "Unknown error",
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
    logger.error("Error processing webhook event", {
      error: error instanceof Error ? error.message : "Unknown error",
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
      subscriptionExpiresAt: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  await logSubscriptionEvent(userId, "created", event.id, {
    plan: subscription.items.data[0]?.price.id,
    customerId: session.customer,
  });

  logger.info("User upgraded to premium", { userId, sessionId: session.id });
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
      subscriptionExpiresAt: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  await logSubscriptionEvent(userId, "renewed", eventId, {
    status: subscription.status,
    periodEnd: subscription.current_period_end,
  });

  logger.info("Updated user subscription", { userId, status });
}
