/**
 * Obsidian Markdown Parser & Renderer
 *
 * Handles conversion between Ta-Da! entries and Obsidian-compatible
 * markdown files with YAML frontmatter.
 */

import { createHash } from "node:crypto";

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  title: string | null;
  body: string;
}

/**
 * Parse an Obsidian markdown file into frontmatter, title, and body.
 */
export function parseMarkdownEntry(content: string): ParsedMarkdown {
  const result: ParsedMarkdown = {
    frontmatter: {},
    title: null,
    body: "",
  };

  let remaining = content;

  // Extract YAML frontmatter (between --- delimiters)
  const fmMatch = remaining.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    result.frontmatter = parseYamlSimple(fmMatch[1]!);
    remaining = remaining.slice(fmMatch[0].length);
  }

  // Extract first # heading as title
  const titleMatch = remaining.match(/^#\s+(.+)\r?\n?/m);
  if (titleMatch) {
    result.title = titleMatch[1]!.trim();
    remaining = remaining.slice(0, titleMatch.index) +
      remaining.slice(titleMatch.index! + titleMatch[0].length);
  }

  result.body = remaining.trim();
  return result;
}

/**
 * Render a Ta-Da! entry as an Obsidian markdown file.
 */
export function renderMarkdownEntry(entry: {
  id: string;
  name: string;
  type: string;
  category: string | null;
  subcategory: string | null;
  timestamp: string;
  durationSeconds: number | null;
  notes: string | null;
  tags: string[] | null;
  source: string;
}): string {
  const lines: string[] = [];

  // YAML frontmatter
  lines.push("---");
  lines.push(`tada_id: ${entry.id}`);
  lines.push(`type: ${entry.type}`);
  if (entry.category) lines.push(`category: ${entry.category}`);
  if (entry.subcategory) lines.push(`subcategory: ${entry.subcategory}`);
  lines.push(`timestamp: ${entry.timestamp}`);
  if (entry.durationSeconds != null) {
    lines.push(`duration_seconds: ${entry.durationSeconds}`);
  }
  if (entry.tags && entry.tags.length > 0) {
    lines.push(`tags: [${entry.tags.join(", ")}]`);
  }
  lines.push(`source: ${entry.source}`);
  lines.push("---");
  lines.push("");

  // Title
  lines.push(`# ${entry.name}`);
  lines.push("");

  // Body (notes)
  if (entry.notes) {
    lines.push(entry.notes);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Compute SHA-256 hash of file content for change detection.
 */
export function computeFileHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Convert parsed frontmatter + body back to an ImportCandidate-like object.
 */
export function frontmatterToEntry(parsed: ParsedMarkdown): {
  name: string;
  type: string;
  category?: string;
  subcategory?: string;
  timestamp: string;
  durationSeconds?: number;
  notes?: string;
  tags?: string[];
  source?: string;
  tadaId?: string;
} {
  const fm = parsed.frontmatter;

  return {
    tadaId: fm.tada_id as string | undefined,
    name: parsed.title || (fm.name as string) || "Untitled",
    type: (fm.type as string) || "moment",
    category: fm.category as string | undefined,
    subcategory: fm.subcategory as string | undefined,
    timestamp: (fm.timestamp as string) || new Date().toISOString(),
    durationSeconds: fm.duration_seconds as number | undefined,
    notes: parsed.body || undefined,
    tags: parseTagsValue(fm.tags),
    source: (fm.source as string) || "obsidian",
  };
}

/**
 * Simple YAML parser for frontmatter.
 * Handles key: value pairs, arrays [a, b, c], and quoted strings.
 * Not a full YAML parser — covers the subset we generate.
 */
function parseYamlSimple(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value: string | number | boolean | string[] = trimmed.slice(colonIdx + 1).trim();

    // Remove quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Parse inline arrays: [a, b, c]
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1);
      result[key] = inner
        ? inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
        : [];
      continue;
    }

    // Parse numbers
    if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
      result[key] = Number(value);
      continue;
    }

    // Parse booleans
    if (value === "true") { result[key] = true; continue; }
    if (value === "false") { result[key] = false; continue; }
    if (value === "null" || value === "") { result[key] = null; continue; }

    result[key] = value;
  }

  return result;
}

/**
 * Parse tags from frontmatter value (could be array or string).
 */
function parseTagsValue(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}
