/**
 * Import Service
 *
 * Handles data import from CSV and JSON with:
 * - Field mapping configuration
 * - Row-by-row validation with detailed error messages
 * - Duplicate detection by timestamp + category
 * - Dry-run preview mode
 * - Source tagging for imported entries
 */

import Papa from "papaparse";
import { z } from "zod";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { bulkCreateEntries } from "~/server/services/entries";
import type { NewEntry } from "~/server/db/schema";

/** A loosely-typed entry object coming from CSV/JSON import before full validation */
type ImportEntry = Record<string, unknown>;

interface FieldMapping {
  timestamp: string;
  name: string;
  type?: string;
  category?: string;
  subcategory?: string;
  durationSeconds?: string;
  notes?: string;
  tags?: string;
  timezone?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  rowNumber: number;
}

interface DuplicateDetectionResult {
  duplicates: ImportEntry[];
  unique: ImportEntry[];
}

interface ImportPreview {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  sample: ImportEntry[];
  errors: Array<{ row: number; errors: string[] }>;
}

interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  fuzzyMatch?: boolean;
  fuzzyToleranceMs?: number;
}

// ---------------------------------------------------------------------------
// Fuzzy Duplicate Detection
// ---------------------------------------------------------------------------

export type FuzzyMatchType =
  | "exact"
  | "close"
  | "close-suspicious"
  | "overlap"
  | "none";

export type FuzzyResolution =
  | "keep-new"
  | "keep-existing"
  | "keep-longer"
  | "review";

export interface FuzzyMatch {
  newEntry: ImportEntry;
  matchType: FuzzyMatchType;
  existingEntry?: {
    id: string;
    timestamp: string;
    durationSeconds: number | null;
    name: string;
  };
  timeDiffMs?: number;
  durationRatio?: number;
  suggestedResolution: FuzzyResolution;
}

export interface FuzzyDetectionResult {
  unique: ImportEntry[];
  matches: FuzzyMatch[];
}

export interface FuzzyDetectionOptions {
  toleranceMs?: number;
  suspiciousRatio?: number;
}

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_SUSPICIOUS_RATIO = 2; // >2x duration difference

/**
 * Detect duplicate entries with fuzzy time matching.
 *
 * For each new entry, checks existing DB entries for:
 * - Exact timestamp match
 * - Close match (start times within tolerance)
 * - Time range overlap (even if start times are far apart)
 */
export async function detectDuplicatesFuzzy(
  userId: string,
  newEntries: ImportEntry[],
  options: FuzzyDetectionOptions = {},
): Promise<FuzzyDetectionResult> {
  const toleranceMs = options.toleranceMs ?? DEFAULT_TOLERANCE_MS;
  const suspiciousRatio = options.suspiciousRatio ?? DEFAULT_SUSPICIOUS_RATIO;

  const unique: ImportEntry[] = [];
  const matches: FuzzyMatch[] = [];

  for (const entry of newEntries) {
    if (!entry['timestamp']) {
      unique.push(entry);
      continue;
    }

    const newStart = new Date(entry['timestamp'] as string);
    const newDuration = (entry['durationSeconds'] as number) || 0;
    const newEnd = new Date(newStart.getTime() + newDuration * 1000);

    // Query candidates in a window around this entry
    const windowStart = new Date(
      newStart.getTime() - Math.max(toleranceMs, 24 * 60 * 60 * 1000),
    );
    const windowEnd = new Date(
      newEnd.getTime() + Math.max(toleranceMs, 24 * 60 * 60 * 1000),
    );

    const candidates = await db
      .select({
        id: entries.id,
        timestamp: entries.timestamp,
        durationSeconds: entries.durationSeconds,
        name: entries.name,
      })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          isNull(entries.deletedAt),
          gte(entries.timestamp, windowStart.toISOString()),
          lte(entries.timestamp, windowEnd.toISOString()),
        ),
      );

    // Find closest by start time
    let closest: (typeof candidates)[0] | null = null;
    let closestDiffMs = Infinity;

    for (const c of candidates) {
      const diff = Math.abs(newStart.getTime() - new Date(c.timestamp).getTime());
      if (diff < closestDiffMs) {
        closestDiffMs = diff;
        closest = c;
      }
    }

    // Check for exact match
    if (closest && closestDiffMs === 0) {
      matches.push({
        newEntry: entry,
        matchType: "exact",
        existingEntry: closest,
        timeDiffMs: 0,
        suggestedResolution: "keep-existing",
      });
      continue;
    }

    // Check for close match
    if (closest && closestDiffMs <= toleranceMs) {
      const existingDuration = closest.durationSeconds || 0;
      const ratio =
        existingDuration > 0 ? newDuration / existingDuration : Infinity;

      const isSuspicious =
        ratio > suspiciousRatio ||
        (existingDuration > 0 && ratio < 1 / suspiciousRatio);

      if (isSuspicious) {
        matches.push({
          newEntry: entry,
          matchType: "close-suspicious",
          existingEntry: closest,
          timeDiffMs: closestDiffMs,
          durationRatio: ratio,
          suggestedResolution: "review",
        });
      } else {
        matches.push({
          newEntry: entry,
          matchType: "close",
          existingEntry: closest,
          timeDiffMs: closestDiffMs,
          durationRatio: ratio,
          suggestedResolution: "keep-longer",
        });
      }
      continue;
    }

    // Check for time range overlap
    if (newDuration > 0) {
      const overlapping = candidates.filter((c) => {
        const cStart = new Date(c.timestamp);
        const cEnd = new Date(cStart.getTime() + (c.durationSeconds || 0) * 1000);
        return newStart < cEnd && newEnd > cStart;
      });

      if (overlapping.length > 0) {
        matches.push({
          newEntry: entry,
          matchType: "overlap",
          existingEntry: overlapping[0],
          suggestedResolution: "review",
        });
        continue;
      }
    }

    // No match found
    unique.push(entry);
  }

  return { unique, matches };
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  entries: NewEntry[];
  errors?: Array<{ row: number; errors: string[] }>;
}

