/**
 * Data Exporter Interface
 *
 * Each exporter module exports a DataExporter that handles
 * generating a specific output format from entries.
 *
 * @module types/exporter
 */

export interface DataExporter {
  id: string; // e.g., "json", "csv", "obsidian"
  name: string; // Human-readable name
  description: string;
  fileExtension: string; // e.g., ".json", ".csv", ".md"
  mimeType: string;
  icon: string;

  // Generate export from entries
  export(
    entries: Record<string, unknown>[],
    options?: Record<string, unknown>,
  ): Promise<Blob>;

  // Optional: custom UI component for export options
  configComponent?: string;
}
