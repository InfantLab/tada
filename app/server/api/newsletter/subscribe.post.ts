import { eq } from "drizzle-orm";
import { newsletterSubscribers } from "~/server/db/schema";

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
    throw createError({
      statusCode: 400,
      message: "Email is required",
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      message: "Please enter a valid email address",
    });
  }

  const source = body?.source || "blog";
  const db = useDatabase();

  try {
    // Check if email already exists
    const existing = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .get();

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
    console.error("Newsletter subscription error:", error);
    throw createError({
      statusCode: 500,
      message: "Something went wrong. Please try again.",
    });
  }
});
