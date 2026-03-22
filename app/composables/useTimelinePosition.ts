import { CATEGORY_DEFAULTS, DEFAULT_COLOR } from "~/utils/categoryDefaults";

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
  }): TimelineEntry {
    const dot = isDot(entry.type, entry.durationSeconds);
    const position = getPosition(entry.timestamp);
    const width = dot
      ? 0
      : entry.durationSeconds
        ? getClippedWidth(entry.timestamp, entry.durationSeconds)
        : 0;

    return {
      id: entry.id,
      positionPercent: position,
      widthPercent: width,
      isDot: dot,
      color: getColor(entry.category),
      type: entry.type,
    };
  }

  return {
    getPosition,
    getWidth,
    getClippedWidth,
    isDot,
    getColor,
    toTimelineEntry,
  };
}
