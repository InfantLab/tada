/**
 * Ourmoji daily ingestion service.
 *
 * Daily Ourmoji entries are stored as rows in the existing `entries`
 * table with `type = 'ourmoji'`. Uniqueness per (userId, date) is
 * enforced at the service layer: a second submission for the same date
 * updates the existing row in place rather than creating a duplicate.
 *
 * The `data` JSON column carries the structured payload (emoji,
 * reflection, moon, wheel) — see `OurmojiDailyData` in `~/types/ourmoji`.
 */

import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "~/server/db";
import { entries, type Entry, type NewEntry } from "~/server/db/schema";
import type {
  OurmojiDailyCardDTO,
  OurmojiDailyData,
} from "~/types/ourmoji";
import { OURMOJI_ENTRY_TYPE } from "~/utils/ourmoji/constants";
import { ourmojiChildLogger } from "./logger";

const logger = ourmojiChildLogger("service:daily");

export interface DailyIngestInput {
  userId: string;
  date: string; // YYYY-MM-DD
  emoji: string;
  reflection: string;
  moonPhase: string;
  moonIllumination: number | null;
  wheelOfYear: string | null;
  wheelCategory: string | null;
  timezone: string;
  /** Source label — `manual` for in-app submissions, `api` for OpenClaw. */
  source?: "manual" | "api";
}

/**
 * Insert or update the Ourmoji entry for `userId` on `date`.
 * Idempotent per day: a re-post replaces the prior payload.
 */
export async function upsertDailyOurmoji(
  input: DailyIngestInput,
): Promise<OurmojiDailyCardDTO> {
  const data: OurmojiDailyData = {
    date: input.date,
    emoji: input.emoji,
    reflection: input.reflection,
    moonPhase: input.moonPhase,
    moonIllumination: input.moonIllumination,
    wheelOfYear: input.wheelOfYear,
    wheelCategory: input.wheelCategory,
  };

  const existing = await findDailyEntry(input.userId, input.date);

  if (existing) {
    logger.debug("Updating existing Ourmoji entry", {
      userId: input.userId,
      date: input.date,
      entryId: existing.id,
    });
    const [updated] = await db
      .update(entries)
      .set({
        emoji: input.emoji,
        notes: input.reflection,
        data: data as unknown as Record<string, unknown>,
        timezone: input.timezone,
        source: input.source ?? "api",
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(entries.id, existing.id))
      .returning();
    return rowToDTO(updated!);
  }

  logger.debug("Inserting new Ourmoji entry", {
    userId: input.userId,
    date: input.date,
  });

  const newRow: NewEntry = {
    id: nanoid(),
    userId: input.userId,
    type: OURMOJI_ENTRY_TYPE,
    name: "Ourmoji",
    emoji: input.emoji,
    notes: input.reflection,
    timestamp: `${input.date}T00:00:00Z`,
    timezone: input.timezone,
    data: data as unknown as Record<string, unknown>,
    source: input.source ?? "api",
  };

  const [created] = await db.insert(entries).values(newRow).returning();
  return rowToDTO(created!);
}

/**
 * Look up the Ourmoji entry for `userId` on `date` (YYYY-MM-DD), if any.
 *
 * Implementation note: the per-day uniqueness key lives in `data.date`,
 * not in a top-level column. We narrow with a timestamp range first
 * (cheap, indexed) and then filter rows whose JSON `date` matches.
 */
export async function findDailyEntry(
  userId: string,
  date: string,
): Promise<Entry | undefined> {
  const dayStart = `${date}T00:00:00Z`;
  const dayEnd = `${date}T23:59:59Z`;
  const candidates = await db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        eq(entries.type, OURMOJI_ENTRY_TYPE),
        isNull(entries.deletedAt),
        gte(entries.timestamp, dayStart),
        lte(entries.timestamp, dayEnd),
      ),
    );
  return candidates.find((row) => {
    const d = (row.data as OurmojiDailyData | null)?.date;
    return d === date;
  });
}

/**
 * Fetch a date-range slice of Ourmoji entries for the given user, ordered
 * newest-first. `from` and `to` are inclusive YYYY-MM-DD bounds; either
 * may be omitted for an open-ended range.
 */
export async function listDailyEntries(
  userId: string,
  options: { from?: string; to?: string; limit?: number } = {},
): Promise<OurmojiDailyCardDTO[]> {
  const conditions = [
    eq(entries.userId, userId),
    eq(entries.type, OURMOJI_ENTRY_TYPE),
    isNull(entries.deletedAt),
  ];
  if (options.from) {
    conditions.push(gte(entries.timestamp, `${options.from}T00:00:00Z`));
  }
  if (options.to) {
    conditions.push(lte(entries.timestamp, `${options.to}T23:59:59Z`));
  }

  const rows = await db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(desc(entries.timestamp))
    .limit(options.limit ?? 200);

  return rows.map(rowToDTO);
}

function rowToDTO(row: Entry): OurmojiDailyCardDTO {
  const data = (row.data ?? {}) as Partial<OurmojiDailyData>;
  return {
    id: row.id,
    date: data.date ?? row.timestamp.slice(0, 10),
    emoji: data.emoji ?? row.emoji ?? "",
    reflection: data.reflection ?? row.notes ?? "",
    moonPhase: data.moonPhase ?? "",
    moonIllumination: data.moonIllumination ?? null,
    wheelOfYear: data.wheelOfYear ?? null,
    wheelCategory: data.wheelCategory ?? null,
    timestamp: row.timestamp,
    timezone: row.timezone,
  };
}
