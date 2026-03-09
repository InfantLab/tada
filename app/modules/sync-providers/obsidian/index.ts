/**
 * Obsidian Sync Provider
 *
 * Bidirectional sync between Ta-Da! entries and Obsidian vault
 * markdown files. Reads/writes .md files directly from the filesystem.
 * Self-registers with the sync provider registry on import.
 */

import { readdir, readFile, writeFile, stat, mkdir, rename, unlink } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { existsSync } from "node:fs";
import { registerSyncProvider } from "~/registry/syncProviders";
import {
  parseMarkdownEntry,
  renderMarkdownEntry,
  computeFileHash,
  frontmatterToEntry,
} from "./markdown";
import type {
  SyncProvider,
  SyncProviderConfig,
  ExternalChange,
  EntryWithMapping,
  SyncPushResult,
} from "~/types/syncProvider";
import type { ImportCandidate } from "~/types/importer";

interface ObsidianConfig {
  vaultPath: string;
  syncFolder: string;
  categories?: string[];
  subcategories?: string[];
  fileNamePattern: string;
  pushDeletes: boolean;
}

let config: ObsidianConfig = {
  vaultPath: "",
  syncFolder: "tada",
  fileNamePattern: "{{date}}-{{name}}.md",
  pushDeletes: false,
};

/**
 * Resolve the full sync folder path.
 */
function getSyncPath(): string {
  return join(config.vaultPath, config.syncFolder);
}

/**
 * Generate a filename from an entry using the configured pattern.
 */
function resolveFileName(entry: EntryWithMapping["entry"]): string {
  const date = entry.timestamp.split("T")[0] || "unknown";
  const name = slugify(entry.name);
  const category = entry.category || "uncategorized";
  const subcategory = entry.subcategory || "";
  const id = entry.id.slice(0, 8);

  let filename = config.fileNamePattern
    .replace("{{date}}", date)
    .replace("{{name}}", name)
    .replace("{{category}}", category)
    .replace("{{subcategory}}", subcategory)
    .replace("{{id}}", id);

  // Ensure .md extension
  if (!filename.endsWith(".md")) {
    filename += ".md";
  }

  return sanitizeFilename(filename);
}

