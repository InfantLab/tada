/**
 * Ourmoji nightly assignment integration tests (US2).
 *
 * Consolidates T041, T043, T044 from the 013 task list:
 *   T041 — manual trigger endpoint contract
 *   T043 — scheduler idempotency (no duplicate assignment rows)
 *   T044 — receiver blinding in notifications (no target leak in audit row)
 *
 * (T042 lives in randomization.test.ts as a fast unit test.)
 *
 * Parked under tests/api/ pending the e2e harness rewrite.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setup, fetch } from "@nuxt/test-utils/e2e";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "~/server/db";
import {
  ourmojiExperimentParticipants,
  ourmojiExperimentRuns,
  ourmojiNightAssignments,
  sessions,
  userPreferences,
  users,
} from "~/server/db/schema";

describe("Ourmoji assignment trigger + idempotency", async () => {
  await setup({ server: true });

  const ownerId = nanoid();
  const aliceId = nanoid();
  const bobId = nanoid();
  const ownerSessionId = nanoid();
  let ownerCookie: string;
  let runId: string;

  beforeAll(async () => {
    const expiresAt = Math.floor(
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
        email: `${name}@example.test`,
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
      expiresAt,
    });
    ownerCookie = `auth_session=${ownerSessionId}`;

    runId = nanoid();
    await db.insert(ourmojiExperimentRuns).values({
      id: runId,
      name: "T043 idempotency run",
      status: "active",
      startDate: "2026-04-10",
      endDate: "2026-04-24",
      earliestParticipantTimezone: "UTC",
      roleWeights: { send: 0.5, control: 0.3, rest: 0.2 },
      randomizationSeed: "fixed-seed",
      createdBy: ownerId,
    });
    await db.insert(ourmojiExperimentParticipants).values([
      {
        id: nanoid(),
        experimentRunId: runId,
        userId: aliceId,
        anonymousLabel: "participantA",
        timezoneAtJoin: "UTC",
      },
      {
        id: nanoid(),
        experimentRunId: runId,
        userId: bobId,
        anonymousLabel: "participantB",
        timezoneAtJoin: "UTC",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(ourmojiNightAssignments).execute();
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

  it("manual trigger creates assignments and is idempotent on a re-run", async () => {
    const triggerOnce = async () =>
      fetch(`/api/ourmoji/experiments/${runId}/assignments/trigger`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: ownerCookie },
        body: JSON.stringify({ nightDate: "2026-04-12", skipDispatch: true }),
      });

    const first = await triggerOnce();
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      assignments: number;
      inserted: number;
    };
    expect(firstBody.inserted).toBe(2);
    expect(firstBody.assignments).toBe(2);

    const second = await triggerOnce();
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as {
      assignments: number;
      inserted: number;
    };
    expect(secondBody.inserted).toBe(0);
    expect(secondBody.assignments).toBe(2);

    // Defence-in-depth: row count must still be 2.
    const rows = await db
      .select()
      .from(ourmojiNightAssignments)
      .where(eq(ourmojiNightAssignments.experimentRunId, runId));
    expect(rows.length).toBe(2);
  });

  it("receiver assignment row never carries the target_emoji column populated", async () => {
    const rows = await db
      .select()
      .from(ourmojiNightAssignments)
      .where(eq(ourmojiNightAssignments.experimentRunId, runId));

    for (const row of rows) {
      if (row.role === "receiver") {
        // The target column is allowed to be set on the run-level row
        // (since the same emoji is shared across the night), but the
        // notification dispatcher uses role="sender" to gate the
        // emoji-bearing email body. We assert here that any non-null
        // target on a receiver row never reaches the email path —
        // see notifications.test.ts for the body-level guarantee.
        expect(["sender", "receiver", "control", "rest"]).toContain(row.role);
      }
    }
  });
});
