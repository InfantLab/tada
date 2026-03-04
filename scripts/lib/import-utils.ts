/**
 * Shared utilities for the old-sittings import scripts.
 *
 * Extracted so that both the direct-DB import (import-old-sittings.ts)
 * and the API-based import (api-import.ts) share the same parsing
 * and classification logic.
 */

import type { Database } from "bun:sqlite";
import { readFileSync } from "fs";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const CLOSE_MATCH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
export const SUSPICIOUS_DURATION_RATIO = 2; // >2x difference = suspicious
export const DEFAULT_DB_PATH = "./data/db.sqlite";
export const EXPORT_FILE = "./old_data/exported-sittings-20210114092017.txt";
export const REVIEW_FILE = "./old_data/import-review.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedSitting {
  line: number;
  startRaw: string;
  endRaw: string;
  start: Date;
  end: Date;
  durationSeconds: number;
  timerDurationMs: number;
  note?: string;
}

export interface DbEntry {
  id: string;
  timestamp: string;
  duration_seconds: number | null;
  name: string;
  start: Date;
  end: Date;
}

export type Classification =
  | "safe-import"
  | "duplicate-exact"
  | "duplicate-close-file-longer"
  | "duplicate-close-db-longer"
  | "duplicate-close-suspicious"
  | "overlap"
  | "overlap-multi";

export interface ClassifiedEntry {
  sitting: ParsedSitting;
  classification: Classification;
  matchedDbEntries?: DbEntry[];
  timeDiffSeconds?: number;
  durationRatio?: number;
}

export interface ReviewEntry {
  line: number;
  classification: string;
  sitting: {
    start: string;
    end: string;
    durationSeconds: number;
    note?: string;
  };
  conflicts: Array<{
    id: string;
    timestamp: string;
    durationSeconds: number | null;
    name: string;
  }>;
  resolution: "import" | "skip" | "replace" | "update-duration" | null;
}

// ---------------------------------------------------------------------------
// Parse export file
// ---------------------------------------------------------------------------

export function parseSittings(filePath: string): ParsedSitting[] {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const sittings: ParsedSitting[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i]
      .split("࿌")
      .filter((p) => p.trim().length > 0 && p.trim() !== "࿄");
    if (parts.length < 3) continue;

    const startRaw = parts[0].trim();
    const endRaw = parts[1].trim();
    const timerMs = parseInt(parts[2].trim());
    const note =
      parts.length > 3 && parts[3].trim().length > 0
        ? parts[3].trim()
        : undefined;

    const start = new Date(startRaw.replace(" ", "T") + "Z");
    const end = new Date(endRaw.replace(" ", "T") + "Z");
    const durationSeconds = Math.round(
      (end.getTime() - start.getTime()) / 1000,
    );

    sittings.push({
      line: i + 1,
      startRaw,
      endRaw,
      start,
      end,
      durationSeconds,
      timerDurationMs: timerMs,
      note,
    });
  }

  return sittings;
}

// ---------------------------------------------------------------------------
// Load DB entries
// ---------------------------------------------------------------------------

export function loadDbEntries(db: Database): DbEntry[] {
  const rows = db
    .query(
      `SELECT id, timestamp, duration_seconds, name
       FROM entries
       WHERE category = 'mindfulness' AND deleted_at IS NULL
       ORDER BY timestamp ASC`,
    )
    .all() as any[];

  return rows.map((r) => {
    const start = new Date(r.timestamp);
    const dur = r.duration_seconds || 0;
    return {
      id: r.id,
      timestamp: r.timestamp,
      duration_seconds: r.duration_seconds,
      name: r.name,
      start,
      end: new Date(start.getTime() + dur * 1000),
    };
  });
}

// ---------------------------------------------------------------------------
// Classify each sitting
// ---------------------------------------------------------------------------

