import Papa from "papaparse";
import { createLogger } from "./logger";

const logger = createLogger("csv-parser");

/**
 * Parse result with typed data
 */
export interface ParseResult<T = Record<string, unknown>> {
  data: T[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  meta: {
    totalRows: number;
    fields: string[];
  };
}

/**
 * Parse CSV from file content
 * Uses Papa Parse for robust parsing with streaming support
 */
export function parseCSV<T = Record<string, unknown>>(
  content: string,
  options: {
    expectedFields?: string[];
    skipEmptyLines?: boolean;
  } = {},
): ParseResult<T> {
  const { expectedFields, skipEmptyLines = true } = options;

  const errors: ParseResult["errors"] = [];

  const result = Papa.parse<T>(content, {
    header: true,
    skipEmptyLines: skipEmptyLines ? "greedy" : false,
    dynamicTyping: false, // Keep as strings for manual transformation
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
  });

  logger.info("CSV parsing complete", {
    rows: result.data.length,
    errors: result.errors.length,
  });

  // Extract parsed data
  const data: T[] = result.data || [];

  // Extract errors
  if (result.errors && result.errors.length > 0) {
    for (const error of result.errors) {
      errors.push({
        row: error.row ?? -1,
        field: error.code,
        message: error.message,
      });
    }
  }

  // Validate expected fields if provided
  const actualFields = result.meta.fields || [];
  if (expectedFields && expectedFields.length > 0) {
    const missing = expectedFields.filter(
      (field) => !actualFields.includes(field),
    );
    if (missing.length > 0) {
      errors.push({
        row: 0,
        message: `Missing expected columns: ${missing.join(", ")}`,
      });
    }
  }

  return {
    data,
    errors,
    meta: {
      totalRows: data.length,
      fields: actualFields,
    },
  };
}

/**
 * Parse duration string in various formats to seconds
 * Handles formats like: "H:mm:ss", "mm:ss", "H:m:s", etc.
 * Examples: "1:30:45" -> 5445, "0:6:0" -> 360, "23:50:0" -> 85800
 */
export function parseDuration(duration: string): number | null {
  if (!duration || typeof duration !== "string") {
    return null;
  }

  const trimmed = duration.trim();
  if (!trimmed) {
    return null;
  }

  // Handle HH:MM:SS or H:M:S formats
  const parts = trimmed.split(":");

  if (parts.length === 3) {
    // H:M:S or HH:MM:SS
    const hours = parseInt(parts[0]!, 10);
    const minutes = parseInt(parts[1]!, 10);
    const seconds = parseInt(parts[2]!, 10);

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // M:S or MM:SS
    const minutes = parseInt(parts[0]!, 10);
    const seconds = parseInt(parts[1]!, 10);

    if (isNaN(minutes) || isNaN(seconds)) {
      return null;
    }

    return minutes * 60 + seconds;
  } else if (parts.length === 1) {
    // Just seconds
    const seconds = parseInt(parts[0]!, 10);
    return isNaN(seconds) ? null : seconds;
  }

  return null;
}

/**
 * Parse date string with timezone awareness
 * Supports multiple common formats and converts to ISO 8601 string
 */
export function parseDateTime(
  dateStr: string,
  format: string = "DD/MM/YYYY HH:mm:ss",
  _timezone: string = "UTC",
): string | null {
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }

  const trimmed = dateStr.trim();
  if (!trimmed) {
    return null;
  }

