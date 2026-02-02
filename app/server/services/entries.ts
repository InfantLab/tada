/**
 * Entry Service
 *
 * Provides CRUD operations for entries using Drizzle ORM.
 * Used by API v1 endpoints for entry management.
 */

import { eq, and, gte, lte, desc, asc, isNull, or, like, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { withRetry } from "~/server/db/operations";
import type { Entry, NewEntry } from "~/server/db/schema";
import type { EntryQueryParams } from "~/types/api";

/**
 * Get entries for a user with filtering, sorting, and pagination
 */
export async function getEntries(
  userId: string,
  params: EntryQueryParams = {},
) {
  const {
    date,
    start,
    end,
    type,
    category,
    subcategory,
    tags,
    search,
    limit = 100,
    offset = 0,
    sort = "timestamp",
    order = "desc",
  } = params;

  // Build where conditions
  const conditions = [
    eq(entries.userId, userId),
    isNull(entries.deletedAt), // Exclude soft-deleted entries
  ];

  // Date filter (specific day)
  if (date) {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    conditions.push(gte(entries.timestamp, startOfDay));
    conditions.push(lte(entries.timestamp, endOfDay));
  }

  // Date range filters
  if (start && !date) {
    conditions.push(gte(entries.timestamp, start));
  }
  if (end && !date) {
    conditions.push(lte(entries.timestamp, end));
  }

  // Type filter
  if (type) {
    conditions.push(eq(entries.type, type));
  }

  // Category filter
  if (category) {
    conditions.push(eq(entries.category, category));
  }

  // Subcategory filter
  if (subcategory) {
    conditions.push(eq(entries.subcategory, subcategory));
  }

  // Tags filter (contains any of the specified tags)
  if (tags) {
    const tagArray = tags.split(",").map((t) => t.trim());
    const tagConditions = tagArray.map((tag) =>
      sql`json_extract(${entries.tags}, '$') LIKE ${"%" + tag + "%"}`,
    );
    conditions.push(or(...tagConditions));
  }

  // Search filter (searches in name and notes)
  if (search) {
    conditions.push(
      or(
        like(entries.name, `%${search}%`),
        like(entries.notes, `%${search}%`),
      ),
    );
  }

  // Get total count for pagination
  const totalResult = await withRetry(() =>
    db
      .select({ count: sql<number>`count(*)` })
      .from(entries)
      .where(and(...conditions)),
  );

  const total = totalResult[0]?.count || 0;

  // Determine sort column and order
  const sortColumn =
    sort === "createdAt"
      ? entries.createdAt
      : sort === "durationSeconds"
        ? entries.durationSeconds
        : entries.timestamp;

  const orderFn = order === "asc" ? asc : desc;

  // Get entries with pagination
  const results = await withRetry(() =>
    db
      .select()
      .from(entries)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(Math.min(limit, 1000)) // Max 1000 items
      .offset(offset),
  );

  return {
    entries: results,
    total,
  };
}

/**
 * Get a single entry by ID
 */
export async function getEntryById(
  entryId: string,
  userId: string,
): Promise<Entry | null> {
  const result = await withRetry(() =>
    db.query.entries.findFirst({
      where: and(
        eq(entries.id, entryId),
        eq(entries.userId, userId),
        isNull(entries.deletedAt),
      ),
    }),
  );

  return result || null;
}

/**
 * Create a new entry
 */
export async function createEntry(data: NewEntry): Promise<Entry> {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const entryData: NewEntry = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await withRetry(() => db.insert(entries).values(entryData));

  // Fetch and return the created entry
  const created = await getEntryById(id, data.userId);

  if (!created) {
    throw new Error("Failed to create entry");
  }

  return created;
}

/**
 * Update an existing entry
 */
export async function updateEntry(
  entryId: string,
  userId: string,
  updates: Partial<NewEntry>,
): Promise<Entry | null> {
  const now = new Date().toISOString();

  // Don't allow updating these fields
  const { id, userId: _, createdAt, deletedAt, ...allowedUpdates } = updates as any;

  const updateData = {
    ...allowedUpdates,
    updatedAt: now,
  };

  await withRetry(() =>
    db
      .update(entries)
      .set(updateData)
      .where(
        and(
          eq(entries.id, entryId),
          eq(entries.userId, userId),
          isNull(entries.deletedAt),
        ),
      ),
  );

  return await getEntryById(entryId, userId);
}

/**
 * Soft delete an entry
 */
export async function deleteEntry(
  entryId: string,
  userId: string,
): Promise<boolean> {
  const now = new Date().toISOString();

  await withRetry(() =>
    db
      .update(entries)
      .set({ deletedAt: now })
      .where(
        and(
          eq(entries.id, entryId),
          eq(entries.userId, userId),
          isNull(entries.deletedAt),
        ),
      ),
  );

  return true;
}

/**
 * Bulk create entries
 */
export async function bulkCreateEntries(
  data: NewEntry[],
): Promise<{ created: number; failed: number }> {
  const now = new Date().toISOString();

  const entriesWithIds = data.map((entry) => ({
    ...entry,
    id: entry.id || crypto.randomUUID(),
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now,
  }));

  try {
    await withRetry(() => db.insert(entries).values(entriesWithIds));

    return {
      created: entriesWithIds.length,
      failed: 0,
    };
  } catch (error) {
    console.error("Bulk create entries failed:", error);
    return {
      created: 0,
      failed: entriesWithIds.length,
    };
  }
}

/**
 * Bulk update entries
 */
export async function bulkUpdateEntries(
  userId: string,
  updates: Array<{ id: string; data: Partial<NewEntry> }>,
): Promise<{ updated: number; failed: number }> {
  const now = new Date().toISOString();

  let updated = 0;
  let failed = 0;

  for (const update of updates) {
    try {
      const result = await updateEntry(userId, update.id, update.data);
      if (result) {
        updated++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
  }

  return { updated, failed };
}

/**
 * Bulk delete entries
 */
export async function bulkDeleteEntries(
  userId: string,
  entryIds: string[],
): Promise<{ deleted: number; failed: number }> {
  const now = new Date().toISOString();

  try {
    await withRetry(() =>
      db
        .update(entries)
        .set({ deletedAt: now })
        .where(
          and(
            eq(entries.userId, userId),
            sql`${entries.id} IN ${entryIds}`,
            isNull(entries.deletedAt),
          ),
        ),
    );

    return {
      deleted: entryIds.length,
      failed: 0,
    };
  } catch (error) {
    console.error("Bulk delete entries failed:", error);
    return {
      deleted: 0,
      failed: entryIds.length,
    };
  }
}