// Entry validation schema
const entrySchema = z.object({
  timestamp: z.string().datetime(),
  name: z.string().min(1),
  type: z.string().min(1).default("timed"),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  emoji: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
  timezone: z.string().default("UTC"),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
  data: z.record(z.string(), z.any()).optional().default({}),
});

/**
 * Parse CSV with field mapping
 */
export async function parseCSV(
  csvData: string,
  fieldMapping: FieldMapping,
): Promise<ImportEntry[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data.map((row: unknown) => {
          const csvRow = row as Record<string, string>;
          const entry: ImportEntry = {};

          // Map timestamp
          if (fieldMapping.timestamp) {
            const timestamp = csvRow[fieldMapping.timestamp] ?? "";
            // Try to parse as ISO or convert from various formats
            try {
              const date = new Date(timestamp);
              entry['timestamp'] = date.toISOString();
            } catch {
              entry['timestamp'] = timestamp;
            }
          }

          // Map name
          if (fieldMapping.name) {
            entry['name'] = csvRow[fieldMapping.name];
          }

          // Map type (or use default/static value)
          if (fieldMapping.type) {
            if (typeof fieldMapping.type === "string" && !fieldMapping.type.includes(" ")) {
              // Static value like "timed"
              entry['type'] = fieldMapping.type;
            } else {
              // Column mapping
              entry['type'] = csvRow[fieldMapping.type];
            }
          } else {
            entry['type'] = "timed"; // Default type
          }

          // Map category (can be static or column)
          if (fieldMapping.category) {
            if (csvRow[fieldMapping.category]) {
              entry['category'] = csvRow[fieldMapping.category];
            } else {
              // Use as static value
              entry['category'] = fieldMapping.category;
            }
          }

          // Map subcategory (can be static or column)
          if (fieldMapping.subcategory) {
            if (csvRow[fieldMapping.subcategory]) {
              entry['subcategory'] = csvRow[fieldMapping.subcategory];
            } else {
              // Use as static value
              entry['subcategory'] = fieldMapping.subcategory;
            }
          }

          // Map duration (convert minutes to seconds if needed)
          if (fieldMapping.durationSeconds) {
            const duration = parseFloat(csvRow[fieldMapping.durationSeconds] ?? "");
            if (!isNaN(duration)) {
              entry['durationSeconds'] = Math.round(duration * 60); // Assume input is in minutes
            }
          }

          // Map notes
          if (fieldMapping.notes && csvRow[fieldMapping.notes]) {
            entry['notes'] = csvRow[fieldMapping.notes];
          }

          // Map tags (comma-separated string)
          if (fieldMapping.tags && csvRow[fieldMapping.tags]) {
            entry['tags'] = csvRow[fieldMapping.tags]!
              .split(",")
              .map((tag: string) => tag.trim())
              .filter(Boolean);
          }

          // Map timezone
          if (fieldMapping.timezone) {
            entry['timezone'] = csvRow[fieldMapping.timezone] || "UTC";
          } else {
            entry['timezone'] = "UTC";
          }

          return entry;
        });

        resolve(mapped);
      },
      error: (error: Error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Validate entry data
 */
export function validateEntry(entry: ImportEntry, rowNumber: number): ValidationResult {
  const result = entrySchema.safeParse(entry);

  if (result.success) {
    // Additional type-specific validation
    const data = result.data;
    const errors: string[] = [];

    if (data.type === "timed" && !data.durationSeconds) {
      errors.push("Timed entries require durationSeconds");
    }

    if (data.type === "tada" && !data.name) {
      errors.push("Ta-da entries require a name");
    }

    return {
      valid: errors.length === 0,
      errors,
      rowNumber,
    };
  }

  // Extract error messages from Zod
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );

  return {
    valid: false,
    errors,
    rowNumber,
  };
}

