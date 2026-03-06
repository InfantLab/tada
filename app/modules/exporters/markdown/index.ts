/**
 * Markdown Exporter Module
 *
 * Exports entries as a Markdown document grouped by category.
 * Self-registers with the exporter registry on import.
 */

import type { DataExporter } from "~/types/exporter";
import { registerExporter } from "~/registry/exporters";

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const markdownExporter: DataExporter = {
  id: "markdown",
  name: "Markdown",
  description: "Export entries as a Markdown document grouped by category",
  fileExtension: ".md",
  mimeType: "text/markdown",
  icon: "document-text",

  async export(entries: Record<string, unknown>[]): Promise<Blob> {
    if (entries.length === 0) {
      return new Blob(
        ["# No Entries\n\nNo entries found for the specified period.\n"],
        { type: "text/markdown" },
      );
    }

    const lines: string[] = [];

    // Group by category
    const byCategory = new Map<string, Record<string, unknown>[]>();
    for (const entry of entries) {
      const category = String(entry["category"] || "Uncategorized");
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(entry);
    }

    for (const [category, categoryEntries] of byCategory) {
      lines.push(`## ${capitalize(category)}\n`);

      for (const entry of categoryEntries) {
        const duration =
          entry["durationSeconds"] && typeof entry["durationSeconds"] === "number"
            ? ` (${Math.round(entry["durationSeconds"] / 60)} minutes)`
            : "";
        lines.push(`- **${entry["name"]}**${duration}`);

        if (entry["notes"]) {
          lines.push(`  - ${entry["notes"]}`);
        }

        const tags = entry["tags"];
        if (Array.isArray(tags) && tags.length > 0) {
          lines.push(`  - Tags: ${tags.join(", ")}`);
        }

        lines.push("");
      }
    }

    return new Blob([lines.join("\n")], { type: "text/markdown" });
  },
};

registerExporter(markdownExporter);
