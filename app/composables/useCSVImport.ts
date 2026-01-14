import Papa from "papaparse";
import type { ImportRecipe, entries } from "~/server/db/schema";

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
      const response = await $fetch<{
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
        // Large imports can take several minutes - increase timeout to 5 minutes
        timeout: 300000, // 5 minutes in milliseconds
      });

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
    };
    recipe?: ImportRecipe | null;
  }): Array<Partial<typeof entries.$inferInsert>> {
    return config.csvData.map((row) => {
      const entry: Partial<typeof entries.$inferInsert> = {
        type: "timed",
      };

      // Map columns from CSV to entry fields
      Object.keys(config.columnMapping).forEach((targetField) => {
        const csvColumn = config.columnMapping[targetField];
        if (csvColumn && row[csvColumn]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (entry as any)[targetField] = row[csvColumn];
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

      // Generate externalId from content hash (startedAt + type + name)
      const hashInput = `${entry.startedAt}-${entry.type}-${entry.name || ""}`;
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
