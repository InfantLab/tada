/**
 * Export Service
 *
 * Provides format converters for exporting entries in multiple formats:
 * - JSON (clean, filtered)
 * - CSV (proper escaping)
 * - Markdown (organized sections)
 * - Obsidian (daily/weekly/monthly with YAML frontmatter)
 */

import type { Entry } from "~/server/db/schema";

/**
 * Export to JSON format (clean, filter sensitive fields)
 */
export function toJSON(entries: Entry[]): Entry[] {
  return entries.map((entry) => ({
    ...entry,
    userId: undefined, // Remove sensitive field
  })) as Entry[];
}

/**
 * Export to CSV format with proper escaping
 */
export function toCSV(entries: Entry[]): string {
  if (entries.length === 0) {
    return "id,type,name,category,subcategory,timestamp,durationSeconds,notes,tags\n";
  }

  // CSV headers
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

  // CSV data rows
  for (const entry of entries) {
    const row = [
      escapeCsvField(entry.id),
      escapeCsvField(entry.type),
      escapeCsvField(entry.name),
      escapeCsvField(entry.category || ""),
      escapeCsvField(entry.subcategory || ""),
      escapeCsvField(entry.timestamp),
      entry.durationSeconds?.toString() || "",
      escapeCsvField(entry.notes || ""),
      escapeCsvField(entry.tags?.join(";") || ""),
    ];

    csvRows.push(row.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Escape CSV field (handle quotes, commas, newlines)
 */
function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Export to Markdown format with organized sections
 */
export function toMarkdown(entries: Entry[]): string {
  if (entries.length === 0) {
    return "# No Entries\n\nNo entries found for the specified period.\n";
  }

  const lines: string[] = [];

  // Group by category
  const byCategory = new Map<string, Entry[]>();

  for (const entry of entries) {
    const category = entry.category || "Uncategorized";
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(entry);
  }

  // Generate markdown sections
  for (const [category, categoryEntries] of byCategory) {
    lines.push(`## ${capitalize(category)}\n`);

    for (const entry of categoryEntries) {
      const duration = entry.durationSeconds
        ? ` (${Math.round(entry.durationSeconds / 60)} minutes)`
        : "";

      lines.push(`- **${entry.name}**${duration}`);

      if (entry.notes) {
        lines.push(`  - ${entry.notes}`);
      }

      if (entry.tags && entry.tags.length > 0) {
        lines.push(`  - Tags: ${entry.tags.join(", ")}`);
      }

      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Export to Obsidian daily format
 */
export function toObsidianDaily(
  entries: Entry[],
  date: string,
): string {
  const lines: string[] = [];

  // Calculate metrics
  const totalMinutes = entries.reduce(
    (sum, e) => sum + (e.durationSeconds || 0) / 60,
    0,
  );

  const uniqueTags = new Set<string>();
  entries.forEach((e) => e.tags?.forEach((tag) => uniqueTags.add(tag)));

  const categories = new Set(entries.map((e) => e.category).filter(Boolean));

  // YAML frontmatter
  lines.push("---");
  lines.push(`date: ${date}`);
  lines.push(`tags: [tada, ${Array.from(uniqueTags).join(", ")}]`);
  lines.push(`total_minutes: ${Math.round(totalMinutes)}`);
  lines.push(`entries: ${entries.length}`);
  lines.push(`categories: [${Array.from(categories).join(", ")}]`);
  lines.push("---");
  lines.push("");

  // Title
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  lines.push(`# Daily Summary - ${dateStr}`);
  lines.push("");

  // Summary section
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total Time**: ${Math.round(totalMinutes)} minutes`);
  lines.push(`- **Activities**: ${entries.length} entries`);
  lines.push("");

  // Accomplishments (Tada entries)
  const accomplishments = entries.filter((e) => e.type === "tada");
  if (accomplishments.length > 0) {
    lines.push("## Accomplishments");
    lines.push("");
    for (const entry of accomplishments) {
      lines.push(`- ${entry.name}`);
      if (entry.notes) {
        lines.push(`  - ${entry.notes}`);
      }
    }
    lines.push("");
  }

  // Activities by category
  const byCategory = new Map<string, Entry[]>();
  for (const entry of entries) {
    const category = entry.category || "Other";
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(entry);
  }

  lines.push("## Activities");
  lines.push("");

  for (const [category, categoryEntries] of byCategory) {
    lines.push(`### ${capitalize(category)}`);
    lines.push("");

    for (const entry of categoryEntries) {
      const duration = entry.durationSeconds
        ? ` - ${Math.round(entry.durationSeconds / 60)} minutes`
        : "";

      lines.push(`- **${entry.name}**${duration}`);

      if (entry.notes) {
        lines.push(`  > ${entry.notes}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Export to Obsidian weekly format
 */
export function toObsidianWeekly(
  entries: Entry[],
  startDate: string,
  endDate: string,
): string {
  const lines: string[] = [];

  // Calculate metrics
  const totalMinutes = entries.reduce(
    (sum, e) => sum + (e.durationSeconds || 0) / 60,
    0,
  );

  // YAML frontmatter
  lines.push("---");
  lines.push(`start_date: ${startDate}`);
  lines.push(`end_date: ${endDate}`);
  lines.push(`tags: [tada, weekly-review]`);
  lines.push(`total_minutes: ${Math.round(totalMinutes)}`);
  lines.push(`entries: ${entries.length}`);
  lines.push("---");
  lines.push("");

  // Title
  lines.push(`# Weekly Review - ${startDate} to ${endDate}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push("");
  lines.push(`- **Total Time**: ${Math.round(totalMinutes)} minutes`);
  lines.push(`- **Total Activities**: ${entries.length}`);
  lines.push("");

  // Highlights
  lines.push("## Highlights");
  lines.push("");
  const accomplishments = entries.filter((e) => e.type === "tada");
  if (accomplishments.length > 0) {
    for (const entry of accomplishments) {
      lines.push(`- ${entry.name}`);
    }
  } else {
    lines.push("- No accomplishments recorded this week");
  }
  lines.push("");

  // Breakdown by category
  lines.push("## Breakdown");
  lines.push("");

  const byCategory = new Map<string, { count: number; minutes: number }>();
  for (const entry of entries) {
    const category = entry.category || "Other";
    if (!byCategory.has(category)) {
      byCategory.set(category, { count: 0, minutes: 0 });
    }
    const stats = byCategory.get(category)!;
    stats.count++;
    stats.minutes += (entry.durationSeconds || 0) / 60;
  }

  for (const [category, stats] of byCategory) {
    lines.push(
      `- **${capitalize(category)}**: ${stats.count} activities, ${Math.round(stats.minutes)} minutes`,
    );
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * Export to Obsidian monthly format
 */
export function toObsidianMonthly(entries: Entry[], month: string): string {
  const lines: string[] = [];

  // Calculate metrics
  const totalMinutes = entries.reduce(
    (sum, e) => sum + (e.durationSeconds || 0) / 60,
    0,
  );

  // YAML frontmatter
  lines.push("---");
  lines.push(`month: ${month}`);
  lines.push(`tags: [tada, monthly-review]`);
  lines.push(`total_minutes: ${Math.round(totalMinutes)}`);
  lines.push(`entries: ${entries.length}`);
  lines.push("---");
  lines.push("");

  // Title
  const [year, monthNum] = month.split("-");
  const monthName = new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  lines.push(`# Monthly Review - ${monthName}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push("");
  lines.push(`- **Total Time**: ${Math.round(totalMinutes)} minutes`);
  lines.push(`- **Total Activities**: ${entries.length}`);
  lines.push(
    `- **Average per Day**: ${Math.round(totalMinutes / 30)} minutes`,
  );
  lines.push("");

  // Top categories
  lines.push("## Top Categories");
  lines.push("");

  const byCategory = new Map<string, { count: number; minutes: number }>();
  for (const entry of entries) {
    const category = entry.category || "Other";
    if (!byCategory.has(category)) {
      byCategory.set(category, { count: 0, minutes: 0 });
    }
    const stats = byCategory.get(category)!;
    stats.count++;
    stats.minutes += (entry.durationSeconds || 0) / 60;
  }

  const sortedCategories = Array.from(byCategory.entries()).sort(
    (a, b) => b[1].minutes - a[1].minutes,
  );

  for (const [category, stats] of sortedCategories) {
    lines.push(
      `- **${capitalize(category)}**: ${Math.round(stats.minutes)} minutes (${stats.count} activities)`,
    );
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
