/**
 * Unit tests for the deterministic Ourmoji randomization helpers.
 *
 * These cover the SC-005 reproducibility requirement: same seed +
 * night index must always produce the same draw.
 */

import { describe, expect, it } from "vitest";
import { SACRED_SET } from "~/utils/ourmoji/sacredSet";
import {
  assignRolesForNight,
  createSeededRandom,
  pickCondition,
  pickTargetEmoji,
} from "./randomization";

describe("createSeededRandom", () => {
  it("produces identical sequences for the same (seed, nightIndex, stream)", () => {
    const a = createSeededRandom("seed-x", 7, "test");
    const b = createSeededRandom("seed-x", 7, "test");
    const seqA = Array.from({ length: 16 }, () => a.nextUint32());
    const seqB = Array.from({ length: 16 }, () => b.nextUint32());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different streams with same seed", () => {
    const a = createSeededRandom("seed-x", 7, "alpha");
    const b = createSeededRandom("seed-x", 7, "beta");
    const seqA = Array.from({ length: 8 }, () => a.nextUint32());
    const seqB = Array.from({ length: 8 }, () => b.nextUint32());
    expect(seqA).not.toEqual(seqB);
  });

  it("nextInt stays within [0, max)", () => {
    const rng = createSeededRandom("bounds", 1);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(23);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(23);
    }
  });

  it("nextFloat stays within [0, 1)", () => {
    const rng = createSeededRandom("floats", 1);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("pickTargetEmoji", () => {
  it("is deterministic per (seed, nightIndex)", () => {
    const a = pickTargetEmoji("seed-1", 3);
    const b = pickTargetEmoji("seed-1", 3);
    expect(a.key).toBe(b.key);
  });

  it("only ever returns Sacred Set members", () => {
    const keys = new Set(SACRED_SET.map((e) => e.key));
    for (let i = 0; i < 200; i++) {
      const pick = pickTargetEmoji("coverage", i);
      expect(keys.has(pick.key)).toBe(true);
    }
  });
});

describe("pickCondition", () => {
  it("respects role weights within tolerance", () => {
    const weights = { send: 0.5, control: 0.3, rest: 0.2 };
    const counts = { send: 0, control: 0, rest: 0 };
    const N = 5000;
    for (let i = 0; i < N; i++) {
      counts[pickCondition("dist", i, weights)]++;
    }
    expect(counts.send / N).toBeGreaterThan(0.45);
    expect(counts.send / N).toBeLessThan(0.55);
    expect(counts.control / N).toBeGreaterThan(0.25);
    expect(counts.control / N).toBeLessThan(0.35);
    expect(counts.rest / N).toBeGreaterThan(0.15);
    expect(counts.rest / N).toBeLessThan(0.25);
  });
});

describe("assignRolesForNight", () => {
  const participants = ["alice", "bob"];

  it("rest condition assigns rest to everyone", () => {
    const roles = assignRolesForNight("seed", 1, "rest", participants);
    expect(roles.get("alice")).toBe("rest");
    expect(roles.get("bob")).toBe("rest");
  });

  it("control condition assigns receiver to everyone", () => {
    const roles = assignRolesForNight("seed", 1, "control", participants);
    expect(roles.get("alice")).toBe("receiver");
    expect(roles.get("bob")).toBe("receiver");
  });

  it("send condition picks exactly one sender deterministically", () => {
    const a = assignRolesForNight("seed-x", 5, "send", participants);
    const b = assignRolesForNight("seed-x", 5, "send", participants);
    const senders = (m: Map<string, string>) =>
      [...m.values()].filter((r) => r === "sender").length;
    expect(senders(a)).toBe(1);
    expect(senders(b)).toBe(1);
    // Determinism: same seed + index produces same role mapping.
    expect(a.get("alice")).toBe(b.get("alice"));
    expect(a.get("bob")).toBe(b.get("bob"));
  });
});
