#!/usr/bin/env node

/**
 * Ta-Da! Obsidian Sync Script
 *
 * Bidirectional sync between a Ta-Da! instance and an Obsidian vault.
 * Reads/writes markdown files with YAML frontmatter.
 *
 * Usage:
 *   node scripts/sync-obsidian.mjs --vault ~/Documents/MyVault --api-key tada_key_xxx
 *   node scripts/sync-obsidian.mjs --config ~/Documents/MyVault/.tada-sync.json
 *   node scripts/sync-obsidian.mjs --vault ~/MyVault --dry-run
 *
 * Config file (.tada-sync.json):
 *   {
 *     "apiUrl": "http://localhost:3000",
 *     "apiKey": "tada_key_...",
 *     "syncFolder": "tada/dreams",
 *     "categories": ["moments"],
 *     "subcategories": ["dream"],
 *     "fileNamePattern": "{{date}}-{{name}}.md",
 *     "conflictStrategy": "newer-wins",
 *     "pushDeletes": false
 *   }
 */

import { readFile, writeFile, readdir, stat, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";

// ─── CLI Argument Parsing ──────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    vault: { type: "string", short: "v" },
    "api-key": { type: "string", short: "k" },
    "api-url": { type: "string", short: "u" },
    config: { type: "string", short: "c" },
    "dry-run": { type: "boolean", default: false },
    direction: { type: "string", short: "d" },
    categories: { type: "string" },
    subcategories: { type: "string" },
    "sync-folder": { type: "string" },
    "file-pattern": { type: "string" },
    "push-deletes": { type: "boolean", default: false },
    help: { type: "boolean", short: "h" },
    verbose: { type: "boolean" },
  },
  strict: true,
});

if (args.help) {
  console.log(`
Ta-Da! Obsidian Sync

Usage:
  node scripts/sync-obsidian.mjs [options]

Options:
  -v, --vault <path>       Path to Obsidian vault (required)
  -k, --api-key <key>      Ta-Da! API key (or set TADA_API_KEY env var)
  -u, --api-url <url>      Ta-Da! API URL (default: http://localhost:3000)
  -c, --config <path>      Path to .tada-sync.json config file
  -d, --direction <dir>    Sync direction: pull, push, or both (default: both)
  --dry-run                Preview changes without applying them
  --categories <list>      Comma-separated category filter
  --subcategories <list>   Comma-separated subcategory filter
  --sync-folder <path>     Subfolder in vault for synced files (default: tada)
  --file-pattern <pat>     Filename pattern (default: {{date}}-{{name}}.md)
  --push-deletes           Move deleted entry files to .trash
  --verbose                Show detailed output
  -h, --help               Show this help message

Environment:
  TADA_API_KEY             API key (alternative to --api-key)
  TADA_API_URL             API URL (alternative to --api-url)
`);
  process.exit(0);
}

// ─── Configuration ─────────────────────────────────────────────────────

/** @type {Record<string, unknown>} */
let fileConfig = {};

// Load config file if specified
if (args.config) {
  try {
    const raw = await readFile(args.config, "utf-8");
    fileConfig = JSON.parse(raw);
    log("Loaded config from " + args.config);
  } catch (e) {
    fatal(`Failed to read config file: ${e.message}`);
  }
} else if (args.vault) {
  // Try loading .tada-sync.json from vault root
  const autoConfig = join(args.vault, ".tada-sync.json");
  if (existsSync(autoConfig)) {
    try {
      const raw = await readFile(autoConfig, "utf-8");
      fileConfig = JSON.parse(raw);
      log("Loaded config from " + autoConfig);
    } catch {
      // Ignore — config file is optional
    }
  }
}

// CLI args override config file, env vars are fallback
const config = {
  vaultPath: args.vault || /** @type {string} */ (fileConfig.vaultPath) || "",
  apiKey: args["api-key"] || /** @type {string} */ (fileConfig.apiKey) || process.env.TADA_API_KEY || "",
  apiUrl: args["api-url"] || /** @type {string} */ (fileConfig.apiUrl) || process.env.TADA_API_URL || "http://localhost:3000",
  syncFolder: args["sync-folder"] || /** @type {string} */ (fileConfig.syncFolder) || "tada",
  direction: args.direction || /** @type {string} */ (fileConfig.direction) || "both",
  dryRun: args["dry-run"] || false,
  categories: args.categories?.split(",").map((s) => s.trim()) || /** @type {string[]|undefined} */ (fileConfig.categories),
  subcategories: args.subcategories?.split(",").map((s) => s.trim()) || /** @type {string[]|undefined} */ (fileConfig.subcategories),
  fileNamePattern: args["file-pattern"] || /** @type {string} */ (fileConfig.fileNamePattern) || "{{date}}-{{name}}.md",
  pushDeletes: args["push-deletes"] || /** @type {boolean} */ (fileConfig.pushDeletes) || false,
  verbose: args.verbose || false,
};

