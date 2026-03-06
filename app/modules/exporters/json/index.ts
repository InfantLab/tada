/**
 * JSON Exporter Module
 *
 * Exports entries as a clean JSON file, stripping sensitive fields.
 * Self-registers with the exporter registry on import.
 */

import type { DataExporter } from "~/types/exporter";
import { registerExporter } from "~/registry/exporters";

export const jsonExporter: DataExporter = {
  id: "json",
  name: "JSON",
  description: "Export entries as a structured JSON file",
  fileExtension: ".json",
  mimeType: "application/json",
  icon: "code-bracket",

  async export(
    entries: Record<string, unknown>[],
    options?: Record<string, unknown>,
  ): Promise<Blob> {
    const version = (options?.['version'] as string) || "1.0";

    const exportData = {
      version,
      exportedAt: new Date().toISOString(),
      entries: entries.map(({ userId: _, ...rest }) => rest),
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
  },
};

registerExporter(jsonExporter);
