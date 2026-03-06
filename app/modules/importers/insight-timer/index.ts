/**
 * Insight Timer Importer Module
 *
 * Pre-configured importer for Insight Timer CSV exports.
 * Maps meditation sessions with fixed field mapping.
 * Self-registers with the importer registry on import.
 */

import Papa from "papaparse";
import type { DataImporter, ImportCandidate } from "~/types/importer";
import { registerImporter } from "~/registry/importers";

const INSIGHT_TIMER_MAPPING = {
  timestamp: "Date",
  name: "Activity",
  durationMinutes: "Duration (minutes)",
  category: "mindfulness",
  subcategory: "meditation",
  type: "timed",
} as const;

export const insightTimerImporter: DataImporter = {
  id: "insight-timer",
  name: "Insight Timer",
  description:
    "Import meditation sessions from Insight Timer CSV export",
  fileTypes: [".csv"],
  icon: "clock",

  async parse(file: File): Promise<ImportCandidate[]> {
    const text = await file.text();

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const candidates = (results.data as Record<string, string>[]).map(
            (row) => {
              let timestamp = "";
              const raw = row[INSIGHT_TIMER_MAPPING.timestamp] ?? "";
              try {
                timestamp = new Date(raw).toISOString();
              } catch {
                timestamp = raw;
              }

              let durationSeconds: number | undefined;
              const minutes = parseFloat(
                row[INSIGHT_TIMER_MAPPING.durationMinutes] ?? "",
              );
              if (!isNaN(minutes)) {
                durationSeconds = Math.round(minutes * 60);
              }

              return {
                name: row[INSIGHT_TIMER_MAPPING.name] || "Meditation",
                type: INSIGHT_TIMER_MAPPING.type,
                category: INSIGHT_TIMER_MAPPING.category,
                subcategory: INSIGHT_TIMER_MAPPING.subcategory,
                timestamp,
                durationSeconds,
                source: "insight-timer",
              } satisfies ImportCandidate;
            },
          );
          resolve(candidates);
        },
        error: (error: Error) => {
          reject(
            new Error(`Insight Timer CSV parsing failed: ${error.message}`),
          );
        },
      });
    });
  },
};

registerImporter(insightTimerImporter);
