/**
 * Duration Parser
 *
 * Parses natural language duration strings to seconds and formats seconds to display.
 * Supports: "20", "20m", "1h 30m", "1:30:00", "90 minutes", etc.
 *
 * @module utils/durationParser
 */

// =============================================================================
// Types
// =============================================================================

export type DurationContext = "meditation" | "exercise" | "work" | "general";

export interface ParsedDuration {
  /** Duration in seconds */
  seconds: number;
  /** Original input string */
  input: string;
  /** Normalized display format ("1h 30m", "45m", "30s") */
  display: string;
  /** Parse confidence (1.0 = exact match, <1.0 = assumed) */
  confidence: number;
}

export interface DurationPreset {
  /** Duration in seconds */
  value: number;
  /** Display label ("20m", "1h") */
  label: string;
}

// =============================================================================
// Presets by Context
// =============================================================================

export const DURATION_PRESETS: Record<DurationContext, DurationPreset[]> = {
  meditation: [
    { value: 300, label: "5m" },
    { value: 600, label: "10m" },
    { value: 900, label: "15m" },
    { value: 1200, label: "20m" },
    { value: 1500, label: "25m" },
    { value: 1800, label: "30m" },
    { value: 2700, label: "45m" },
    { value: 3600, label: "1h" },
  ],
  exercise: [
    { value: 900, label: "15m" },
    { value: 1200, label: "20m" },
    { value: 1800, label: "30m" },
    { value: 2700, label: "45m" },
    { value: 3600, label: "1h" },
    { value: 5400, label: "90m" },
  ],
  work: [
    { value: 1500, label: "25m" }, // Pomodoro
    { value: 1800, label: "30m" },
    { value: 2700, label: "45m" },
    { value: 3600, label: "1h" },
    { value: 5400, label: "90m" },
    { value: 7200, label: "2h" },
  ],
  general: [
    { value: 300, label: "5m" },
    { value: 600, label: "10m" },
    { value: 900, label: "15m" },
    { value: 1200, label: "20m" },
    { value: 1800, label: "30m" },
    { value: 2700, label: "45m" },
    { value: 3600, label: "1h" },
  ],
};

// =============================================================================
// Parsing Patterns
// =============================================================================

// Order matters - more specific patterns first
const DURATION_PATTERNS: Array<{
  regex: RegExp;
  parse: (match: RegExpMatchArray) => number;
  confidence: number;
}> = [
  // HH:MM:SS format
  {
    regex: /^(\d{1,2}):(\d{2}):(\d{2})$/,
    parse: (m) => {
      const hours = parseInt(m[1] ?? "0", 10);
      const mins = parseInt(m[2] ?? "0", 10);
      const secs = parseInt(m[3] ?? "0", 10);
      return hours * 3600 + mins * 60 + secs;
    },
    confidence: 1.0,
  },
  // H:MM format (hours:minutes)
  {
    regex: /^(\d{1,2}):(\d{2})$/,
    parse: (m) => {
      const hours = parseInt(m[1] ?? "0", 10);
      const mins = parseInt(m[2] ?? "0", 10);
      return hours * 3600 + mins * 60;
    },
    confidence: 1.0,
  },
  // "1h 30m 45s" or variations
  {
    regex:
      /^(?:(\d+)\s*h(?:ours?|rs?|r)?)?\s*(?:(\d+)\s*m(?:ins?|inutes?)?)?\s*(?:(\d+)\s*s(?:ecs?|econds?)?)?$/i,
    parse: (m) => {
      const hours = parseInt(m[1] || "0", 10);
      const mins = parseInt(m[2] || "0", 10);
      const secs = parseInt(m[3] || "0", 10);
      return hours * 3600 + mins * 60 + secs;
    },
    confidence: 1.0,
  },
  // "90 minutes" or "90 mins"
  {
    regex: /^(\d+)\s*(?:minutes?|mins?)$/i,
    parse: (m) => parseInt(m[1] ?? "0", 10) * 60,
    confidence: 1.0,
  },
  // "2 hours" or "2 hrs"
  {
    regex: /^(\d+)\s*(?:hours?|hrs?|h)$/i,
    parse: (m) => parseInt(m[1] ?? "0", 10) * 3600,
    confidence: 1.0,
  },
  // "45 seconds" or "45 secs"
  {
    regex: /^(\d+)\s*(?:seconds?|secs?|s)$/i,
    parse: (m) => parseInt(m[1] ?? "0", 10),
    confidence: 1.0,
  },
  // Just a number - assume minutes (most common use case)
  {
    regex: /^(\d+)$/,
    parse: (m) => parseInt(m[1] ?? "0", 10) * 60,
    confidence: 0.9,
  },
];

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Parse a duration string to seconds
 *
 * @example
 * parseDuration("20")       // { seconds: 1200, display: "20m", ... }
 * parseDuration("1h 30m")   // { seconds: 5400, display: "1h 30m", ... }
 * parseDuration("1:30:00")  // { seconds: 5400, display: "1h 30m", ... }
 */
export function parseDuration(input: string): ParsedDuration | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  for (const pattern of DURATION_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const seconds = pattern.parse(match);
      if (seconds > 0) {
        return {
          seconds,
          input: trimmed,
          display: formatDuration(seconds),
          confidence: pattern.confidence,
        };
      }
    }
  }

  return null;
}

/**
 * Format seconds to a human-readable string
 *
 * @example
 * formatDuration(5400)  // "1h 30m"
 * formatDuration(1200)  // "20m"
 * formatDuration(45)    // "45s"
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (mins > 0) {
    parts.push(`${mins}m`);
  }
  if (secs > 0 && hours === 0) {
    // Only show seconds if less than an hour
    parts.push(`${secs}s`);
  }

  return parts.join(" ") || "0s";
}

/**
 * Format seconds to a short display (for quick picks)
 *
 * @example
 * formatDurationShort(5400)  // "90m" (not "1h 30m")
 * formatDurationShort(7200)  // "2h"
 */
export function formatDurationShort(seconds: number): string {
  if (seconds <= 0) return "0";

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor(seconds / 60);

  // If exactly hours, show hours
  if (seconds % 3600 === 0 && hours > 0) {
    return `${hours}h`;
  }

  // Otherwise show total minutes
  return `${mins}m`;
}

/**
 * Get presets for a given context
 */
export function getDurationPresets(
  context: DurationContext = "general",
): DurationPreset[] {
  return DURATION_PRESETS[context] || DURATION_PRESETS.general;
}

/**
 * Get quick pick values (in seconds) for a context
 */
export function getQuickPickValues(
  context: DurationContext = "general",
): number[] {
  return getDurationPresets(context).map((p) => p.value);
}
