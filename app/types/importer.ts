/**
 * Data Importer Interface
 *
 * Each importer module exports a DataImporter that handles
 * parsing a specific file format into candidate entries.
 *
 * @module types/importer
 */

export interface ImportCandidate {
  name: string;
  type: string;
  category?: string;
  subcategory?: string;
  emoji?: string;
  timestamp: string;
  durationSeconds?: number;
  count?: number;
  notes?: string;
  tags?: string[];
  source?: string;
  externalId?: string;
  data?: Record<string, unknown>;
}

export interface DataImporter {
  id: string; // e.g., "insight-timer", "csv-generic"
  name: string; // Human-readable name
  description: string;
  fileTypes: string[]; // e.g., [".csv", ".json"]
  icon: string;

  // Parse file into candidate entries for review
  parse(
    file: File,
    options?: Record<string, unknown>,
  ): Promise<ImportCandidate[]>;

  // Optional: custom UI component for column mapping, preview, etc.
  configComponent?: string;
}
