/**
 * CSV Generic Importer Module
 *
 * Handles importing entries from any CSV file with user-defined field mapping.
 * Self-registers with the importer registry on import.
 */

import Papa from "papaparse";
import type { DataImporter, ImportCandidate } from "~/types/importer";
import { registerImporter } from "~/registry/importers";

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

function mapRow(
  csvRow: Record<string, string>,
  mapping: FieldMapping,
): ImportCandidate {
  let timestamp = "";
  if (mapping.timestamp) {
    const raw = csvRow[mapping.timestamp] ?? "";
    try {
      timestamp = new Date(raw).toISOString();
    } catch {
      timestamp = raw;
    }
  }

  let type = "timed";
  if (mapping.type) {
    type = csvRow[mapping.type] || mapping.type;
  }

  let category: string | undefined;
  if (mapping.category) {
    category = csvRow[mapping.category] || mapping.category;
  }

  let subcategory: string | undefined;
  if (mapping.subcategory) {
    subcategory = csvRow[mapping.subcategory] || mapping.subcategory;
  }

  let durationSeconds: number | undefined;
  if (mapping.durationSeconds) {
    const val = parseFloat(csvRow[mapping.durationSeconds] ?? "");
    if (!isNaN(val)) {
      durationSeconds = Math.round(val * 60); // Assume input in minutes
    }
  }

  let tags: string[] | undefined;
  if (mapping.tags && csvRow[mapping.tags]) {
    tags = csvRow[mapping.tags]!
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);
  }

  return {
    name: csvRow[mapping.name] || "",
    type,
    category,
    subcategory,
    timestamp,
    durationSeconds,
    notes: mapping.notes ? csvRow[mapping.notes] || undefined : undefined,
    tags,
    source: "import",
  };
}

export const csvGenericImporter: DataImporter = {
  id: "csv-generic",
  name: "Custom CSV",
  description: "Import from any CSV file with custom field mapping",
  fileTypes: [".csv"],
  icon: "table-cells",

  async parse(
    file: File,
    options?: Record<string, unknown>,
  ): Promise<ImportCandidate[]> {
    const mapping = (options?.['fieldMapping'] as FieldMapping) || {
      timestamp: "timestamp",
      name: "name",
    };

    const text = await file.text();

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const candidates = (results.data as Record<string, string>[]).map(
            (row) => mapRow(row, mapping),
          );
          resolve(candidates);
        },
        error: (error: Error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  },

  configComponent: "ImportWizard",
};

registerImporter(csvGenericImporter);
