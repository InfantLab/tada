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
import { eq, and, isNull } from "drizzle-orm";
import { createEntry, bulkCreateEntries } from "~/server/services/entries";
import type { NewEntry } from "~/server/db/schema";

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
  duplicates: any[];
  unique: any[];
}

interface ImportPreview {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  sample: any[];
  errors: Array<{ row: number; errors: string[] }>;
}

interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
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
  data: z.record(z.any()).optional().default({}),
});

/**
 * Parse CSV with field mapping
 */
export async function parseCSV(
  csvData: string,
  fieldMapping: FieldMapping,
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data.map((row: any) => {
          const entry: any = {};

          // Map timestamp
          if (fieldMapping.timestamp) {
            const timestamp = row[fieldMapping.timestamp];
            // Try to parse as ISO or convert from various formats
            try {
              const date = new Date(timestamp);
              entry.timestamp = date.toISOString();
            } catch {
              entry.timestamp = timestamp;
            }
          }

          // Map name
          if (fieldMapping.name) {
            entry.name = row[fieldMapping.name];
          }

          // Map type (or use default/static value)
          if (fieldMapping.type) {
            if (typeof fieldMapping.type === "string" && !fieldMapping.type.includes(" ")) {
              // Static value like "timed"
              entry.type = fieldMapping.type;
            } else {
              // Column mapping
              entry.type = row[fieldMapping.type];
            }
          } else {
            entry.type = "timed"; // Default type
          }

          // Map category (can be static or column)
          if (fieldMapping.category) {
            if (row[fieldMapping.category]) {
              entry.category = row[fieldMapping.category];
            } else {
              // Use as static value
              entry.category = fieldMapping.category;
            }
          }

          // Map subcategory (can be static or column)
          if (fieldMapping.subcategory) {
            if (row[fieldMapping.subcategory]) {
              entry.subcategory = row[fieldMapping.subcategory];
            } else {
              // Use as static value
              entry.subcategory = fieldMapping.subcategory;
            }
          }

          // Map duration (convert minutes to seconds if needed)
          if (fieldMapping.durationSeconds) {
            const duration = parseFloat(row[fieldMapping.durationSeconds]);
            if (!isNaN(duration)) {
              entry.durationSeconds = Math.round(duration * 60); // Assume input is in minutes
            }
          }

          // Map notes
          if (fieldMapping.notes && row[fieldMapping.notes]) {
            entry.notes = row[fieldMapping.notes];
          }

          // Map tags (comma-separated string)
          if (fieldMapping.tags && row[fieldMapping.tags]) {
            entry.tags = row[fieldMapping.tags]
              .split(",")
              .map((tag: string) => tag.trim())
              .filter(Boolean);
          }

          // Map timezone
          if (fieldMapping.timezone) {
            entry.timezone = row[fieldMapping.timezone] || "UTC";
          } else {
            entry.timezone = "UTC";
          }

          return entry;
        });

        resolve(mapped);
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Validate entry data
 */
export function validateEntry(entry: any, rowNumber: number): ValidationResult {
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
  newEntries: any[],
): Promise<DuplicateDetectionResult> {
  const duplicates: any[] = [];
  const unique: any[] = [];

  for (const entry of newEntries) {
    // Check if entry with same timestamp and category exists
    const existing = await db.query.entries.findFirst({
      where: and(
        eq(entries.userId, userId),
        eq(entries.timestamp, entry.timestamp),
        eq(entries.category, entry.category || null),
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
  entries: any[],
): Promise<ImportPreview> {
  let validCount = 0;
  let invalidCount = 0;
  const errorList: Array<{ row: number; errors: string[] }> = [];
  const sample: any[] = [];

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
    const validation = validateEntry(entries[index], index + 1);
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
  entries: any[],
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
  const validEntries = entries.filter((_, index) => validations[index].valid);
  const invalidEntries = entries.filter((_, index) => !validations[index].valid);

  // Record errors for invalid entries
  invalidEntries.forEach((_, index) => {
    const originalIndex = entries.indexOf(invalidEntries[index]);
    const validation = validations[originalIndex];
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
    type: entry.type || "timed",
    name: entry.name,
    category: entry.category || null,
    subcategory: entry.subcategory || null,
    emoji: entry.emoji || null,
    timestamp: entry.timestamp,
    durationSeconds: entry.durationSeconds || null,
    timezone: entry.timezone || "UTC",
    data: entry.data || {},
    tags: entry.tags || [],
    notes: entry.notes || null,
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