// Validate required config
if (!config.vaultPath) fatal("--vault is required (or set vaultPath in config)");
if (!config.apiKey) fatal("--api-key is required (or set TADA_API_KEY env var)");
if (!existsSync(config.vaultPath)) fatal(`Vault path does not exist: ${config.vaultPath}`);
if (!["pull", "push", "both"].includes(config.direction)) {
  fatal(`Invalid direction: ${config.direction}. Must be pull, push, or both`);
}

const syncPath = join(config.vaultPath, config.syncFolder);

// ─── Helpers ───────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[tada-sync] ${msg}`);
}

function verbose(msg) {
  if (config.verbose) console.log(`  ${msg}`);
}

function fatal(msg) {
  console.error(`[tada-sync] ERROR: ${msg}`);
  process.exit(1);
}

function computeHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
}

function resolveFileName(entry) {
  const date = entry.timestamp?.split("T")[0] || "unknown";
  const name = slugify(entry.name || "untitled");
  let filename = config.fileNamePattern
    .replace("{{date}}", date)
    .replace("{{name}}", name)
    .replace("{{category}}", entry.category || "uncategorized")
    .replace("{{subcategory}}", entry.subcategory || "")
    .replace("{{id}}", (entry.id || "").slice(0, 8));
  if (!filename.endsWith(".md")) filename += ".md";
  return filename.replace(/[<>:"/\\|?*]/g, "-").slice(0, 200);
}

// ─── Markdown Parse/Render ─────────────────────────────────────────────

function parseMarkdown(content) {
  const result = { frontmatter: {}, title: null, body: "" };
  let remaining = content;

  const fmMatch = remaining.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    result.frontmatter = parseYaml(fmMatch[1]);
    remaining = remaining.slice(fmMatch[0].length);
  }

  const titleMatch = remaining.match(/^#\s+(.+)\r?\n?/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
    remaining = remaining.slice(0, titleMatch.index) +
      remaining.slice(titleMatch.index + titleMatch[0].length);
  }

  result.body = remaining.trim();
  return result;
}

function parseYaml(yaml) {
  const result = {};
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (val.startsWith("[") && val.endsWith("]")) {
      result[key] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      continue;
    }
    if (/^-?\d+(\.\d+)?$/.test(val)) { result[key] = Number(val); continue; }
    if (val === "true") { result[key] = true; continue; }
    if (val === "false") { result[key] = false; continue; }
    if (val === "null" || val === "") { result[key] = null; continue; }
    result[key] = val;
  }
  return result;
}

function renderMarkdown(entry) {
  const lines = [];
  lines.push("---");
  lines.push(`tada_id: ${entry.id}`);
  lines.push(`type: ${entry.type}`);
  if (entry.category) lines.push(`category: ${entry.category}`);
  if (entry.subcategory) lines.push(`subcategory: ${entry.subcategory}`);
  lines.push(`timestamp: ${entry.timestamp}`);
  if (entry.durationSeconds != null) lines.push(`duration_seconds: ${entry.durationSeconds}`);
  const tags = entry.tags || [];
  if (tags.length > 0) lines.push(`tags: [${tags.join(", ")}]`);
  lines.push(`source: ${entry.source || "manual"}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${entry.name}`);
  lines.push("");
  if (entry.notes) { lines.push(entry.notes); lines.push(""); }
  return lines.join("\n");
}

// ─── API Client ────────────────────────────────────────────────────────

async function apiGet(path, params = {}) {
  const url = new URL(`/api/v1${path}`, config.apiUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${path} - ${text}`);
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(new URL(`/api/v1${path}`, config.apiUrl).toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: POST ${path} - ${text}`);
  }
  return res.json();
}