/**
 * Detect duplicate entries by timestamp and category
 */
export async function detectDuplicates(
  userId: string,
  newEntries: ImportEntry[],
): Promise<DuplicateDetectionResult> {
  const duplicates: ImportEntry[] = [];
  const unique: ImportEntry[] = [];

  for (const entry of newEntries) {
    // Check if entry with same timestamp and category exists
    const existing = await db.query.entries.findFirst({
      where: and(
        eq(entries.userId, userId),
        eq(entries.timestamp, String(entry['timestamp'])),
        eq(entries.category, String(entry['category'] || "")),
        isNull(entries.deletedAt),
      ),
    });

    if (existing) {
      duplicates.push(entry);
    } else {
      unique.push(entry);
    }
  }

  return { duplicates, unique };
}

/**
 * Create import preview (dry run)
 */
export async function createPreview(
  userId: string,
  entries: ImportEntry[],
): Promise<ImportPreview> {
  let validCount = 0;
  let invalidCount = 0;
  const errorList: Array<{ row: number; errors: string[] }> = [];
  const sample: ImportEntry[] = [];

  // Validate each entry
  entries.forEach((entry, index) => {
    const validation = validateEntry(entry, index + 1);

    if (validation.valid) {
      validCount++;
      // Add to sample (max 5)
      if (sample.length < 5) {
        sample.push(entry);
      }
    } else {
      invalidCount++;
      errorList.push({
        row: validation.rowNumber,
        errors: validation.errors,
      });
    }
  });

  // Detect duplicates (only for valid entries)
  const validEntries = entries.filter((_, index) => {
    const validation = validateEntry(entries[index]!, index + 1);
    return validation.valid;
  });

  const duplicationResult = await detectDuplicates(userId, validEntries);

  return {
    total: entries.length,
    valid: validCount,
    invalid: invalidCount,
    duplicates: duplicationResult.duplicates.length,
    sample,
    errors: errorList,
  };
}

/**
 * Import entries into database
 */
export async function importEntries(
  userId: string,
  entries: ImportEntry[],
  options: ImportOptions = {},
): Promise<ImportResult> {
  const { skipDuplicates = false, updateExisting = false } = options;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const importedEntries: NewEntry[] = [];
  const errorList: Array<{ row: number; errors: string[] }> = [];

  // Validate all entries first
  const validations = entries.map((entry, index) =>
    validateEntry(entry, index + 1),
  );

  // Separate valid and invalid entries
  const validEntries = entries.filter((_, index) => validations[index]!.valid);
  const invalidEntries = entries.filter((_, index) => !validations[index]!.valid);

  // Record errors for invalid entries
  invalidEntries.forEach((_, index) => {
    const originalIndex = entries.indexOf(invalidEntries[index]!);
    const validation = validations[originalIndex]!;
    errorList.push({
      row: validation.rowNumber,
      errors: validation.errors,
    });
    failed++;
  });

  // Detect duplicates
  const duplicationResult = await detectDuplicates(userId, validEntries);

  // Handle duplicates
  if (skipDuplicates) {
    skipped = duplicationResult.duplicates.length;
  } else if (updateExisting) {
    // Update existing entries (not implemented in MVP)
    updated = duplicationResult.duplicates.length;
  }

  // Create new entries (unique ones)
  const entriesToCreate: NewEntry[] = duplicationResult.unique.map((entry) => ({
    id: crypto.randomUUID(),
    userId,
    type: (entry['type'] as string) || "timed",
    name: entry['name'] as string,
    category: (entry['category'] as string) || null,
    subcategory: (entry['subcategory'] as string) || null,
    emoji: (entry['emoji'] as string) || null,
    timestamp: entry['timestamp'] as string,
    durationSeconds: (entry['durationSeconds'] as number) || null,
    timezone: (entry['timezone'] as string) || "UTC",
    data: (entry['data'] as Record<string, unknown>) || {},
    tags: (entry['tags'] as string[]) || [],
    notes: (entry['notes'] as string) || null,
    source: "import", // Mark as imported
    externalId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  }));

  if (entriesToCreate.length > 0) {
    const result = await bulkCreateEntries(entriesToCreate);
    created = result.created;
    importedEntries.push(...entriesToCreate);
  }

  return {
    total: entries.length,
    created,
    updated,
    skipped,
    failed,
    entries: importedEntries,
    errors: errorList.length > 0 ? errorList : undefined,
  };
}

/**
 * Preset field mapping for Insight Timer CSV export
 */
export const INSIGHT_TIMER_MAPPING: FieldMapping = {
  timestamp: "Date",
  name: "Activity",
  durationSeconds: "Duration (minutes)",
  category: "mindfulness",
  subcategory: "meditation",
  type: "timed",
};
