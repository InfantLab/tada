/**
 * GET /api/v1/admin/activity
 *
 * Site-wide activity feed showing recent signups, subscription changes,
 * and notable events.
 */

import { z } from "zod";
import { requireAdmin } from "~/server/utils/admin";
import { paginated, validationError } from "~/server/utils/response";
import { db } from "~/server/db";
import { authEvents, subscriptionEvents, users } from "~/server/db/schema";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";

const querySchema = z.object({
  type: z.enum(["signup", "subscription", "login", "password_reset"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Map activity types to auth event types
const AUTH_EVENT_MAP: Record<string, string[]> = {
  signup: ["register"],
  login: ["login"],
  password_reset: ["password_reset_request", "password_reset_complete"],
};

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:activity");

  const rawQuery = getQuery(event);
  const parseResult = querySchema.safeParse(rawQuery);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    throw createError(validationError(event, errors));
  }

  const { type, limit, offset } = parseResult.data;

  if (type === "subscription") {
    // Subscription events come from a different table
    return await getSubscriptionActivity(event, limit, offset);
  }

  // Auth events (signups, logins, password resets)
  const eventTypes = type
    ? AUTH_EVENT_MAP[type] || [type]
    : [...AUTH_EVENT_MAP.signup, ...AUTH_EVENT_MAP.login, ...AUTH_EVENT_MAP.password_reset];

  // Count total
  const totalResult = await db
    .select({ count: count() })
    .from(authEvents)
    .where(inArray(authEvents.eventType, eventTypes));

  const total = totalResult[0]?.count ?? 0;

  // Fetch events with user info
  const results = await db
    .select({
      eventType: authEvents.eventType,
      timestamp: authEvents.createdAt,
      userId: authEvents.userId,
      username: users.username,
      metadata: authEvents.metadata,
    })
    .from(authEvents)
    .leftJoin(users, eq(authEvents.userId, users.id))
    .where(inArray(authEvents.eventType, eventTypes))
    .orderBy(desc(authEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const data = results.map((row) => ({
    type: mapEventType(row.eventType),
    timestamp: row.timestamp,
    user: row.userId
      ? { id: row.userId, username: row.username || "unknown" }
      : null,
    details: row.metadata || {},
  }));

  return paginated(event, data, total, limit, offset);
});

async function getSubscriptionActivity(
  event: any,
  limit: number,
  offset: number,
) {
  const totalResult = await db
    .select({ count: count() })
    .from(subscriptionEvents);

  const total = totalResult[0]?.count ?? 0;

  const results = await db
    .select({
      eventType: subscriptionEvents.eventType,
      timestamp: subscriptionEvents.createdAt,
      userId: subscriptionEvents.userId,
      username: users.username,
      data: subscriptionEvents.data,
    })
    .from(subscriptionEvents)
    .leftJoin(users, eq(subscriptionEvents.userId, users.id))
    .orderBy(desc(subscriptionEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const data = results.map((row) => ({
    type: "subscription" as const,
    timestamp: row.timestamp,
    user: { id: row.userId, username: row.username || "unknown" },
    details: {
      event: row.eventType,
      ...(row.data as Record<string, unknown> || {}),
    },
  }));

  return paginated(event, data, total, limit, offset);
}

function mapEventType(eventType: string): string {
  switch (eventType) {
    case "register":
      return "signup";
    case "login":
      return "login";
    case "password_reset_request":
    case "password_reset_complete":
      return "password_reset";
    default:
      return eventType;
  }
}
