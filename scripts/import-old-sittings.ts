/**
 * Import old meditation sittings from the original meditation app export.
 *
 * File format: ࿄࿌startTime࿌endTime࿌timerDurationMs࿌[optional note]
 *
 * Usage:
 *   bun scripts/import-old-sittings.ts                  # dry-run (default)
 *   bun scripts/import-old-sittings.ts --apply           # import safe entries + update durations
 *   bun scripts/import-old-sittings.ts --apply-review    # apply decisions from import-review.json
 */

import { Database } from "bun:sqlite";
import { readFileSync, writeFileSync, existsSync } from "fs";
import {
  DEFAULT_DB_PATH,
  EXPORT_FILE,
  REVIEW_FILE,
  type ClassifiedEntry,
  type ReviewEntry,
  parseSittings,
  classifySittings,
  loadDbEntries,
  getUserId,
  printClassificationReport,
} from "./lib/import-utils";

// ---------------------------------------------------------------------------
// Apply imports
// ---------------------------------------------------------------------------

function applyImports(
  db: Database,
  userId: string,
  classified: ClassifiedEntry[],
): { imported: number; updated: number; skipped: number; flagged: number } {
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let flagged = 0;

  const reviewEntries: ReviewEntry[] = [];

  const insertStmt = db.prepare(`
    INSERT INTO entries (id, user_id, type, name, category, subcategory, timestamp, duration_seconds, timezone, data, tags, notes, source, created_at, updated_at)
    VALUES (?, ?, 'timed', 'Meditation', 'mindfulness', 'sitting', ?, ?, 'UTC', '{}', '[]', ?, 'import', datetime('now'), datetime('now'))
  `);

  const updateDurationStmt = db.prepare(`
    UPDATE entries SET duration_seconds = ?, updated_at = datetime('now') WHERE id = ?
  `);

  for (const entry of classified) {
    switch (entry.classification) {
      case "safe-import": {
        const id = crypto.randomUUID();
        insertStmt.run(
          id,
          userId,
          entry.sitting.start.toISOString(),
          entry.sitting.durationSeconds,
          entry.sitting.note || null,
        );
        imported++;
        break;
      }

      case "duplicate-exact":
      case "duplicate-close-db-longer":
        skipped++;
        break;

      case "duplicate-close-file-longer": {
        const dbEntry = entry.matchedDbEntries![0];
        updateDurationStmt.run(entry.sitting.durationSeconds, dbEntry.id);
        updated++;
        break;
      }

      case "duplicate-close-suspicious":
      case "overlap":
      case "overlap-multi": {
        reviewEntries.push({
          line: entry.sitting.line,
          classification: entry.classification,
          sitting: {
            start: entry.sitting.start.toISOString(),
            end: entry.sitting.end.toISOString(),
            durationSeconds: entry.sitting.durationSeconds,
            note: entry.sitting.note,
          },
          conflicts: (entry.matchedDbEntries || []).map((e) => ({
            id: e.id,
            timestamp: e.timestamp,
            durationSeconds: e.duration_seconds,
            name: e.name,
          })),
          resolution: null,
        });
        flagged++;
        break;
      }
    }
  }

  if (reviewEntries.length > 0) {
    writeFileSync(REVIEW_FILE, JSON.stringify(reviewEntries, null, 2));
    console.log(`\nWrote ${reviewEntries.length} entries to ${REVIEW_FILE} for manual review.`);
  }

  return { imported, updated, skipped, flagged };
}

// ---------------------------------------------------------------------------
// Apply reviewed entries
// ---------------------------------------------------------------------------

