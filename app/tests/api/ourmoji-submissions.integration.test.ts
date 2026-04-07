/**
 * Ourmoji morning flow integration tests (US3).
 *
 * Consolidates T057-T060:
 *   T057 — GET /api/ourmoji/experiments/{id}/morning-prompt contract
 *   T058 — POST .../submissions/{assignmentId}/dream contract
 *   T059 — POST .../submissions/{assignmentId}/guess contract
 *   T060 — interruption-safe resume (refresh after dream lock drops
 *           the user into the guess step)
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
  ourmojiSubmissions,
  sessions,
  userPreferences,
  users,
} from "~/server/db/schema";

describe("Ourmoji morning flow API", async () => {
  await setup({ server: true });

  const aliceId = nanoid();
  const aliceSessionId = nanoid();
  let aliceCookie: string;
  let runId: string;
  let assignmentId: string;

  beforeAll(async () => {
    const expiresAt = Math.floor(
      (Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000,
    );

    await db.insert(users).values({
      id: aliceId,
      username: `alice-${aliceId.slice(0, 6)}`,
      email: "alice@example.test",
      passwordHash: "test-hash",
      timezone: "UTC",
    });
    await db.insert(userPreferences).values({
      id: nanoid(),
      userId: aliceId,
      enabledModules: { ourmoji: true },
    });
    await db.insert(sessions).values({
      id: aliceSessionId,
      userId: aliceId,
      expiresAt,
    });
    aliceCookie = `auth_session=${aliceSessionId}`;

    runId = nanoid();
    await db.insert(ourmojiExperimentRuns).values({
      id: runId,
      name: "T060 resume run",
      status: "active",
      startDate: "2026-04-10",
      endDate: "2026-04-24",
      earliestParticipantTimezone: "UTC",
      roleWeights: { send: 1, control: 0, rest: 0 },
      randomizationSeed: "fixed-seed-T060",
      createdBy: aliceId,
    });

    const participantId = nanoid();
    await db.insert(ourmojiExperimentParticipants).values({
      id: participantId,
      experimentRunId: runId,
      userId: aliceId,
      anonymousLabel: "participantA",
      timezoneAtJoin: "UTC",
    });

    assignmentId = nanoid();
    await db.insert(ourmojiNightAssignments).values({
      id: assignmentId,
      experimentRunId: runId,
      nightDate: "2026-04-12",
      participantId,
      role: "receiver",
      targetEmoji: "🦄",
      condition: "send",
      assignmentSeed: "fixed-seed-T060:2",
    });
  });

  afterAll(async () => {
    await db.delete(ourmojiSubmissions).execute();
    await db.delete(ourmojiNightAssignments).execute();
    await db.delete(ourmojiExperimentParticipants).execute();
    await db.delete(ourmojiExperimentRuns).execute();
    await db
      .delete(userPreferences)
      .where(eq(userPreferences.userId, aliceId))
      .execute();
    await db.delete(sessions).where(eq(sessions.userId, aliceId)).execute();
    await db.delete(users).where(eq(users.id, aliceId)).execute();
  });

  it("morning-prompt returns the open assignment in state=none", async () => {
    const res = await fetch(
      `/api/ourmoji/experiments/${runId}/morning-prompt`,
      { headers: { cookie: aliceCookie } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      prompt: { state: string; assignmentId: string } | null;
    };
    expect(body.prompt?.state).toBe("none");
    expect(body.prompt?.assignmentId).toBe(assignmentId);
    // Blinding: response must NOT include target or condition.
    expect(JSON.stringify(body)).not.toContain("🦄");
    expect(JSON.stringify(body)).not.toMatch(/target/i);
    expect(JSON.stringify(body)).not.toMatch(/condition/i);
  });

  it("dream submission locks the row and the prompt resumes at dream_locked", async () => {
    const dreamRes = await fetch(
      `/api/ourmoji/submissions/${assignmentId}/dream`,
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie: aliceCookie },
        body: JSON.stringify({
          dreamText: "I dreamed of a horse with a glowing horn.",
          capturedVia: "text",
        }),
      },
    );
    expect(dreamRes.status).toBe(200);

    // T060 — re-fetching the morning prompt drops the client into "guess".
    const promptRes = await fetch(
      `/api/ourmoji/experiments/${runId}/morning-prompt`,
      { headers: { cookie: aliceCookie } },
    );
    const promptBody = (await promptRes.json()) as {
      prompt: { state: string };
    };
    expect(promptBody.prompt.state).toBe("dream_locked");
  });

  it("guess submission completes the row and reveals the target only on send nights", async () => {
    const res = await fetch(
      `/api/ourmoji/submissions/${assignmentId}/guess`,
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie: aliceCookie },
        body: JSON.stringify({ guessEmoji: "🦄", guessConfidence: 4 }),
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      isHit: boolean | null;
      targetEmoji: string | null;
      condition: string;
    };
    expect(body.condition).toBe("send");
    expect(body.targetEmoji).toBe("🦄");
    expect(body.isHit).toBe(true);

    // After completion the prompt is gone.
    const promptRes = await fetch(
      `/api/ourmoji/experiments/${runId}/morning-prompt`,
      { headers: { cookie: aliceCookie } },
    );
    const promptBody = (await promptRes.json()) as {
      prompt: unknown;
    };
    expect(promptBody.prompt).toBeNull();
  });

  it("rejects guesses outside the Sacred Set", async () => {
    // Need a fresh assignment because the previous one is now complete.
    const fresh = nanoid();
    await db.insert(ourmojiNightAssignments).values({
      id: fresh,
      experimentRunId: runId,
      nightDate: "2026-04-13",
      participantId: (
        await db
          .select()
          .from(ourmojiExperimentParticipants)
          .where(eq(ourmojiExperimentParticipants.userId, aliceId))
          .limit(1)
      )[0]!.id,
      role: "receiver",
      targetEmoji: "🪞",
      condition: "send",
      assignmentSeed: "fixed-seed-T060:3",
    });
    await fetch(`/api/ourmoji/submissions/${fresh}/dream`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: aliceCookie },
      body: JSON.stringify({ dreamText: "x", capturedVia: "text" }),
    });
    const res = await fetch(`/api/ourmoji/submissions/${fresh}/guess`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: aliceCookie },
      body: JSON.stringify({ guessEmoji: "🍕", guessConfidence: 1 }),
    });
    expect(res.status).toBe(400);
  });
});
