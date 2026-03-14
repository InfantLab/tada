import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { newsletterSubscribers } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:newsletter");

/**
 * POST /api/newsletter/subscribe
 *
 * Subscribe an email to the newsletter.
 * No authentication required - public endpoint.
 *
 * Body:
 * - email: string (required) - Valid email address
 * - source: string (optional) - Where they signed up: 'blog', 'landing', 'footer'
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate email
  const email = body?.email?.trim()?.toLowerCase();
  if (!email) {
    throw createError(
      apiError(event, "EMAIL_REQUIRED", "Email is required", 400)
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError(
      apiError(event, "INVALID_EMAIL", "Please enter a valid email address", 400)
    );
  }

  const source = body?.source || "blog";

  try {
    // Check if email already exists
    const [existing] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1);

    if (existing) {
      // If already subscribed and active, just return success
      if (existing.status === "active") {
        return {
          success: true,
          message: "You're already subscribed!",
          alreadySubscribed: true,
        };
      }

      // If previously unsubscribed, reactivate
      await db
        .update(newsletterSubscribers)
        .set({
          status: "active",
          unsubscribedAt: null,
          unsubscribeReason: null,
        })
        .where(eq(newsletterSubscribers.id, existing.id));

      return {
        success: true,
        message: "Welcome back! You've been resubscribed.",
        resubscribed: true,
      };
    }

    // Create new subscriber
    const id = crypto.randomUUID();
    await db.insert(newsletterSubscribers).values({
      id,
      email,
      source,
      status: "active",
    });

    return {
      success: true,
      message: "Thanks for subscribing!",
    };
  } catch (error) {
    logger.error("Newsletter subscription error", error, { email });
    throw createError(internalError(event, "Something went wrong. Please try again."));
  }
});
