/**
 * GET /api/v1/admin/users
 *
 * List users with filtering, sorting, search, and pagination.
 */

import { z } from "zod";
import { requireAdmin } from "~/server/utils/admin";
import { paginated, validationError } from "~/server/utils/response";
import { db } from "~/server/db";
import { users, entries, rhythms } from "~/server/db/schema";
import {
  eq,
  and,
  or,
  like,
  sql,
  asc,
  desc,
  count,
  isNull,
} from "drizzle-orm";

const querySchema = z.object({
  tier: z.enum(["free", "premium"]).optional(),
  status: z.enum(["active", "cancelled", "expired", "past_due", "suspended"]).optional(),
  search: z.string().optional(),
  sort: z.enum(["createdAt", "username", "lastActiveAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:users");

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

  const { tier, status, search, sort, order, limit, offset } = parseResult.data;

  // Build conditions
  const conditions = [];
  if (tier) {
    conditions.push(eq(users.subscriptionTier, tier));
  }
  if (status) {
    conditions.push(eq(users.subscriptionStatus, status));
  }
  if (search) {
    conditions.push(
      or(
        like(users.username, `%${search}%`),
        like(users.email, `%${search}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const totalResult = await db
    .select({ count: count() })
    .from(users)
    .where(whereClause);
  const total = totalResult[0]?.count ?? 0;

  // Build sort expression
  const orderFn = order === "asc" ? asc : desc;
  let orderExpr;
  if (sort === "lastActiveAt") {
    // Subquery for last entry timestamp
    orderExpr = orderFn(
      sql`(SELECT MAX(${entries.timestamp}) FROM ${entries} WHERE ${entries.userId} = ${users.id} AND ${entries.deletedAt} IS NULL)`,
    );
  } else if (sort === "username") {
    orderExpr = orderFn(users.username);
  } else {
    orderExpr = orderFn(users.createdAt);
  }

  // Fetch users with stats subqueries
  const results = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      emailVerified: users.emailVerified,
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      createdAt: users.createdAt,
      lastActiveAt: sql<string | null>`(SELECT MAX(${entries.timestamp}) FROM ${entries} WHERE ${entries.userId} = ${users.id} AND ${entries.deletedAt} IS NULL)`,
      entryCount: sql<number>`(SELECT COUNT(*) FROM ${entries} WHERE ${entries.userId} = ${users.id} AND ${entries.deletedAt} IS NULL)`,
      rhythmCount: sql<number>`(SELECT COUNT(*) FROM ${rhythms} WHERE ${rhythms.userId} = ${users.id})`,
    })
    .from(users)
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  const data = results.map((row) => ({
    id: row.id,
    username: row.username,
    email: row.email,
    emailVerified: row.emailVerified,
    subscriptionTier: row.subscriptionTier,
    subscriptionStatus: row.subscriptionStatus,
    createdAt: row.createdAt,
    lastActiveAt: row.lastActiveAt,
    stats: {
      entryCount: row.entryCount,
      rhythmCount: row.rhythmCount,
    },
  }));

  return paginated(event, data, total, limit, offset);
});