function applyReview(db: Database, userId: string): void {
  if (!existsSync(REVIEW_FILE)) {
    console.error(`Review file not found: ${REVIEW_FILE}`);
    process.exit(1);
  }

  const reviewEntries: ReviewEntry[] = JSON.parse(
    readFileSync(REVIEW_FILE, "utf-8"),
  );

  const unresolved = reviewEntries.filter((e) => !e.resolution);
  if (unresolved.length > 0) {
    console.error(
      `${unresolved.length} entries still need a resolution. Edit ${REVIEW_FILE} and set "resolution" for each entry.`,
    );
    process.exit(1);
  }

  const insertStmt = db.prepare(`
    INSERT INTO entries (id, user_id, type, name, category, subcategory, timestamp, duration_seconds, timezone, data, tags, notes, source, created_at, updated_at)
    VALUES (?, ?, 'timed', 'Meditation', 'mindfulness', 'sitting', ?, ?, 'UTC', '{}', '[]', ?, 'import', datetime('now'), datetime('now'))
  `);

  const updateDurationStmt = db.prepare(`
    UPDATE entries SET duration_seconds = ?, updated_at = datetime('now') WHERE id = ?
  `);

  const deleteStmt = db.prepare(`
    UPDATE entries SET deleted_at = datetime('now') WHERE id = ?
  `);

  let imported = 0;
  let replaced = 0;
  let durationUpdated = 0;
  let skippedCount = 0;

  for (const entry of reviewEntries) {
    switch (entry.resolution) {
      case "import": {
        const id = crypto.randomUUID();
        insertStmt.run(
          id,
          userId,
          entry.sitting.start,
          entry.sitting.durationSeconds,
          entry.sitting.note || null,
        );
        imported++;
        break;
      }

      case "replace": {
        // Soft-delete conflicting entries, then import
        for (const conflict of entry.conflicts) {
          deleteStmt.run(conflict.id);
        }
        const id = crypto.randomUUID();
        insertStmt.run(
          id,
          userId,
          entry.sitting.start,
          entry.sitting.durationSeconds,
          entry.sitting.note || null,
        );
        replaced++;
        break;
      }

      case "update-duration": {
        if (entry.conflicts.length > 0) {
          updateDurationStmt.run(
            entry.sitting.durationSeconds,
            entry.conflicts[0].id,
          );
          durationUpdated++;
        }
        break;
      }

      case "skip":
        skippedCount++;
        break;
    }
  }

  console.log("\n=== Review Applied ===");
  console.log(`Imported:         ${imported}`);
  console.log(`Replaced:         ${replaced}`);
  console.log(`Duration updated: ${durationUpdated}`);
  console.log(`Skipped:          ${skippedCount}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes("--apply")
    ? "apply"
    : args.includes("--apply-review")
      ? "apply-review"
      : "dry-run";

  // Support --db <path> to target a different database
  const dbFlagIdx = args.indexOf("--db");
  const dbPath = dbFlagIdx !== -1 && args[dbFlagIdx + 1] ? args[dbFlagIdx + 1] : DEFAULT_DB_PATH;

  console.log(`Mode: ${mode}`);
  console.log(`Database: ${dbPath}\n`);

  const db = new Database(dbPath);
  const userId = getUserId(db);

  if (mode === "apply-review") {
    applyReview(db, userId);
    db.close();
    return;
  }

  // Parse and classify
  console.log("Parsing export file...");
  const sittings = parseSittings(EXPORT_FILE);
  console.log(`Parsed ${sittings.length} sittings (${sittings[0].startRaw} to ${sittings[sittings.length - 1].startRaw})`);

  console.log("\nLoading existing DB entries...");
  const dbEntries = loadDbEntries(db);
  console.log(`Found ${dbEntries.length} existing mindfulness entries`);

  console.log("\nClassifying...");
  const classified = classifySittings(sittings, dbEntries);

  printClassificationReport(classified);

  if (mode === "dry-run") {
    // Show some sample flagged entries
    const flagged = classified.filter(
      (e) =>
        e.classification === "duplicate-close-suspicious" ||
        e.classification === "overlap" ||
        e.classification === "overlap-multi",
    );
    if (flagged.length > 0) {
      console.log("\n=== Sample Flagged Entries (first 5) ===");
      for (const entry of flagged.slice(0, 5)) {
        console.log(`\n  Line ${entry.sitting.line}: ${entry.classification}`);
        console.log(`  File: ${entry.sitting.start.toISOString()} (${entry.sitting.durationSeconds}s = ${Math.round(entry.sitting.durationSeconds / 60)}min)`);
        for (const dbE of entry.matchedDbEntries || []) {
          console.log(`  DB:   ${dbE.timestamp} (${dbE.duration_seconds}s = ${Math.round((dbE.duration_seconds || 0) / 60)}min) "${dbE.name}"`);
        }
        if (entry.timeDiffSeconds !== undefined) {
          console.log(`  Time diff: ${entry.timeDiffSeconds.toFixed(0)}s, Duration ratio: ${entry.durationRatio?.toFixed(1)}x`);
        }
      }
    }

    console.log(`\nRun with --apply to execute the import.`);
  } else {
    console.log("\nApplying...");
    const result = applyImports(db, userId, classified);
    console.log("\n=== Import Complete ===");
    console.log(`Imported:  ${result.imported}`);
    console.log(`Updated:   ${result.updated}`);
    console.log(`Skipped:   ${result.skipped}`);
    console.log(`Flagged:   ${result.flagged}`);

    if (result.flagged > 0) {
      console.log(`\nReview flagged entries in ${REVIEW_FILE}`);
      console.log(`Set "resolution" for each entry, then run: bun scripts/import-old-sittings.ts --apply-review`);
    }
  }

  db.close();
}

main();
