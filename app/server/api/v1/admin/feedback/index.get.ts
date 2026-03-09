/**
 * GET /api/v1/admin/feedback
 *
 * List feedback submissions with filtering by status and type.
 */

import { z } from "zod";
import { requireAdmin } from "~/server/utils/admin";
import { paginated, validationError } from "~/server/utils/response";
import { db } from "~/server/db";
import { feedback, users } from "~/server/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

const querySchema = z.object({
  status: z
    .enum(["new", "reviewed", "in_progress", "resolved", "closed"])
    .optional(),
  type: z.enum(["bug", "feedback", "question"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:feedback");

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

  const { status, type, limit, offset } = parseResult.data;

  // Build conditions
  const conditions = [];
  if (status) conditions.push(eq(feedback.status, status));
  if (type) conditions.push(eq(feedback.type, type));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const totalResult = await db
    .select({ count: count() })
    .from(feedback)
    .where(whereClause);
  const total = totalResult[0]?.count ?? 0;

  // Fetch feedback with optional user info
  const results = await db
    .select({
      id: feedback.id,
      type: feedback.type,
      description: feedback.description,
      expectedBehavior: feedback.expectedBehavior,
      email: feedback.email,
      status: feedback.status,
      userId: feedback.userId,
      username: users.username,
      systemInfo: feedback.systemInfo,
      internalNotes: feedback.internalNotes,
      resolvedAt: feedback.resolvedAt,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    })
    .from(feedback)
    .leftJoin(users, eq(feedback.userId, users.id))
    .where(whereClause)
    .orderBy(desc(feedback.createdAt))
    .limit(limit)
    .offset(offset);

  return paginated(event, results, total, limit, offset);
});
