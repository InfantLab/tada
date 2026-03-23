import { CATEGORY_DEFAULTS, DEFAULT_COLOR, getEntryDisplayProps } from "~/utils/categoryDefaults";

const INSTANT_TYPES = new Set(["tada", "moment", "tally"]);
const DOT_THRESHOLD_SECONDS = 300; // 5 minutes
const MIN_BAR_PERCENT = 0.5;

export interface TimelineEntry {
  id: string;
  positionPercent: number;
  widthPercent: number;
  isDot: boolean;
  color: string;
  type: string;
  emoji: string;
  jitterYPx: number;
  jitterXPct: number;
}

export function useTimelinePosition(rangeStart: Date, rangeEnd: Date) {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  function getPosition(timestamp: string): number {
    const ts = new Date(timestamp).getTime();
    const clamped = Math.max(rangeStart.getTime(), Math.min(ts, rangeEnd.getTime()));
    return ((clamped - rangeStart.getTime()) / totalMs) * 100;
  }

  function getWidth(durationSeconds: number): number {
    const widthPercent = ((durationSeconds * 1000) / totalMs) * 100;
    return Math.max(widthPercent, MIN_BAR_PERCENT);
  }

  function getClippedWidth(timestamp: string, durationSeconds: number): number {
    const start = new Date(timestamp).getTime();
    const end = start + durationSeconds * 1000;
    const effectiveStart = Math.max(start, rangeStart.getTime());
    const effectiveEnd = Math.min(end, rangeEnd.getTime());
    const clippedMs = Math.max(0, effectiveEnd - effectiveStart);
    const widthPercent = (clippedMs / totalMs) * 100;
    return Math.max(widthPercent, MIN_BAR_PERCENT);
  }

  function isDot(type: string, durationSeconds?: number | null): boolean {
    if (INSTANT_TYPES.has(type)) return true;
    if (!durationSeconds || durationSeconds < DOT_THRESHOLD_SECONDS) return true;
    return false;
  }

  function getColor(category?: string | null): string {
    if (!category) return DEFAULT_COLOR;
    return CATEGORY_DEFAULTS[category]?.color ?? DEFAULT_COLOR;
  }

  function toTimelineEntry(entry: {
    id: string;
    type: string;
    timestamp: string;
    durationSeconds?: number | null;
    category?: string | null;
    subcategory?: string | null;
    emoji?: string | null;
  }): TimelineEntry {
    const dot = isDot(entry.type, entry.durationSeconds);
    const position = getPosition(entry.timestamp);
    const width = dot
      ? 0
      : entry.durationSeconds
        ? getClippedWidth(entry.timestamp, entry.durationSeconds)
        : 0;

    const { emoji } = getEntryDisplayProps(entry);

    return {
      id: entry.id,
      positionPercent: position,
      widthPercent: width,
      isDot: dot,
      color: getColor(entry.category),
      type: entry.type,
      emoji,
      jitterYPx: 0, // computed after all entries via applyJitter
      jitterXPct: 0,
    };
  }

  /** Spread overlapping icons so they don't stack — small vertical nudge + horizontal fan-out. */
  function applyJitter(entries: TimelineEntry[]): TimelineEntry[] {
    const COLLISION_THRESHOLD = 1.5; // percent — icons closer than this collide
    const JITTER_Y_STEP = 3; // px vertical nudge per collision level
    const JITTER_X_STEP = 0.8; // percent horizontal fan-out per collision level

    // Sort by position so we can compare neighbours
    const sorted = [...entries].sort(
      (a, b) => a.positionPercent - b.positionPercent,
    );

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const gap = curr.positionPercent - (prev.positionPercent + prev.jitterXPct);
      if (gap < COLLISION_THRESHOLD) {
        // Alternate up/down from centre, fan out horizontally
        const level = prev.jitterYPx <= 0
          ? Math.abs(prev.jitterYPx) / JITTER_Y_STEP + 1
          : -(Math.abs(prev.jitterYPx) / JITTER_Y_STEP);
        curr.jitterYPx = level * JITTER_Y_STEP;
        curr.jitterXPct = Math.abs(level) * JITTER_X_STEP;
      }
    }
    return sorted;
  }

  return {
    getPosition,
    getWidth,
    getClippedWidth,
    isDot,
    getColor,
    toTimelineEntry,
    applyJitter,
  };
}