/**
 * Slugify a string for use in filenames.
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
}

/**
 * Sanitize a filename for filesystem safety.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);
}

export const obsidianSyncProvider: SyncProvider = {
  id: "obsidian",
  name: "Obsidian",
  direction: "bidirectional",
  description: "Sync entries with Obsidian vault markdown files",

  configure(cfg: SyncProviderConfig): void {
    if (!cfg.vaultPath || typeof cfg.vaultPath !== "string") {
      throw new Error("obsidian provider: vaultPath is required");
    }

    if (!existsSync(cfg.vaultPath as string)) {
      throw new Error(`obsidian provider: vault path does not exist: ${cfg.vaultPath}`);
    }

    config = {
      vaultPath: cfg.vaultPath as string,
      syncFolder: (cfg.syncFolder as string) || "tada",
      categories: cfg.categories as string[] | undefined,
      subcategories: cfg.subcategories as string[] | undefined,
      fileNamePattern: (cfg.fileNamePattern as string) || "{{date}}-{{name}}.md",
      pushDeletes: (cfg.pushDeletes as boolean) || false,
    };

    // Ensure sync folder exists
    const syncPath = getSyncPath();
    if (!existsSync(syncPath)) {
      mkdir(syncPath, { recursive: true });
    }
  },

  async fetchChanges(since: Date | null): Promise<ExternalChange[]> {
    const syncPath = getSyncPath();
    const changes: ExternalChange[] = [];

    if (!existsSync(syncPath)) return changes;

    const files = await readdir(syncPath);
    const mdFiles = files.filter((f) => extname(f).toLowerCase() === ".md");

    for (const file of mdFiles) {
      const filePath = join(syncPath, file);

      try {
        const fileStat = await stat(filePath);

        // Skip files not modified since last sync
        if (since && fileStat.mtime <= since) {
          continue;
        }

        const content = await readFile(filePath, "utf-8");
        const fileHash = computeFileHash(content);
        const parsed = parseMarkdownEntry(content);
        const entryData = frontmatterToEntry(parsed);

        // Apply category/subcategory filters
        if (config.categories && entryData.category &&
            !config.categories.includes(entryData.category)) {
          continue;
        }
        if (config.subcategories && entryData.subcategory &&
            !config.subcategories.includes(entryData.subcategory)) {
          continue;
        }

        const candidate: ImportCandidate = {
          name: entryData.name,
          type: entryData.type,
          category: entryData.category,
          subcategory: entryData.subcategory,
          timestamp: entryData.timestamp,
          durationSeconds: entryData.durationSeconds,
          notes: entryData.notes,
          tags: entryData.tags,
          source: "obsidian",
          externalId: file,
        };

        changes.push({
          externalId: file,
          action: entryData.tadaId ? "update" : "create",
          data: candidate,
          externalHash: fileHash,
          externalTimestamp: fileStat.mtime.toISOString(),
        });
      } catch (error) {
        console.error(`[obsidian] Error reading ${file}:`, error);
      }
    }

    return changes;
  },

  async pushChanges(entries: EntryWithMapping[]): Promise<SyncPushResult[]> {
    const syncPath = getSyncPath();
    const results: SyncPushResult[] = [];

    // Ensure sync folder exists
    if (!existsSync(syncPath)) {
      await mkdir(syncPath, { recursive: true });
    }

    for (const item of entries) {
      try {
        // Handle deletes
        if (item.entry.deletedAt) {
          if (config.pushDeletes && item.mapping) {
            const filePath = join(syncPath, item.mapping.externalId);
            if (existsSync(filePath)) {
              // Move to .trash subfolder
              const trashPath = join(syncPath, ".trash");
              if (!existsSync(trashPath)) {
                await mkdir(trashPath, { recursive: true });
              }
              await rename(filePath, join(trashPath, item.mapping.externalId));
            }
          }
          results.push({
            externalId: item.mapping?.externalId || "",
            entryId: item.entry.id,
            success: true,
          });
          continue;
        }

        // Apply category/subcategory filters
        if (config.categories && item.entry.category &&
            !config.categories.includes(item.entry.category)) {
          continue;
        }
        if (config.subcategories && item.entry.subcategory &&
            !config.subcategories.includes(item.entry.subcategory)) {
          continue;
        }

        const content = renderMarkdownEntry(item.entry);
        const fileHash = computeFileHash(content);

        // Determine filename
        let filename: string;
        if (item.mapping) {
          filename = item.mapping.externalId;
        } else {
          filename = resolveFileName(item.entry);
        }

        const filePath = join(syncPath, filename);

        // Atomic write: write to temp file, then rename
        const tmpPath = filePath + ".tmp";
        await writeFile(tmpPath, content, "utf-8");
        await rename(tmpPath, filePath);

        results.push({
          externalId: filename,
          entryId: item.entry.id,
          success: true,
          externalHash: fileHash,
        });
      } catch (error) {
        results.push({
          externalId: item.mapping?.externalId || "",
          entryId: item.entry.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  },

  mapToInternal(raw: unknown): ImportCandidate {
    const parsed = parseMarkdownEntry(raw as string);
    const entry = frontmatterToEntry(parsed);
    return {
      name: entry.name,
      type: entry.type,
      category: entry.category,
      subcategory: entry.subcategory,
      timestamp: entry.timestamp,
      durationSeconds: entry.durationSeconds,
      notes: entry.notes,
      tags: entry.tags,
      source: "obsidian",
    };
  },

  mapToExternal(item: EntryWithMapping): unknown {
    return renderMarkdownEntry(item.entry);
  },
};

registerSyncProvider(obsidianSyncProvider);