async function apiPatch(path, body) {
  const res = await fetch(new URL(`/api/v1${path}`, config.apiUrl).toString(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: PATCH ${path} - ${text}`);
  }
  return res.json();
}

// ─── Sync State ────────────────────────────────────────────────────────

const stateFile = join(config.vaultPath, ".tada-sync-state.json");

async function loadSyncState() {
  try {
    const raw = await readFile(stateFile, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { lastSyncedAt: null, mappings: {} };
  }
}

async function saveSyncState(state) {
  await writeFile(stateFile, JSON.stringify(state, null, 2), "utf-8");
}

// ─── Pull Phase ────────────────────────────────────────────────────────

async function pullFromTada(state) {
  const stats = { created: 0, updated: 0, deleted: 0, skipped: 0, errors: 0 };

  log("Pulling changes from Ta-Da!...");

  // Fetch entries changed since last sync
  const params = {
    limit: 1000,
    sort: "updatedAt",
    order: "asc",
  };
  if (state.lastSyncedAt) {
    params.updated_since = state.lastSyncedAt;
    params.include_deleted = "true";
  }
  if (config.categories) params.category = config.categories[0]; // API supports single category
  if (config.subcategories) params.subcategory = config.subcategories[0];

  const result = await apiGet("/entries", params);
  const entries = result.data || [];

  verbose(`Found ${entries.length} changed entries`);

  // Ensure sync folder exists
  if (!existsSync(syncPath)) {
    await mkdir(syncPath, { recursive: true });
  }

  for (const entry of entries) {
    try {
      const filename = state.mappings[entry.id]?.filename || resolveFileName(entry);

      if (entry.deletedAt) {
        // Entry was deleted — remove local file if it exists
        const filePath = join(syncPath, filename);
        if (existsSync(filePath)) {
          if (!config.dryRun) {
            const trashPath = join(syncPath, ".trash");
            if (!existsSync(trashPath)) await mkdir(trashPath, { recursive: true });
            await rename(filePath, join(trashPath, filename));
          }
          verbose(`Deleted: ${filename}`);
          stats.deleted++;
        }
        if (!config.dryRun) delete state.mappings[entry.id];
        continue;
      }

      // Check if file already exists and if content changed
      const filePath = join(syncPath, filename);
      if (existsSync(filePath) && state.mappings[entry.id]) {
        const currentContent = await readFile(filePath, "utf-8");
        const currentHash = computeHash(currentContent);

        // If file was locally modified since last sync, check conflict
        if (state.mappings[entry.id].fileHash !== currentHash) {
          const localModified = (await stat(filePath)).mtime;
          const remoteModified = new Date(entry.updatedAt);

          if (localModified > remoteModified) {
            verbose(`Skipped (local newer): ${filename}`);
            stats.skipped++;
            continue;
          }
          // Remote wins — overwrite local
        }

        // Check if remote content actually changed
        if (entry.contentHash === state.mappings[entry.id].contentHash) {
          stats.skipped++;
          continue;
        }
      }

      // Write file
      const content = renderMarkdown(entry);
      if (!config.dryRun) {
        await writeFile(filePath, content, "utf-8");
        state.mappings[entry.id] = {
          filename,
          contentHash: entry.contentHash,
          fileHash: computeHash(content),
          lastSyncedAt: new Date().toISOString(),
        };
      }

      if (existsSync(filePath) && state.mappings[entry.id]) {
        verbose(`Updated: ${filename}`);
        stats.updated++;
      } else {
        verbose(`Created: ${filename}`);
        stats.created++;
      }
    } catch (e) {
      console.error(`  Error syncing entry ${entry.id}: ${e.message}`);
      stats.errors++;
    }
  }

  return stats;
}

// ─── Push Phase ────────────────────────────────────────────────────────

async function pushToTada(state) {
  const stats = { created: 0, updated: 0, skipped: 0, errors: 0 };

  log("Pushing changes to Ta-Da!...");

  if (!existsSync(syncPath)) {
    verbose("Sync folder does not exist, nothing to push");
    return stats;
  }

  const files = await readdir(syncPath);
  const mdFiles = files.filter((f) => extname(f).toLowerCase() === ".md");

  verbose(`Found ${mdFiles.length} markdown files`);

  // Build reverse lookup: filename → entryId
  const fileToEntry = {};
  for (const [entryId, mapping] of Object.entries(state.mappings)) {
    fileToEntry[mapping.filename] = entryId;
  }

  for (const filename of mdFiles) {
    try {
      const filePath = join(syncPath, filename);
      const content = await readFile(filePath, "utf-8");
      const fileHash = computeHash(content);
      const parsed = parseMarkdown(content);
      const fm = parsed.frontmatter;

      // Apply category/subcategory filters
      if (config.categories && fm.category && !config.categories.includes(fm.category)) continue;
      if (config.subcategories && fm.subcategory && !config.subcategories.includes(fm.subcategory)) continue;

      const existingEntryId = fm.tada_id || fileToEntry[filename];

      if (existingEntryId) {
        // Existing entry — check if file changed since last sync
        const mapping = state.mappings[existingEntryId];
        if (mapping && mapping.fileHash === fileHash) {
          stats.skipped++;
          continue;
        }

        // File changed — update entry in Ta-Da!
        const updates = {
          name: parsed.title || fm.name || "Untitled",
          notes: parsed.body || null,
          type: fm.type || "moment",
          category: fm.category || null,
          subcategory: fm.subcategory || null,
          durationSeconds: fm.duration_seconds || null,
          tags: Array.isArray(fm.tags) ? fm.tags : [],
        };

        if (!config.dryRun) {
          const result = await apiPatch(`/entries/${existingEntryId}`, updates);
          const entry = result.data;
          state.mappings[existingEntryId] = {
            filename,
            contentHash: entry.contentHash || null,
            fileHash,
            lastSyncedAt: new Date().toISOString(),
          };

          // Write back tada_id to frontmatter if missing
          if (!fm.tada_id) {
            const updatedContent = renderMarkdown({ ...entry, id: existingEntryId });
            await writeFile(filePath, updatedContent, "utf-8");
            state.mappings[existingEntryId].fileHash = computeHash(updatedContent);
          }
        }

        verbose(`Updated: ${filename} -> entry ${existingEntryId}`);
        stats.updated++;
      } else {
        // New file — create entry in Ta-Da!
        const newEntry = {
          name: parsed.title || fm.name || "Untitled",
          type: fm.type || "moment",
          category: fm.category || null,
          subcategory: fm.subcategory || null,
          timestamp: fm.timestamp || new Date().toISOString(),
          durationSeconds: fm.duration_seconds || null,
          notes: parsed.body || null,
          tags: Array.isArray(fm.tags) ? fm.tags : [],
          source: "obsidian",
        };

        if (!config.dryRun) {
          const result = await apiPost("/entries", newEntry);
          const entry = result.data;

          // Write back tada_id to frontmatter
          const updatedContent = renderMarkdown({ ...entry, id: entry.id });
          await writeFile(filePath, updatedContent, "utf-8");

          state.mappings[entry.id] = {
            filename,
            contentHash: entry.contentHash || null,
            fileHash: computeHash(updatedContent),
            lastSyncedAt: new Date().toISOString(),
          };
        }

        verbose(`Created: ${filename} -> new entry`);
        stats.created++;
      }
    } catch (e) {
      console.error(`  Error pushing ${filename}: ${e.message}`);
      stats.errors++;
    }
  }

  return stats;
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  log(`Sync: ${config.vaultPath}/${config.syncFolder} <-> ${config.apiUrl}`);
  log(`Direction: ${config.direction}${config.dryRun ? " (dry run)" : ""}`);
  if (config.categories) log(`Categories: ${config.categories.join(", ")}`);
  if (config.subcategories) log(`Subcategories: ${config.subcategories.join(", ")}`);
  console.log("");

  // Verify API connectivity
  try {
    await apiGet("/sync/status");
  } catch (e) {
    fatal(`Cannot connect to Ta-Da! API at ${config.apiUrl}: ${e.message}`);
  }

  const state = await loadSyncState();

  let pullStats = null;
  let pushStats = null;

  if (config.direction === "pull" || config.direction === "both") {
    pullStats = await pullFromTada(state);
  }

  if (config.direction === "push" || config.direction === "both") {
    pushStats = await pushToTada(state);
  }

  // Update last synced timestamp
  if (!config.dryRun) {
    state.lastSyncedAt = new Date().toISOString();
    await saveSyncState(state);
  }

  // Print summary
  console.log("");
  log("=== Sync Summary ===");
  if (pullStats) {
    log(`Pull: ${pullStats.created} created, ${pullStats.updated} updated, ${pullStats.deleted} deleted, ${pullStats.skipped} skipped${pullStats.errors ? `, ${pullStats.errors} errors` : ""}`);
  }
  if (pushStats) {
    log(`Push: ${pushStats.created} created, ${pushStats.updated} updated, ${pushStats.skipped} skipped${pushStats.errors ? `, ${pushStats.errors} errors` : ""}`);
  }
  if (config.dryRun) {
    log("(dry run — no changes applied)");
  }

  // Exit code
  const hasErrors = (pullStats?.errors || 0) + (pushStats?.errors || 0) > 0;
  process.exit(hasErrors ? 1 : 0);
}

main().catch((e) => {
  fatal(e.message);
});
