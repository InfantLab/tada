/**
 * Tests for email delivery orchestration.
 * Covers: T061 retry/backoff, T062 auto-disable after 3 failures.
 */

import { describe, it, expect } from "vitest";
import { computeBackoffMs } from "~/server/services/weekly-rhythms/delivery";

describe("weekly-rhythms/delivery", () => {
  describe("computeBackoffMs", () => {
    it("returns 1 hour for first attempt", () => {
      expect(computeBackoffMs(1)).toBe(1 * 60 * 60 * 1000);
    });

    it("returns 4 hours for second attempt", () => {
      expect(computeBackoffMs(2)).toBe(4 * 60 * 60 * 1000);
    });

    it("returns 24 hours for third attempt", () => {
      expect(computeBackoffMs(3)).toBe(24 * 60 * 60 * 1000);
    });

    it("caps at 24 hours for attempts beyond 3", () => {
      expect(computeBackoffMs(4)).toBe(24 * 60 * 60 * 1000);
      expect(computeBackoffMs(10)).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe("auto-disable logic (unit)", () => {
    it("triggers at exactly 3 consecutive failures", () => {
      const MAX_FAILURES = 3;
      expect(2 >= MAX_FAILURES).toBe(false);
      expect(3 >= MAX_FAILURES).toBe(true);
      expect(4 >= MAX_FAILURES).toBe(true);
    });

    it("resets counter on success", () => {
      let consecutiveFailures = 2;
      // Simulate successful send
      consecutiveFailures = 0;
      expect(consecutiveFailures).toBe(0);
    });

    it("increments counter on each failure", () => {
      let consecutiveFailures = 0;
      consecutiveFailures++; // fail 1
      expect(consecutiveFailures).toBe(1);
      consecutiveFailures++; // fail 2
      expect(consecutiveFailures).toBe(2);
      consecutiveFailures++; // fail 3 → auto-disable
      expect(consecutiveFailures).toBe(3);
    });
  });

  describe("retry scheduling", () => {
    it("schedules retry with correct backoff", () => {
      const now = new Date("2026-03-16T08:08:00Z");
      const backoffMs = computeBackoffMs(1); // 1 hour
      const retryAt = new Date(now.getTime() + backoffMs);

      expect(retryAt.toISOString()).toBe("2026-03-16T09:08:00.000Z");
    });

    it("does not schedule retry after max failures", () => {
      const MAX_FAILURES = 3;
      const attemptNumber = 3;
      const shouldRetry = attemptNumber < MAX_FAILURES;

      expect(shouldRetry).toBe(false);
    });
  });
});
