/**
 * Unit tests for notification blinding (US2, FR-013, SC-006).
 *
 * The Receiver MUST NOT learn the target emoji or whether the night
 * is a "send" vs "control" condition until they submit their guess.
 * These tests freeze that contract at the email-body level.
 */

import { describe, expect, it } from "vitest";
import { buildBlindedEmail } from "./notifications";
import type { OurmojiNightAssignment } from "~/server/db/schema";

function makeAssignment(
  overrides: Partial<OurmojiNightAssignment>,
): OurmojiNightAssignment {
  return {
    id: "a1",
    experimentRunId: "r1",
    nightDate: "2026-04-10",
    participantId: "p1",
    role: "receiver",
    targetEmoji: null,
    condition: "send",
    assignmentSeed: "seed:0",
    createdAt: "2026-04-10T21:00:00Z",
    ...overrides,
  };
}

describe("buildBlindedEmail", () => {
  it("sender body names the target emoji", () => {
    const email = buildBlindedEmail(
      makeAssignment({
        role: "sender",
        condition: "send",
        targetEmoji: "🦄",
      }),
      "alice",
    );
    expect(email.subject).toContain("🦄");
    expect(email.html).toContain("🦄");
  });

  it("receiver body on a SEND night never mentions the target", () => {
    const email = buildBlindedEmail(
      makeAssignment({
        role: "receiver",
        condition: "send",
        targetEmoji: "🦄",
      }),
      "bob",
    );
    expect(email.subject).not.toContain("🦄");
    expect(email.html).not.toContain("🦄");
    expect(email.text).not.toContain("🦄");
  });

  it("receiver body on a CONTROL night looks identical to a SEND-night receiver body", () => {
    const send = buildBlindedEmail(
      makeAssignment({
        role: "receiver",
        condition: "send",
        targetEmoji: "🦄",
      }),
      "bob",
    );
    const control = buildBlindedEmail(
      makeAssignment({
        role: "receiver",
        condition: "control",
        targetEmoji: null,
      }),
      "bob",
    );
    expect(control.subject).toBe(send.subject);
    // Body shape must not leak the condition.
    expect(control.html).not.toMatch(/control/i);
    expect(control.text).not.toMatch(/control/i);
  });

  it("rest-night body explicitly says rest", () => {
    const email = buildBlindedEmail(
      makeAssignment({ role: "rest", condition: "rest", targetEmoji: null }),
      "carol",
    );
    expect(email.subject.toLowerCase()).toContain("rest");
  });
});
