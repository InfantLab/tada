/**
 * Natural Language Parser
 *
 * Parses natural language input to extract entry data.
 * Handles durations, counts, time references, and activity names.
 *
 * @module utils/naturalLanguageParser
 */

import type { EntryType } from "./entrySchemas";
import { parseDuration } from "./durationParser";

// =============================================================================
// Types
// =============================================================================

export interface ParsedEntry {
  /** Extracted entry input fields */
  input: {
    type?: EntryType;
    name?: string;
    durationSeconds?: number;
    count?: number;
    timestamp?: string;
    category?: string;
    subcategory?: string;
  };
  /** Parsing confidence (0-1) */
  confidence: number;
  /** Which fields were extracted vs defaulted */
  extracted: {
    type: boolean;
    name: boolean;
    duration: boolean;
    count: boolean;
    timestamp: boolean;
    category: boolean;
  };
  /** Original text */
  originalText: string;
  /** Parsing method used */
  method: "pattern" | "llm" | "hybrid";
}

export interface ParseOptions {
  /** Prefer LLM over pattern matching */
  preferLLM?: boolean;
  /** Context hints (e.g., "user usually logs meditation in morning") */
  contextHints?: string[];
  /** Default category if not detected */
  defaultCategory?: string;
}

// =============================================================================
// Count Patterns
// =============================================================================

const COUNT_PATTERNS: Array<{
  regex: RegExp;
  extractCount: (match: RegExpMatchArray) => number;
  extractName: (match: RegExpMatchArray) => string;
}> = [
  // "30 burpees", "44 push-ups", "100 jumping jacks"
  {
    regex: /^(\d+)\s+(.+)$/,
    extractCount: (m) => parseInt(m[1] ?? "0", 10),
    extractName: (m) => (m[2] ?? "").trim(),
  },
  // "burpees x 30", "push-ups x 44"
  {
    regex: /^(.+?)\s*[xX×]\s*(\d+)$/,
    extractCount: (m) => parseInt(m[2] ?? "0", 10),
    extractName: (m) => (m[1] ?? "").trim(),
  },
];

// =============================================================================
// Time Reference Patterns
// =============================================================================

interface TimeReference {
  regex: RegExp;
  getTimestamp: () => Date;
}

const TIME_REFERENCES: TimeReference[] = [
  // "this morning" - 7:00 AM today
  {
    regex: /\bthis morning\b/i,
    getTimestamp: () => {
      const d = new Date();
      d.setHours(7, 0, 0, 0);
      return d;
    },
  },
  // "this afternoon" - 2:00 PM today
  {
    regex: /\bthis afternoon\b/i,
    getTimestamp: () => {
      const d = new Date();
      d.setHours(14, 0, 0, 0);
      return d;
    },
  },
  // "this evening" - 6:00 PM today
  {
    regex: /\bthis evening\b/i,
    getTimestamp: () => {
      const d = new Date();
      d.setHours(18, 0, 0, 0);
      return d;
    },
  },
  // "yesterday" - same time yesterday
  {
    regex: /\byesterday\b/i,
    getTimestamp: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d;
    },
  },
  // "yesterday morning" - 7:00 AM yesterday
  {
    regex: /\byesterday morning\b/i,
    getTimestamp: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(7, 0, 0, 0);
      return d;
    },
  },
  // "at 7am", "at 7:30am", "at 14:00"
  {
    regex: /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
    getTimestamp: () => {
      // This is handled separately due to capture groups
      return new Date();
    },
  },
];

// =============================================================================
// Category Keywords
// =============================================================================

const CATEGORY_KEYWORDS: Record<
  string,
  { category: string; subcategory?: string }
> = {
  meditation: { category: "mindfulness", subcategory: "sitting" },
  meditate: { category: "mindfulness", subcategory: "sitting" },
  yoga: { category: "movement", subcategory: "yoga" },
  run: { category: "movement", subcategory: "running" },
  running: { category: "movement", subcategory: "running" },
  walk: { category: "movement", subcategory: "walking" },
  walking: { category: "movement", subcategory: "walking" },
  workout: { category: "movement", subcategory: "strength" },
  exercise: { category: "movement" },
  dream: { category: "moments", subcategory: "dream" },
  gratitude: { category: "moments", subcategory: "gratitude" },
  grateful: { category: "moments", subcategory: "gratitude" },
  "push-ups": { category: "movement", subcategory: "strength" },
  pushups: { category: "movement", subcategory: "strength" },
  burpees: { category: "movement", subcategory: "cardio" },
  squats: { category: "movement", subcategory: "strength" },
  kettlebell: { category: "movement", subcategory: "strength" },
};

// =============================================================================
// Main Parsing Functions
// =============================================================================

/**
 * Parse natural language text to extract entry data
 *
 * @example
 * parseNaturalLanguage("30 burpees this morning")
 * // { input: { type: "tally", name: "burpees", count: 30, timestamp: "..." }, ... }
 *
 * parseNaturalLanguage("20 minute meditation")
 * // { input: { type: "timed", name: "meditation", durationSeconds: 1200 }, ... }
 */
