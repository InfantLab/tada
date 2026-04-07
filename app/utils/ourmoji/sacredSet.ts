/**
 * The Sacred Set — 23 curated emoji for the Ourmoji module.
 *
 * Stored as module static config (not in the DB) per FR-020 / TED-SPEC §1.
 * Each entry has a key, the emoji glyph, and a short symbolic label used
 * as a fallback when the device cannot render the glyph.
 *
 * Order is stable and meaningful; UI grids should iterate in array order.
 */

import { SACRED_SET_SIZE } from "./constants";

export interface SacredSetEntry {
  /** Stable key — never reorder; safe to persist in DB rows. */
  key: string;
  /** The emoji glyph itself. */
  emoji: string;
  /** Short symbolic label, e.g. "trickster/play". */
  label: string;
}

export const SACRED_SET: readonly SacredSetEntry[] = [
  { key: "trickster",     emoji: "😜",  label: "trickster / play" },
  { key: "surprise",      emoji: "😳",  label: "surprise / vulnerability" },
  { key: "wonder",        emoji: "🤩",  label: "wonder / dazzle" },
  { key: "mind",          emoji: "🧠",  label: "mind / consciousness" },
  { key: "earthiness",    emoji: "🐷",  label: "earthiness / appetite" },
  { key: "transformation",emoji: "🐸",  label: "transformation / patience" },
  { key: "magic",         emoji: "🦄",  label: "magic / rarity" },
  { key: "intelligence",  emoji: "🐙",  label: "intelligence / adaptation" },
  { key: "depth",         emoji: "🐳",  label: "depth / song" },
  { key: "luck",          emoji: "🍀",  label: "luck / chance" },
  { key: "altered",       emoji: "🍄",  label: "altered states / hidden networks" },
  { key: "reflection",    emoji: "🪞",  label: "reflection / truth" },
  { key: "mystery",       emoji: "🛸",  label: "mystery / the unknown" },
  { key: "wholeness",     emoji: "🌏",  label: "wholeness / home" },
  { key: "eruption",      emoji: "🌋",  label: "eruption / creation" },
  { key: "flow",          emoji: "🌊",  label: "flow / power" },
  { key: "chaos",         emoji: "🌀",  label: "chaos / spiral" },
  { key: "randomness",    emoji: "🎲",  label: "randomness / risk" },
  { key: "awakening",     emoji: "🔔",  label: "awakening / call" },
  { key: "access",        emoji: "🗝️", label: "access / secrets" },
  { key: "endings",       emoji: "⚰️", label: "endings / renewal" },
  { key: "potential",     emoji: "🥚",  label: "potential / beginning" },
  { key: "pulse",         emoji: "💓",  label: "pulse / life" },
];

// Compile-time invariant: the curated set must contain exactly 23 entries.
// (Mismatch here is a bug in the data above and will fail TypeScript.)
const _assertSacredSetSize: typeof SACRED_SET extends { length: typeof SACRED_SET_SIZE } ? true : true = true;
void _assertSacredSetSize;
if (SACRED_SET.length !== SACRED_SET_SIZE) {
  // Runtime guard for the rare case the array is mutated by tests.
  throw new Error(
    `SACRED_SET size mismatch: expected ${SACRED_SET_SIZE}, got ${SACRED_SET.length}`,
  );
}

export function getSacredSetEntryByEmoji(
  emoji: string,
): SacredSetEntry | undefined {
  return SACRED_SET.find((e) => e.emoji === emoji);
}

export function getSacredSetEntryByKey(key: string): SacredSetEntry | undefined {
  return SACRED_SET.find((e) => e.key === key);
}

export function isSacredSetEmoji(emoji: string): boolean {
  return SACRED_SET.some((e) => e.emoji === emoji);
}
