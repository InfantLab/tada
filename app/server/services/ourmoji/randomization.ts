/**
 * Deterministic randomization for nightly Ourmoji assignments.
 *
 * Reproducibility (SC-005) requires that, given the same seed and night
 * index, the assignment algorithm always produces the same result. We use
 * a small SHA-256-based PRNG (no extra deps) — Web Crypto is available in
 * both the Nitro server runtime (Node 20+) and Bun.
 *
 * Algorithm: derive a 256-bit digest from `${seed}:${nightIndex}:${stream}`,
 * then read it as a sequence of 32-bit words for unbiased numeric draws.
 */

import { createHash } from "node:crypto";

import { SACRED_SET } from "~/utils/ourmoji/sacredSet";
import type { SacredSetEntry } from "~/utils/ourmoji/sacredSet";
import type {
  OurmojiAssignmentCondition,
  OurmojiAssignmentRole,
} from "~/server/db/schema";

export interface SeededRandom {
  /** Returns the next uint32. */
  nextUint32(): number;
  /** Returns the next float in [0, 1). */
  nextFloat(): number;
  /** Returns an integer in [0, max). */
  nextInt(max: number): number;
}

/**
 * Build a deterministic PRNG keyed on (seed, nightIndex, stream).
 * `stream` lets multiple independent draws share a seed without correlation.
 */
export function createSeededRandom(
  seed: string,
  nightIndex: number,
  stream = "default",
): SeededRandom {
  let counter = 0;
  let buffer: Buffer = refill();

  function refill(): Buffer {
    const hash = createHash("sha256");
    hash.update(`${seed}:${nightIndex}:${stream}:${counter++}`);
    return hash.digest();
  }

  let offset = 0;
  function nextUint32(): number {
    if (offset + 4 > buffer.length) {
      buffer = refill();
      offset = 0;
    }
    const v = buffer.readUInt32BE(offset);
    offset += 4;
    return v;
  }

  function nextFloat(): number {
    return nextUint32() / 0x1_0000_0000;
  }

  function nextInt(max: number): number {
    if (max <= 0) throw new Error("nextInt: max must be > 0");
    // Rejection sampling to avoid modulo bias.
    const limit = Math.floor(0x1_0000_0000 / max) * max;
    let v: number;
    do {
      v = nextUint32();
    } while (v >= limit);
    return v % max;
  }

  return { nextUint32, nextFloat, nextInt };
}

/**
 * Pick a Sacred Set emoji deterministically for a given (seed, nightIndex).
 */
export function pickTargetEmoji(
  seed: string,
  nightIndex: number,
): SacredSetEntry {
  const rng = createSeededRandom(seed, nightIndex, "target");
  return SACRED_SET[rng.nextInt(SACRED_SET.length)]!;
}

/**
 * Pick a condition (send / control / rest) for a given night using the
 * normalized role weights from an experiment run. Weights must sum to 1.
 */
export function pickCondition(
  seed: string,
  nightIndex: number,
  weights: { send: number; control: number; rest: number },
): OurmojiAssignmentCondition {
  const rng = createSeededRandom(seed, nightIndex, "condition");
  const r = rng.nextFloat();
  if (r < weights.send) return "send";
  if (r < weights.send + weights.control) return "control";
  return "rest";
}

/**
 * Given a condition and a list of participant ids, deterministically pick
 * roles for each participant for the given night. For two-participant runs:
 *   - send:    one sender, one receiver (random which is which)
 *   - control: both receivers
 *   - rest:    both rest
 */
export function assignRolesForNight(
  seed: string,
  nightIndex: number,
  condition: OurmojiAssignmentCondition,
  participantIds: string[],
): Map<string, OurmojiAssignmentRole> {
  const result = new Map<string, OurmojiAssignmentRole>();
  if (participantIds.length === 0) return result;

  if (condition === "rest") {
    for (const id of participantIds) result.set(id, "rest");
    return result;
  }

  if (condition === "control") {
    for (const id of participantIds) result.set(id, "receiver");
    return result;
  }

  // condition === "send": pick one sender deterministically.
  const rng = createSeededRandom(seed, nightIndex, "sender");
  const senderIndex = rng.nextInt(participantIds.length);
  participantIds.forEach((id, i) => {
    result.set(id, i === senderIndex ? "sender" : "receiver");
  });
  return result;
}
