import Papa from "papaparse";
import type { ImportRecipe, entries } from "~/server/db/schema";

/**
 * Parse duration string (H:mm:ss, mm:ss, or seconds) to seconds
 */
function parseDuration(duration: string): number | null {
  if (!duration || typeof duration !== "string") return null;
  const trimmed = duration.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":");
  if (parts.length === 3) {
    const [h, m, s] = parts.map((p) => parseInt(p, 10));
    if (isNaN(h!) || isNaN(m!) || isNaN(s!)) return null;
    return h! * 3600 + m! * 60 + s!;
  } else if (parts.length === 2) {
    const [m, s] = parts.map((p) => parseInt(p, 10));
    if (isNaN(m!) || isNaN(s!)) return null;
    return m! * 60 + s!;
  } else if (parts.length === 1) {
    const s = parseInt(parts[0]!, 10);
    return isNaN(s) ? null : s;
  }
  return null;
}

/**
 * Parse date string to ISO 8601 format
 */
function parseDateTime(
  dateStr: string,
  format: string = "DD/MM/YYYY HH:mm:ss"
): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Already ISO format?
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed;

  const match = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/
  );
  if (!match) return null;

  let month: string, day: string;
  const [, p1, p2, year, hour, minute, second] = match;

  if (format === "MM/DD/YYYY HH:mm:ss") {
    month = p1!.padStart(2, "0");
    day = p2!.padStart(2, "0");
  } else {
    // DD/MM/YYYY
    day = p1!.padStart(2, "0");
    month = p2!.padStart(2, "0");
  }

  return `${year}-${month}-${day}T${hour!.padStart(2, "0")}:${minute!.padStart(
    2,
    "0"
  )}:${second!.padStart(2, "0")}.000Z`;
}

/**
 * Composable for handling CSV file parsing and import operations
 */
export function useCSVImport() {
  const toast = useToast();

  /**
   * Parse a CSV file and return the data with field names
   */
  async function parseCSVFile(file: File): Promise<{
    data: Record<string, string>[];
    fields: string[];
    error?: string;
  }> {
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const error = "File size exceeds 50MB limit";
      toast.error(error);
      return { data: [], fields: [], error };
    }

    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: false,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim(),
        complete: (results) => {
          resolve({
            data: results.data,
            fields: results.meta.fields || [],
          });
        },
        error: (error: Error) => {
          const errorMsg = `Failed to parse CSV: ${error.message}`;
          toast.error(errorMsg);
          resolve({ data: [], fields: [], error: errorMsg });
        },
      });
    });
  }

  /**
   * Perform the import by sending entries to the API
   */
  async function performImport(config: {
    entries: Array<Partial<typeof entries.$inferInsert>>;
    source?: string;
    recipeName?: string;
    recipeId?: string | null;
    filename?: string;
  }) {
    try {
      // Use AbortController for timeout control
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes

      const response = await $fetch<{
        success: boolean;
        results: {
          successful: number;
          failed: number;
          skipped: number;
          errors: Array<{ message: string; row?: number }>;
        };
      }>("/api/import/entries", {
        method: "POST",
        body: {
          entries: config.entries,
          source: config.source || "csv-import",
          recipeName: config.recipeName || "Custom Import",
          recipeId: config.recipeId || null,
          filename: config.filename || "unknown.csv",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Show success toast
      const { successful, skipped } = response.results;
      toast.success(
        `Successfully imported ${successful} ${
          successful === 1 ? "entry" : "entries"
        }${skipped > 0 ? ` (${skipped} skipped)` : ""}`
      );

      return {
        ...response.results,
        total:
          response.results.successful +
          response.results.failed +
          response.results.skipped,
      };
    } catch (error) {
      console.error("Import failed:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Import failed. Please try again.";
      toast.error(errorMsg);
      throw error;
    }
  }

  /**
   * Transform CSV rows into entry format using column mapping and transforms
   */
  function transformCSVData(config: {
    csvData: Record<string, string>[];
    columnMapping: Record<string, string>;
    transforms: {
      defaultCategory: string;
      defaultSubcategory?: string;
      dateFormat?: string;
    };
    recipe?: ImportRecipe | null;
  }): Array<Partial<typeof entries.$inferInsert>> {
    const dateFormat = config.transforms.dateFormat || "DD/MM/YYYY HH:mm:ss";

    return config.csvData.map((row) => {
      const entry: Partial<typeof entries.$inferInsert> = {
        type: "timed",
      };

      // Map columns from CSV to entry fields
      Object.keys(config.columnMapping).forEach((targetField) => {
        const csvColumn = config.columnMapping[targetField];
        if (csvColumn && row[csvColumn]) {
          const rawValue = row[csvColumn];

          // Convert timestamp to ISO 8601
          if (targetField === "timestamp") {
            const parsed = parseDateTime(rawValue, dateFormat);
            if (parsed) {
              entry.timestamp = parsed;
            } else {
              // Fallback: use raw value if parsing fails
              entry.timestamp = rawValue;
            }
          }
          // Convert duration to seconds
          else if (targetField === "duration") {
            const seconds = parseDuration(rawValue);
            if (seconds !== null) {
              entry.durationSeconds = seconds;
            }
          }
          // Other fields: copy as-is
          else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (entry as any)[targetField] = rawValue;
          }
        }
      });

      // Set defaults
      entry.category = config.transforms.defaultCategory;
      if (config.transforms.defaultSubcategory) {
        entry.subcategory = config.transforms.defaultSubcategory;
      } else if (entry.name) {
        entry.subcategory = entry.name;
      }

      entry.source = config.recipe?.name || "csv-import";

      // Generate externalId from content hash (timestamp + type + name)
      const hashInput = `${entry.timestamp}-${entry.type}-${entry.name || ""}`;
      entry.externalId = `import-${btoa(hashInput)
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 32)}`;

      return entry;
    });
  }

  return {
    parseCSVFile,
    performImport,
    transformCSVData,
  };
}
