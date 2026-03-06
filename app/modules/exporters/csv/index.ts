/**
 * CSV Exporter Module
 *
 * Exports entries as a CSV file with proper escaping.
 * Self-registers with the exporter registry on import.
 */

import type { DataExporter } from "~/types/exporter";
import { registerExporter } from "~/registry/exporters";

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export const csvExporter: DataExporter = {
  id: "csv",
  name: "CSV",
  description: "Export entries as a comma-separated values file",
  fileExtension: ".csv",
  mimeType: "text/csv",
  icon: "table-cells",

  async export(entries: Record<string, unknown>[]): Promise<Blob> {
    const headers = [
      "id",
      "type",
      "name",
      "category",
      "subcategory",
      "timestamp",
      "durationSeconds",
      "notes",
      "tags",
    ];

    const csvRows: string[] = [headers.join(",")];

    for (const entry of entries) {
      const row = [
        escapeCsvField(String(entry["id"] || "")),
        escapeCsvField(String(entry["type"] || "")),
        escapeCsvField(String(entry["name"] || "")),
        escapeCsvField(String(entry["category"] || "")),
        escapeCsvField(String(entry["subcategory"] || "")),
        escapeCsvField(String(entry["timestamp"] || "")),
        String(entry["durationSeconds"] || ""),
        escapeCsvField(String(entry["notes"] || "")),
        escapeCsvField(
          Array.isArray(entry["tags"]) ? entry["tags"].join(";") : "",
        ),
      ];
      csvRows.push(row.join(","));
    }

    return new Blob([csvRows.join("\n")], { type: "text/csv" });
  },
};

registerExporter(csvExporter);
