/**
 * Obsidian Exporter Module
 *
 * Exports entries as Obsidian-compatible Markdown with YAML frontmatter.
 * Supports daily, weekly, and monthly summary formats.
 * Self-registers with the exporter registry on import.
 */

import type { DataExporter } from "~/types/exporter";
import { registerExporter } from "~/registry/exporters";

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

type EntryRecord = Record<string, unknown>;

function buildDailyNote(entries: EntryRecord[], date: string): string {
  const lines: string[] = [];

  const totalMinutes = entries.reduce(
    (sum, e) => sum + (((e["durationSeconds"] as number) || 0) / 60),
    0,
  );

  const uniqueTags = new Set<string>();
  entries.forEach((e) => {
    const tags = e["tags"];
    if (Array.isArray(tags)) tags.forEach((t) => uniqueTags.add(t));
  });

  const categories = new Set(
    entries.map((e) => e["category"]).filter(Boolean) as string[],
  );

  // YAML frontmatter
  lines.push("---");
  lines.push(`date: ${date}`);
  lines.push(`tags: [tada, ${Array.from(uniqueTags).join(", ")}]`);
  lines.push(`total_minutes: ${Math.round(totalMinutes)}`);
  lines.push(`entries: ${entries.length}`);
  lines.push(`categories: [${Array.from(categories).join(", ")}]`);
  lines.push("---");
  lines.push("");

  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  lines.push(`# Daily Summary - ${dateStr}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total Time**: ${Math.round(totalMinutes)} minutes`);
  lines.push(`- **Activities**: ${entries.length} entries`);
  lines.push("");

  // Accomplishments
  const accomplishments = entries.filter((e) => e["type"] === "tada");
  if (accomplishments.length > 0) {
    lines.push("## Accomplishments");
    lines.push("");
    for (const entry of accomplishments) {
      lines.push(`- ${entry["name"]}`);
      if (entry["notes"]) lines.push(`  - ${entry["notes"]}`);
    }
    lines.push("");
  }

  // Activities by category
  const byCategory = new Map<string, EntryRecord[]>();
  for (const entry of entries) {
    const category = String(entry["category"] || "Other");
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(entry);
  }

  lines.push("## Activities");
  lines.push("");

  for (const [category, categoryEntries] of byCategory) {
    lines.push(`### ${capitalize(category)}`);
    lines.push("");

    for (const entry of categoryEntries) {
      const duration =
        entry["durationSeconds"] && typeof entry["durationSeconds"] === "number"
          ? ` - ${Math.round(entry["durationSeconds"] / 60)} minutes`
          : "";
      lines.push(`- **${entry["name"]}**${duration}`);
      if (entry["notes"]) lines.push(`  > ${entry["notes"]}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function buildWeeklyNote(
  entries: EntryRecord[],
  startDate: string,
  endDate: string,
): string {
  const lines: string[] = [];

  const totalMinutes = entries.reduce(
    (sum, e) => sum + (((e["durationSeconds"] as number) || 0) / 60),
    0,
  );

  lines.push("---");
  lines.push(`start_date: ${startDate}`);
  lines.push(`end_date: ${endDate}`);
  lines.push(`tags: [tada, weekly-review]`);
  lines.push(`total_minutes: ${Math.round(totalMinutes)}`);
  lines.push(`entries: ${entries.length}`);
  lines.push("---");
  lines.push("");
  lines.push(`# Weekly Review - ${startDate} to ${endDate}`);
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(`- **Total Time**: ${Math.round(totalMinutes)} minutes`);
  lines.push(`- **Total Activities**: ${entries.length}`);
  lines.push("");

  // Highlights
  lines.push("## Highlights");
  lines.push("");
  const accomplishments = entries.filter((e) => e["type"] === "tada");
  if (accomplishments.length > 0) {
    for (const entry of accomplishments) lines.push(`- ${entry["name"]}`);
  } else {
    lines.push("- No accomplishments recorded this week");
  }
  lines.push("");

  // Breakdown
  lines.push("## Breakdown");
  lines.push("");

  const byCategory = new Map<string, { count: number; minutes: number }>();
  for (const entry of entries) {
    const category = String(entry["category"] || "Other");
    if (!byCategory.has(category)) byCategory.set(category, { count: 0, minutes: 0 });
    const stats = byCategory.get(category)!;
    stats.count++;
    stats.minutes += ((entry["durationSeconds"] as number) || 0) / 60;
  }

  for (const [category, stats] of byCategory) {
    lines.push(
      `- **${capitalize(category)}**: ${stats.count} activities, ${Math.round(stats.minutes)} minutes`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

function buildMonthlyNote(entries: EntryRecord[], month: string): string {
  const lines: string[] = [];

  const totalMinutes = entries.reduce(
    (sum, e) => sum + (((e["durationSeconds"] as number) || 0) / 60),
    0,
  );

  lines.push("---");
  lines.push(`month: ${month}`);
  lines.push(`tags: [tada, monthly-review]`);
  lines.push(`total_minutes: ${Math.round(totalMinutes)}`);
  lines.push(`entries: ${entries.length}`);
  lines.push("---");
  lines.push("");

  const monthName = new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  lines.push(`# Monthly Review - ${monthName}`);
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(`- **Total Time**: ${Math.round(totalMinutes)} minutes`);
  lines.push(`- **Total Activities**: ${entries.length}`);
  lines.push(`- **Average per Day**: ${Math.round(totalMinutes / 30)} minutes`);
  lines.push("");

  // Top categories
  lines.push("## Top Categories");
  lines.push("");

  const byCategory = new Map<string, { count: number; minutes: number }>();
  for (const entry of entries) {
    const category = String(entry["category"] || "Other");
    if (!byCategory.has(category)) byCategory.set(category, { count: 0, minutes: 0 });
    const stats = byCategory.get(category)!;
    stats.count++;
    stats.minutes += ((entry["durationSeconds"] as number) || 0) / 60;
  }

  const sorted = Array.from(byCategory.entries()).sort(
    (a, b) => b[1].minutes - a[1].minutes,
  );

  for (const [category, stats] of sorted) {
    lines.push(
      `- **${capitalize(category)}**: ${Math.round(stats.minutes)} minutes (${stats.count} activities)`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

export const obsidianExporter: DataExporter = {
  id: "obsidian",
  name: "Obsidian",
  description:
    "Export entries as Obsidian-compatible Markdown with YAML frontmatter",
  fileExtension: ".md",
  mimeType: "text/markdown",
  icon: "sparkles",

  async export(
    entries: EntryRecord[],
    options?: Record<string, unknown>,
  ): Promise<Blob> {
    const format = (options?.['format'] as string) || "daily";
    const date = (options?.['date'] as string) || new Date().toISOString().split("T")[0]!;

    let content: string;

    switch (format) {
      case "weekly": {
        const startDate =
          (options?.['startDate'] as string) || date;
        const endDate =
          (options?.['endDate'] as string) || date;
        content = buildWeeklyNote(entries, startDate, endDate);
        break;
      }
      case "monthly": {
        const month =
          (options?.['month'] as string) || date.substring(0, 7);
        content = buildMonthlyNote(entries, month);
        break;
      }
      default:
        content = buildDailyNote(entries, date);
    }

    return new Blob([content], { type: "text/markdown" });
  },

  configComponent: "ObsidianExportOptions",
};

registerExporter(obsidianExporter);