  try {
    // Support multiple date formats
    let match: RegExpMatchArray | null;
    let month: string,
      day: string,
      year: string,
      hour: string,
      minute: string,
      second: string;

    if (format === "DD/MM/YYYY HH:mm:ss") {
      match = trimmed.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
      );
      if (!match) return null;
      [, day = "", month = "", year = "", hour = "", minute = "", second = ""] =
        match;
    } else if (format === "MM/DD/YYYY HH:mm:ss") {
      match = trimmed.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
      );
      if (!match) return null;
      [, month = "", day = "", year = "", hour = "", minute = "", second = ""] =
        match;
    } else if (format === "YYYY-MM-DD HH:mm:ss") {
      match = trimmed.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
      );
      if (!match) return null;
      [, year = "", month = "", day = "", hour = "", minute = "", second = ""] =
        match;
    } else {
      // Fallback: try native Date parsing
      const date = new Date(trimmed);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString();
    }

    // Create date in ISO format
    const date = new Date(
      `${year}-${month!.padStart(2, "0")}-${day!.padStart(
        2,
        "0",
      )}T${hour!.padStart(2, "0")}:${minute}:${second}`,
    );

    if (isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  } catch (error) {
    logger.error("Date parsing error", {
      dateStr,
      format,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Validate entry data for suspicious values
 * Returns warnings (not errors - data is still valid)
 */
export function validateEntryData(entry: {
  durationSeconds?: number | null;
  timestamp?: string | null;
}): string[] {
  const warnings: string[] = [];

  // Check for suspiciously long durations (>3 hours = 10800 seconds)
  if (entry.durationSeconds && entry.durationSeconds > 10800) {
    warnings.push(
      `Duration of ${Math.floor(
        entry.durationSeconds / 3600,
      )} hours is unusually long`,
    );
  }

  // Check for suspiciously short durations (<30 seconds)
  if (entry.durationSeconds && entry.durationSeconds < 30) {
    warnings.push(
      `Duration of ${entry.durationSeconds} seconds is unusually short`,
    );
  }

  // Check for future dates
  if (entry.timestamp) {
    const date = new Date(entry.timestamp);
    if (date > new Date()) {
      warnings.push("Timestamp is in the future");
    }
  }

  return warnings;
}

/**
 * Detect date format from sample date strings
 */
export function detectDateFormat(samples: string[]): {
  format: string;
  confidence: "high" | "medium" | "low";
} {
  if (!samples || samples.length === 0) {
    return { format: "DD/MM/YYYY HH:mm:ss", confidence: "low" };
  }
  const validSamples = samples.filter((s) => s && s.trim()).slice(0, 10);
  if (validSamples.length === 0) {
    return { format: "DD/MM/YYYY HH:mm:ss", confidence: "low" };
  }
  let mmddMatches = 0;
  let ddmmMatches = 0;
  let isoMatches = 0;
  for (const sample of validSamples) {
    const trimmed = sample.trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
      isoMatches++;
      continue;
    }
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const first = parseInt(match[1]!, 10);
      const second = parseInt(match[2]!, 10);
      if (first > 12) {
        ddmmMatches++;
      } else if (second > 12) {
        mmddMatches++;
      } else {
        mmddMatches += 0.5;
        ddmmMatches += 0.5;
      }
    }
  }
  if (isoMatches > mmddMatches && isoMatches > ddmmMatches) {
    const confidence =
      isoMatches / validSamples.length > 0.8 ? "high" : "medium";
    return { format: "YYYY-MM-DD HH:mm:ss", confidence };
  } else if (mmddMatches > ddmmMatches) {
    const confidence =
      mmddMatches / validSamples.length > 0.8 ? "high" : "medium";
    return { format: "MM/DD/YYYY HH:mm:ss", confidence };
  } else if (ddmmMatches > 0) {
    const confidence =
      ddmmMatches / validSamples.length > 0.8 ? "high" : "medium";
    return { format: "DD/MM/YYYY HH:mm:ss", confidence };
  }
  return { format: "DD/MM/YYYY HH:mm:ss", confidence: "low" };
}

/**
 * Generate stable external ID for import deduplication
 */
export async function generateExternalId(entry: {
  timestamp?: string;
  name?: string;
  type?: string;
  durationSeconds?: number;
}): Promise<string> {
  const crypto = await import("crypto");
  const parts = [
    entry.timestamp || "", // THE timeline position
    entry.type || "timed",
    entry.name || "",
    entry.durationSeconds?.toString() || "",
  ];
  const input = parts.join("|");
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return `import-${hash.substring(0, 32)}`;
}