export function parseNaturalLanguage(
  text: string,
  _options?: ParseOptions,
): ParsedEntry {
  const result: ParsedEntry = {
    input: {},
    confidence: 0,
    extracted: {
      type: false,
      name: false,
      duration: false,
      count: false,
      timestamp: false,
      category: false,
    },
    originalText: text,
    method: "pattern",
  };

  const normalizedText = text.trim().toLowerCase();
  let remainingText = text.trim();
  let extractionCount = 0;

  // Try to extract time reference first
  const timeResult = extractTimeReference(normalizedText);
  if (timeResult) {
    result.input.timestamp = timeResult.timestamp;
    result.extracted.timestamp = true;
    remainingText = remainingText.replace(timeResult.matchedText, "").trim();
    extractionCount++;
  }

  // Try to extract duration
  const durationResult = extractDuration(remainingText);
  if (durationResult) {
    result.input.durationSeconds = durationResult.seconds;
    result.input.type = "timed";
    result.extracted.duration = true;
    result.extracted.type = true;
    remainingText = durationResult.remainingText;
    extractionCount++;
  }

  // Try to extract count (if no duration found)
  if (!result.input.durationSeconds) {
    const countResult = extractCount(remainingText);
    if (countResult) {
      result.input.count = countResult.count;
      result.input.name = countResult.name;
      result.input.type = "tally";
      result.extracted.count = true;
      result.extracted.name = true;
      result.extracted.type = true;
      extractionCount += 2;
    }
  }

  // Try to extract category from remaining text
  const categoryResult = extractCategory(remainingText);
  if (categoryResult) {
    result.input.category = categoryResult.category;
    if (categoryResult.subcategory) {
      result.input.subcategory = categoryResult.subcategory;
    }
    result.extracted.category = true;
    extractionCount++;

    // Use category keyword as name if we don't have one
    if (!result.input.name) {
      result.input.name = categoryResult.keyword;
      result.extracted.name = true;
    }
  }

  // If we still don't have a name, use cleaned remaining text
  if (!result.input.name && remainingText) {
    const cleanedName = cleanActivityName(remainingText);
    if (cleanedName) {
      result.input.name = cleanedName;
      result.extracted.name = true;
    }
  }

  // Calculate confidence based on what we extracted
  if (extractionCount > 0) {
    result.confidence = Math.min(0.9, 0.3 + extractionCount * 0.2);
  }

  return result;
}

// =============================================================================
// Extraction Helpers
// =============================================================================

function extractTimeReference(
  text: string,
): { timestamp: string; matchedText: string } | null {
  // Check for "at X:XX am/pm" pattern first
  const atTimeMatch = text.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (atTimeMatch) {
    let hours = parseInt(atTimeMatch[1] ?? "0", 10);
    const mins = atTimeMatch[2] ? parseInt(atTimeMatch[2], 10) : 0;
    const period = atTimeMatch[3]?.toLowerCase();

    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    const d = new Date();
    d.setHours(hours, mins, 0, 0);

    return {
      timestamp: d.toISOString(),
      matchedText: atTimeMatch[0] ?? "",
    };
  }

  // Check other time references
  for (const ref of TIME_REFERENCES) {
    if (ref.regex.test(text)) {
      const match = text.match(ref.regex);
      if (match) {
        return {
          timestamp: ref.getTimestamp().toISOString(),
          matchedText: match[0],
        };
      }
    }
  }

  return null;
}

function extractDuration(
  text: string,
): { seconds: number; remainingText: string } | null {
  // Look for duration patterns in the text
  const durationPatterns = [
    /(\d+)\s*(?:minute|min|m)s?\b/i,
    /(\d+)\s*(?:hour|hr|h)s?\b/i,
    /(\d+)\s*(?:second|sec|s)s?\b/i,
    /(\d+)\s*h\s*(\d+)\s*m/i,
  ];

  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseDuration(match[0]);
      if (parsed) {
        return {
          seconds: parsed.seconds,
          remainingText: text.replace(match[0], "").trim(),
        };
      }
    }
  }

  return null;
}

function extractCount(text: string): { count: number; name: string } | null {
  for (const pattern of COUNT_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      const count = pattern.extractCount(match);
      const name = pattern.extractName(match);
      if (count > 0 && name) {
        return { count, name: cleanActivityName(name) };
      }
    }
  }

  return null;
}

function extractCategory(
  text: string,
): { category: string; subcategory?: string; keyword: string } | null {
  const words = text.toLowerCase().split(/\s+/);

  for (const word of words) {
    const match = CATEGORY_KEYWORDS[word];
    if (match) {
      return {
        category: match.category,
        subcategory: match.subcategory,
        keyword: word,
      };
    }
  }

  return null;
}

function cleanActivityName(text: string): string {
  // Remove common filler words and clean up
  const fillers = [
    "i",
    "did",
    "just",
    "do",
    "some",
    "a",
    "the",
    "my",
    "for",
    "of",
    "and",
    "or",
    "with",
  ];

  return text
    .split(/\s+/)
    .filter((word) => !fillers.includes(word.toLowerCase()))
    .join(" ")
    .trim();
}

/**
 * Infer entry type from extracted data
 */
export function inferEntryType(input: ParsedEntry["input"]): EntryType | null {
  if (input.durationSeconds && input.durationSeconds > 0) {
    return "timed";
  }
  if (input.count && input.count > 0) {
    return "tally";
  }
  if (
    input.category === "moments" ||
    input.subcategory === "gratitude" ||
    input.subcategory === "dream"
  ) {
    return "moment";
  }
  return null;
}
