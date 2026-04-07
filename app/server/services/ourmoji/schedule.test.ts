/**
 * Unit tests for the Ourmoji schedule helpers.
 *
 * The timezone-safe primitives are easy to get subtly wrong, so this
 * suite covers nightDateForAnchor, nightIndexForRun, and the
 * computeNextAnchorUtc round-trip across DST-friendly tzs.
 */

import { describe, expect, it } from "vitest";
import {
  computeNextAnchorUtc,
  nightDateForAnchor,
  nightIndexForRun,
} from "./schedule";

describe("nightIndexForRun", () => {
  it("returns 0 on the start date", () => {
    expect(nightIndexForRun("2026-04-10", "2026-04-10")).toBe(0);
  });
  it("counts whole days from start", () => {
    expect(nightIndexForRun("2026-04-10", "2026-04-12")).toBe(2);
    expect(nightIndexForRun("2026-04-10", "2026-04-24")).toBe(14);
  });
  it("returns negative for dates before start", () => {
    expect(nightIndexForRun("2026-04-10", "2026-04-09")).toBe(-1);
  });
});

describe("nightDateForAnchor", () => {
  it("returns the local YYYY-MM-DD for an anchor instant", () => {
    // 21:00 UTC on 2026-04-10 — same calendar day in UTC
    const anchor = new Date("2026-04-10T21:00:00Z");
    expect(nightDateForAnchor(anchor, "UTC")).toBe("2026-04-10");
  });
  it("respects America/Los_Angeles offset", () => {
    // 04:00 UTC on 2026-04-11 = 21:00 PDT on 2026-04-10
    const anchor = new Date("2026-04-11T04:00:00Z");
    expect(nightDateForAnchor(anchor, "America/Los_Angeles")).toBe("2026-04-10");
  });
});

describe("computeNextAnchorUtc", () => {
  it("returns today's 21:00 UTC when called before it", () => {
    const now = new Date("2026-04-10T15:00:00Z");
    const anchor = computeNextAnchorUtc(
      { earliestParticipantTimezone: "UTC" },
      now,
    );
    expect(anchor.toISOString()).toBe("2026-04-10T21:00:00.000Z");
  });

  it("rolls forward to tomorrow when called after today's anchor", () => {
    const now = new Date("2026-04-10T22:30:00Z");
    const anchor = computeNextAnchorUtc(
      { earliestParticipantTimezone: "UTC" },
      now,
    );
    expect(anchor.toISOString()).toBe("2026-04-11T21:00:00.000Z");
  });

  it("returns 21:00 local for non-UTC timezones", () => {
    // 21:00 in Europe/London is 20:00 UTC during BST (April).
    const now = new Date("2026-04-10T10:00:00Z");
    const anchor = computeNextAnchorUtc(
      { earliestParticipantTimezone: "Europe/London" },
      now,
    );
    // Round-trip through nightDateForAnchor: anchor's local date in
    // Europe/London should be 2026-04-10 and the local hour 21:00.
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(anchor).map((p) => [p.type, p.value]),
    );
    expect(`${parts["year"]}-${parts["month"]}-${parts["day"]}`).toBe(
      "2026-04-10",
    );
    expect(parts["hour"]).toBe("21");
    expect(parts["minute"]).toBe("00");
  });

  it("handles DST-affected timezones correctly", () => {
    // March 8, 2026 — US "spring forward" day. 21:00 PDT = 04:00 UTC next day.
    const now = new Date("2026-03-08T18:00:00Z");
    const anchor = computeNextAnchorUtc(
      { earliestParticipantTimezone: "America/Los_Angeles" },
      now,
    );
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(anchor).map((p) => [p.type, p.value]),
    );
    expect(parts["hour"]).toBe("21");
    expect(parts["minute"]).toBe("00");
  });
});
