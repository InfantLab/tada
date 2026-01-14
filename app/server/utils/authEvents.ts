/**
 * Auth event logging for audit trail
 */

import type { H3Event } from "h3";
import { getHeader } from "h3";
import { db } from "~/server/db";
import { authEvents } from "~/server/db/schema";
import { generateId } from "./tokens";
import { createLogger } from "./logger";

const logger = createLogger("auth:events");

export type AuthEventType =
  | "login"
  | "login_failed"
  | "logout"
  | "register"
  | "password_change"
  | "password_reset_request"
  | "password_reset_complete"
  | "email_verification"
  | "email_change";

interface LogAuthEventOptions {
  event: H3Event;
  userId?: string | null;
  eventType: AuthEventType;
  metadata?: Record<string, unknown>;
}

/**
 * Extract client IP from request
 */
function getClientIp(event: H3Event): string | null {
  // Check common proxy headers
  const forwardedFor = getHeader(event, "x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  const realIp = getHeader(event, "x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to direct connection (may not be available in all environments)
  return null;
}

/**
 * Log an authentication event for audit trail
 */
export async function logAuthEvent(
  options: LogAuthEventOptions
): Promise<void> {
  const { event, userId, eventType, metadata } = options;

  try {
    const ipAddress = getClientIp(event);
    const userAgent = getHeader(event, "user-agent") || null;

    await db.insert(authEvents).values({
      id: generateId(),
      userId: userId || null,
      eventType,
      ipAddress,
      userAgent,
      metadata: metadata || null,
    });

    logger.debug("Auth event logged", {
      eventType,
      userId: userId || "anonymous",
    });
  } catch (error) {
    // Don't fail the request if logging fails
    logger.error("Failed to log auth event", {
      eventType,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Rate limiting helper for password reset requests
 * Returns true if request should be blocked
 */
export async function isRateLimited(
  email: string,
  windowMinutes: number = 1
): Promise<boolean> {
  // Check recent password reset requests for this email
  // This is a simple in-memory implementation
  // For production, consider using Redis or database-based rate limiting

  const key = `reset:${email.toLowerCase()}`;
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  // Simple in-memory rate limit store
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, now);
    return false;
  }

  const lastRequest = rateLimitStore.get(key)!;
  if (now - lastRequest < windowMs) {
    return true;
  }

  rateLimitStore.set(key, now);
  return false;
}

// Simple in-memory rate limit store (consider Redis for multi-instance deployments)
const rateLimitStore = new Map<string, number>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  for (const [key, timestamp] of rateLimitStore.entries()) {
    if (now - timestamp > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes
