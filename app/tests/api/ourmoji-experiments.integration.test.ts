/**
 * Ourmoji experiment lifecycle integration tests (US4).
 *
 * Consolidates T029–T032 from the 013-ourmoji-module task list:
 *   T029 — POST /api/ourmoji/experiments contract
 *   T030 — GET  /api/ourmoji/experiments contract
 *   T031 — pause/resume contract
 *   T032 — one-active-experiment-per-user guard
 *
 * Lives under tests/api/, which is currently parked from the standard
 * vitest run pending the @nuxt/test-utils e2e harness rewrite.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setup, fetch } from "@nuxt/test-utils/e2e";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "~/server/db";
import {
  ourmojiExperimentParticipants,
  ourmojiExperimentRuns,
  sessions,
  userPreferences,
  users,
} from "~/server/db/schema";

describe("Ourmoji experiment lifecycle API", async () => {
  await setup({ server: true });

  const ownerId = nanoid();
  const aliceId = nanoid();
  const bobId = nanoid();
  const ownerSessionId = nanoid();
  let ownerCookie: string;

  beforeAll(async () => {
    const expiresAtSeconds = Math.floor(
      (Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000,
    );

    for (const [id, name] of [
      [ownerId, "owner"],
      [aliceId, "alice"],
      [bobId, "bob"],
    ] as const) {
      await db.insert(users).values({
        id,
        username: `${name}-${id.slice(0, 6)}`,
        passwordHash: "test-hash",
        timezone: "UTC",
      });
      await db.insert(userPreferences).values({
        id: nanoid(),
        userId: id,
        enabledModules: { ourmoji: true },
      });
    }

    await db.insert(sessions).values({
      id: ownerSessionId,
      userId: ownerId,
      expiresAt: expiresAtSeconds,
    });
    ownerCookie = `auth_session=${ownerSessionId}`;
  });

  afterAll(async () => {
    await db.delete(ourmojiExperimentParticipants).execute();
    await db.delete(ourmojiExperimentRuns).execute();
    for (const id of [ownerId, aliceId, bobId]) {
      await db
        .delete(userPreferences)
        .where(eq(userPreferences.userId, id))
        .execute();
      await db.delete(sessions).where(eq(sessions.userId, id)).execute();
      await db.delete(users).where(eq(users.id, id)).execute();
    }
  });

  function createPayload(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      name: "Test run",
      startDate: "2026-04-10",
      endDate: "2026-04-24",
      participantUserIds: [aliceId, bobId],
      ...overrides,
    };
  }

  it("POST /api/ourmoji/experiments creates a scheduled run", async () => {
    const res = await fetch("/api/ourmoji/experiments", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: ownerCookie },
      body: JSON.stringify(createPayload()),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      run: { id: string; status: string };
      participantIds: string[];
    };
    expect(body.run.status).toBe("scheduled");
    expect(body.participantIds.length).toBe(2);
  });

  it("GET /api/ourmoji/experiments lists runs", async () => {
    const res = await fetch("/api/ourmoji/experiments", {
      headers: { cookie: ownerCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runs: unknown[] };
    expect(body.runs.length).toBeGreaterThan(0);
  });

  it("rejects a second run that overlaps the same participants", async () => {
    const res = await fetch("/api/ourmoji/experiments", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: ownerCookie },
      body: JSON.stringify(
        createPayload({ name: "Conflicting run", startDate: "2026-05-01", endDate: "2026-05-15" }),
      ),
    });
    expect(res.status).toBe(403);
  });

  it("pause/resume transitions a run between active and paused", async () => {
    // Promote the most recent run to "active" directly so we can test the
    // pause/resume contract without waiting for the scheduler.
    const [run] = await db
      .select()
      .from(ourmojiExperimentRuns)
      .where(eq(ourmojiExperimentRuns.status, "scheduled"));
    if (!run) throw new Error("expected at least one scheduled run");
    await db
      .update(ourmojiExperimentRuns)
      .set({ status: "active" })
      .where(eq(ourmojiExperimentRuns.id, run.id))
      .execute();

    const pauseRes = await fetch(
      `/api/ourmoji/experiments/${run.id}/pause`,
      { method: "POST", headers: { cookie: ownerCookie } },
    );
    expect(pauseRes.status).toBe(200);

    const resumeRes = await fetch(
      `/api/ourmoji/experiments/${run.id}/resume`,
      { method: "POST", headers: { cookie: ownerCookie } },
    );
    expect(resumeRes.status).toBe(200);
  });
});