export function classifySittings(
  sittings: ParsedSitting[],
  dbEntries: DbEntry[],
): ClassifiedEntry[] {
  const results: ClassifiedEntry[] = [];

  for (const sitting of sittings) {
    // Find closest DB entry by start time
    let closestEntry: DbEntry | null = null;
    let closestDiffMs = Infinity;

    for (const dbE of dbEntries) {
      const diff = Math.abs(sitting.start.getTime() - dbE.start.getTime());
      if (diff < closestDiffMs) {
        closestDiffMs = diff;
        closestEntry = dbE;
      }
    }

    const closestDiffSeconds = closestDiffMs / 1000;

    // Case 1: No DB entries at all, or far from any
    if (!closestEntry || closestDiffMs > CLOSE_MATCH_THRESHOLD_MS) {
      // Check for time range overlaps
      const overlapping = dbEntries.filter(
        (dbE) => sitting.start < dbE.end && sitting.end > dbE.start,
      );

      if (overlapping.length === 0) {
        results.push({ sitting, classification: "safe-import" });
      } else if (overlapping.length === 1) {
        results.push({
          sitting,
          classification: "overlap",
          matchedDbEntries: overlapping,
        });
      } else {
        results.push({
          sitting,
          classification: "overlap-multi",
          matchedDbEntries: overlapping,
        });
      }
      continue;
    }

    // Case 2: Exact timestamp match
    if (closestDiffMs === 0) {
      results.push({
        sitting,
        classification: "duplicate-exact",
        matchedDbEntries: [closestEntry],
        timeDiffSeconds: 0,
      });
      continue;
    }

    // Case 3: Close match (within 5 min)
    const dbDuration = closestEntry.duration_seconds || 0;
    const fileDuration = sitting.durationSeconds;
    const ratio = dbDuration > 0 ? fileDuration / dbDuration : Infinity;

    // Check if suspicious (>2x difference)
    if (ratio > SUSPICIOUS_DURATION_RATIO || (dbDuration > 0 && ratio < 1 / SUSPICIOUS_DURATION_RATIO)) {
      results.push({
        sitting,
        classification: "duplicate-close-suspicious",
        matchedDbEntries: [closestEntry],
        timeDiffSeconds: closestDiffSeconds,
        durationRatio: ratio,
      });
    } else if (fileDuration > dbDuration) {
      results.push({
        sitting,
        classification: "duplicate-close-file-longer",
        matchedDbEntries: [closestEntry],
        timeDiffSeconds: closestDiffSeconds,
        durationRatio: ratio,
      });
    } else {
      results.push({
        sitting,
        classification: "duplicate-close-db-longer",
        matchedDbEntries: [closestEntry],
        timeDiffSeconds: closestDiffSeconds,
        durationRatio: ratio,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Get user ID (single-user self-hosted)
// ---------------------------------------------------------------------------

export function getUserId(db: Database): string {
  const row = db.query("SELECT id FROM users LIMIT 1").get() as any;
  if (!row) throw new Error("No users found in database");
  return row.id;
}

// ---------------------------------------------------------------------------
// Classification summary
// ---------------------------------------------------------------------------

export function printClassificationReport(classified: ClassifiedEntry[]): void {
  const counts: Record<string, number> = {};
  for (const entry of classified) {
    counts[entry.classification] = (counts[entry.classification] || 0) + 1;
  }

  console.log("\n=== Classification Results ===");
  console.log(`safe-import:                  ${counts["safe-import"] || 0}  (new entries to import)`);
  console.log(`duplicate-exact:              ${counts["duplicate-exact"] || 0}  (exact match, skip)`);
  console.log(`duplicate-close-file-longer:  ${counts["duplicate-close-file-longer"] || 0}  (update DB duration)`);
  console.log(`duplicate-close-db-longer:    ${counts["duplicate-close-db-longer"] || 0}  (DB already longer, skip)`);
  console.log(`duplicate-close-suspicious:   ${counts["duplicate-close-suspicious"] || 0}  (>2x diff, needs review)`);
  console.log(`overlap:                      ${counts["overlap"] || 0}  (time overlap, needs review)`);
  console.log(`overlap-multi:                ${counts["overlap-multi"] || 0}  (multi overlap, needs review)`);
  console.log(`---`);
  console.log(`Total:                        ${classified.length}`);
  console.log(`Will import:                  ${counts["safe-import"] || 0}`);
  console.log(`Will update duration:         ${counts["duplicate-close-file-longer"] || 0}`);
  console.log(`Will skip:                    ${(counts["duplicate-exact"] || 0) + (counts["duplicate-close-db-longer"] || 0)}`);
  console.log(`Needs review:                 ${(counts["duplicate-close-suspicious"] || 0) + (counts["overlap"] || 0) + (counts["overlap-multi"] || 0)}`);
}
