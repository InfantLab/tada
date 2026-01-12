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
  } = {}
): ParseResult<T> {
  const { expectedFields, skipEmptyLines = true } = options;

  const errors: ParseResult["errors"] = [];
  const data: T[] = [];

  const result = Papa.parse<T>(content, {
    header: true,
    skipEmptyLines: skipEmptyLines ? "greedy" : false,
    dynamicTyping: false, // Keep as strings for manual transformation
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
    complete: () => {
      logger.info("CSV parsing complete", {
        rows: data.length,
        errors: errors.length,
      });
    },
    error: (error: Error) => {
      logger.error("CSV parsing error", { error: error.message });
      errors.push({
        row: -1,
        message: error.message,
      });
    },
  });

  // Extract parsed data and errors
  if (result.data) {
    data.push(...result.data);
  }

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
      (field) => !actualFields.includes(field)
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
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // M:S or MM:SS
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);

    if (isNaN(minutes) || isNaN(seconds)) {
      return null;
    }

    return minutes * 60 + seconds;
  } else if (parts.length === 1) {
    // Just seconds
    const seconds = parseInt(parts[0], 10);
    return isNaN(seconds) ? null : seconds;
  }

  return null;
}

/**
 * Parse date string with timezone awareness
 * Converts to ISO 8601 string in UTC
 */
export function parseDateTime(
  dateStr: string,
  format: string = "MM/DD/YYYY HH:mm:ss",
  timezone: string = "UTC"
): string | null {
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }

  const trimmed = dateStr.trim();
  if (!trimmed) {
    return null;
  }

  try {
    // For now, support the most common format: MM/DD/YYYY HH:mm:ss
    // Can be extended with a date parsing library if needed
    if (format === "MM/DD/YYYY HH:mm:ss") {
      const match = trimmed.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/
      );
      if (!match) {
        return null;
      }

      const [, month, day, year, hour, minute, second] = match;

      // Create date in specified timezone
      // Note: This is a simplified approach. For production, consider using
      // a library like date-fns-tz or luxon for proper timezone handling
      const date = new Date(
        `${year}-${month.padStart(2, "0")}-${day.padStart(
          2,
          "0"
        )}T${hour.padStart(2, "0")}:${minute}:${second}`
      );

      if (isNaN(date.getTime())) {
        return null;
      }

      return date.toISOString();
    }

    // Fallback: try native Date parsing
    const date = new Date(trimmed);
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
  startedAt?: string | null;
}): string[] {
  const warnings: string[] = [];

  // Check for suspiciously long durations (>3 hours = 10800 seconds)
  if (entry.durationSeconds && entry.durationSeconds > 10800) {
    warnings.push(
      `Duration of ${Math.floor(
        entry.durationSeconds / 3600
      )} hours is unusually long`
    );
  }

  // Check for suspiciously short durations (<30 seconds)
  if (entry.durationSeconds && entry.durationSeconds < 30) {
    warnings.push(
      `Duration of ${entry.durationSeconds} seconds is unusually short`
    );
  }

  // Check for future dates
  if (entry.timestamp) {
    const date = new Date(entry.timestamp);
    if (date > new Date()) {
      warnings.push("Date is in the future");
    }
  }

  if (entry.startedAt) {
    const date = new Date(entry.startedAt);
    if (date > new Date()) {
      warnings.push("Start date is in the future");
    }
  }

  return warnings;
}
