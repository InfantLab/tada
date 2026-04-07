/**
 * Ourmoji daily ingestion + calendar integration tests.
 *
 * Consolidates the four test cases T017–T020 from the 013-ourmoji-module
 * task list into a single Nuxt setup() to avoid spinning up separate
 * dev servers per file:
 *
 *   T017 — POST /api/ourmoji/daily contract (auth, validation, success)
 *   T018 — GET  /api/ourmoji/calendar contract
 *   T019 — Per-date upsert (no duplicates)
 *   T020 — Feature-flag invisibility for disabled users
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setup, fetch } from "@nuxt/test-utils/e2e";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "~/server/db";
import {
  entries,
  sessions,
  userPreferences,
  users,
} from "~/server/db/schema";

describe("Ourmoji daily + calendar API", async () => {
  await setup({ server: true });

  const enabledUserId = nanoid();
  const disabledUserId = nanoid();
  const enabledSessionId = nanoid();
  const disabledSessionId = nanoid();
  let enabledCookie: string;
  let disabledCookie: string;

  beforeAll(async () => {
    const expiresAtSeconds = Math.floor(
      (Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000,
    );

    // Enabled user — has Ourmoji module flag set to true.
    await db.insert(users).values({
      id: enabledUserId,
      username: `ourmoji-on-${enabledUserId.slice(0, 6)}`,
      passwordHash: "test-hash",
      timezone: "UTC",
    });
    await db.insert(sessions).values({
      id: enabledSessionId,
      userId: enabledUserId,
      expiresAt: expiresAtSeconds,
    });
    await db.insert(userPreferences).values({
      id: nanoid(),
      userId: enabledUserId,
      enabledModules: { ourmoji: true },
    });
    enabledCookie = `auth_session=${enabledSessionId}`;

    // Disabled user — no Ourmoji flag.
    await db.insert(users).values({
      id: disabledUserId,
      username: `ourmoji-off-${disabledUserId.slice(0, 6)}`,
      passwordHash: "test-hash",
      timezone: "UTC",
    });
    await db.insert(sessions).values({
      id: disabledSessionId,
      userId: disabledUserId,
      expiresAt: expiresAtSeconds,
    });
    await db.insert(userPreferences).values({
      id: nanoid(),
      userId: disabledUserId,
      enabledModules: {},
    });
    disabledCookie = `auth_session=${disabledSessionId}`;
  });

  afterAll(async () => {
    for (const uid of [enabledUserId, disabledUserId]) {
      await db.delete(entries).where(eq(entries.userId, uid)).execute();
      await db
        .delete(userPreferences)
        .where(eq(userPreferences.userId, uid))
        .execute();
      await db.delete(sessions).where(eq(sessions.userId, uid)).execute();
      await db.delete(users).where(eq(users.id, uid)).execute();
    }
  });

  beforeEach(async () => {
    await db
      .delete(entries)
      .where(eq(entries.userId, enabledUserId))
      .execute();
  });

  const samplePayload = (overrides: Record<string, unknown> = {}) => ({
    date: "2026-04-07",
    emoji: "🦄",
    reflection: "A unicorn day — wonder and rare luck on the breeze.",
    moonPhase: "Waxing Crescent",
    moonIllumination: 22,
    wheelOfYear: null,
    wheelCategory: null,
    timezone: "UTC",
    ...overrides,
  });

  // -----------------------------------------------------------------------
  // T017 — POST /api/ourmoji/daily contract
  // -----------------------------------------------------------------------

  it("POST /api/ourmoji/daily requires authentication", async () => {
    const res = await fetch("/api/ourmoji/daily", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(samplePayload()),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/ourmoji/daily rejects invalid payloads with 400", async () => {
    const res = await fetch("/api/ourmoji/daily", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: enabledCookie,
      },
      body: JSON.stringify({ date: "not-a-date" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/ourmoji/daily creates an entry for an enabled user", async () => {
    const res = await fetch("/api/ourmoji/daily", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: enabledCookie,
      },
      body: JSON.stringify(samplePayload()),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entry: { date: string; emoji: string } };
    expect(body.entry.date).toBe("2026-04-07");
    expect(body.entry.emoji).toBe("🦄");
  });

  // -----------------------------------------------------------------------
  // T019 — Per-date upsert (no duplicates)
  // -----------------------------------------------------------------------

  it("POST /api/ourmoji/daily upserts on repeated date — no duplicate rows", async () => {
    const headers = {
      "content-type": "application/json",
      cookie: enabledCookie,
    };
    await fetch("/api/ourmoji/daily", {
      method: "POST",
      headers,
      body: JSON.stringify(samplePayload({ reflection: "first" })),
    });
    await fetch("/api/ourmoji/daily", {
      method: "POST",
      headers,
      body: JSON.stringify(samplePayload({ reflection: "second" })),
    });

    const rows = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, enabledUserId));
    expect(rows.length).toBe(1);
    expect((rows[0]!.data as { reflection: string }).reflection).toBe("second");
  });

  // -----------------------------------------------------------------------
  // T018 — GET /api/ourmoji/calendar contract
  // -----------------------------------------------------------------------

  it("GET /api/ourmoji/calendar returns recent entries for enabled user", async () => {
    const headers = {
      "content-type": "application/json",
      cookie: enabledCookie,
    };
    await fetch("/api/ourmoji/daily", {
      method: "POST",
      headers,
      body: JSON.stringify(samplePayload({ date: "2026-04-05", emoji: "🌊" })),
    });
    await fetch("/api/ourmoji/daily", {
      method: "POST",
      headers,
      body: JSON.stringify(samplePayload({ date: "2026-04-06", emoji: "🪞" })),
    });

    const res = await fetch("/api/ourmoji/calendar", {
      headers: { cookie: enabledCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      entries: Array<{ date: string; emoji: string }>;
    };
    expect(body.entries.length).toBe(2);
    // Newest first
    expect(body.entries[0]!.date).toBe("2026-04-06");
  });

  // -----------------------------------------------------------------------
  // T020 — Feature-flag invisibility for disabled users
  // -----------------------------------------------------------------------

  it("disabled user sees 404 from POST /api/ourmoji/daily", async () => {
    const res = await fetch("/api/ourmoji/daily", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: disabledCookie,
      },
      body: JSON.stringify(samplePayload()),
    });
    expect(res.status).toBe(404);
  });

  it("disabled user sees 404 from GET /api/ourmoji/calendar", async () => {
    const res = await fetch("/api/ourmoji/calendar", {
      headers: { cookie: disabledCookie },
    });
    expect(res.status).toBe(404);
  });
});
