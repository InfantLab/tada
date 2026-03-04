/**
 * Import old meditation sittings into the live Tada app via the REST API.
 *
 * This is the concurrent-user-safe alternative to the direct-DB import.
 * It re-classifies the export file against a local DB snapshot, reads
 * review decisions from import-review.json, then applies all changes
 * through the v1 API.
 *
 * Usage:
 *   bun scripts/api-import.ts                           # dry-run (default)
 *   bun scripts/api-import.ts --apply                   # execute API calls
 *   bun scripts/api-import.ts --apply --resume          # resume interrupted run
 *   bun scripts/api-import.ts --db ./data/live-db.sqlite  # specify DB path
 *
 * Environment:
 *   TADA_API_KEY   — required, a v1 API key (tada_key_...)
 *   TADA_API_URL   — optional, defaults to https://tada.living
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
  printClassificationReport,
} from "./lib/import-utils";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LIVE_DB_PATH = "./data/live-db.sqlite";
const PROGRESS_FILE = "./old_data/api-import-progress.json";
const PACE_MS = 700; // ~85 req/min, safely under 100/min rate limit
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApiAction =
  | { type: "create"; sitting: { start: string; durationSeconds: number; note?: string } }
  | { type: "patch"; entryId: string; durationSeconds: number }
  | { type: "replace"; deleteIds: string[]; sitting: { start: string; durationSeconds: number; note?: string } }
  | { type: "skip"; reason: string };

interface ActionPlanEntry {
  line: number;
  action: ApiAction;
}

interface ProgressState {
  startedAt: string;
  lastProcessedIndex: number;
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: Array<{
    index: number;
    line: number;
    action: string;
    httpStatus?: number;
    error: string;
  }>;
  completed: boolean;
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

class TadaApiClient {
  private lastRequestTime = 0;

  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  async createEntry(sitting: { start: string; durationSeconds: number; note?: string }): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      type: "timed",
      name: "Meditation",
      category: "mindfulness",
      subcategory: "sitting",
      timestamp: sitting.start,
      durationSeconds: sitting.durationSeconds,
      timezone: "UTC",
      tags: ["old-app-import"],
    };
    if (sitting.note) {
      body.notes = sitting.note;
    }

    const res = await this.request("POST", "/entries", body);
    const json = await res.json();
    return { id: json.data?.id || "unknown" };
  }

  async patchEntry(id: string, fields: { durationSeconds: number }): Promise<boolean> {
    const res = await this.request("PATCH", `/entries/${id}`, fields);
    return res.ok;
  }

  async deleteEntry(id: string): Promise<boolean> {
    const res = await this.request("DELETE", `/entries/${id}`);
    return res.ok;
  }

  private async request(method: string, path: string, body?: unknown): Promise<Response> {
    await this.pace();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`  Retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`);
        await sleep(delay);
      }

      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (res.ok || res.status === 404) {
          this.lastRequestTime = Date.now();
          return res;
        }

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") || "10");
          console.log(`  Rate limited, waiting ${retryAfter}s...`);
          await sleep(retryAfter * 1000);
          continue;
        }

        if (res.status >= 500) {
          lastError = new Error(`HTTP ${res.status}: ${await res.text()}`);
          continue;
        }

        // 4xx (not 404/429) — don't retry
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("HTTP ")) throw err;
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === MAX_RETRIES) break;
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  private async pace(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < PACE_MS) {
      await sleep(PACE_MS - elapsed);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Build action plan
// ---------------------------------------------------------------------------

function buildActionPlan(
  classified: ClassifiedEntry[],
  reviewEntries: ReviewEntry[],
): ActionPlanEntry[] {
  // Index review decisions by line number
  const reviewByLine = new Map<number, ReviewEntry>();
  for (const re of reviewEntries) {
    reviewByLine.set(re.line, re);
  }

  const plan: ActionPlanEntry[] = [];

  for (const entry of classified) {
    const line = entry.sitting.line;
    const sitting = {
      start: entry.sitting.start.toISOString(),
      durationSeconds: entry.sitting.durationSeconds,
      note: entry.sitting.note,
    };

    switch (entry.classification) {
      case "safe-import":
        plan.push({ line, action: { type: "create", sitting } });
        break;

      case "duplicate-exact":
        plan.push({ line, action: { type: "skip", reason: "exact duplicate" } });
        break;

      case "duplicate-close-db-longer":
        plan.push({ line, action: { type: "skip", reason: "DB already has longer duration" } });
        break;

      case "duplicate-close-file-longer": {
        const dbEntry = entry.matchedDbEntries![0];
        plan.push({
          line,
          action: { type: "patch", entryId: dbEntry.id, durationSeconds: entry.sitting.durationSeconds },
        });
        break;
      }

      case "duplicate-close-suspicious":
      case "overlap":
      case "overlap-multi": {
        const review = reviewByLine.get(line);
        if (!review || !review.resolution) {
          plan.push({ line, action: { type: "skip", reason: `unresolved review (${entry.classification})` } });
          break;
        }

        switch (review.resolution) {
          case "skip":
            plan.push({ line, action: { type: "skip", reason: "reviewed: skip" } });
            break;
          case "import":
            plan.push({ line, action: { type: "create", sitting } });
            break;
          case "replace": {
            const deleteIds = review.conflicts.map((c) => c.id);
            plan.push({ line, action: { type: "replace", deleteIds, sitting } });
            break;
          }
          case "update-duration": {
            const conflictId = review.conflicts[0]?.id;
            if (conflictId) {
              plan.push({
                line,
                action: { type: "patch", entryId: conflictId, durationSeconds: review.sitting.durationSeconds },
              });
            } else {
              plan.push({ line, action: { type: "skip", reason: "no conflict to update" } });
            }
            break;
          }
        }
        break;
      }
    }
  }

  return plan;
}

// ---------------------------------------------------------------------------
// Print action summary
// ---------------------------------------------------------------------------

function printActionSummary(plan: ActionPlanEntry[]): void {
  let creates = 0;
  let patches = 0;
  let replaces = 0;
  let skips = 0;
  let unresolvedSkips = 0;

  for (const { action } of plan) {
    switch (action.type) {
      case "create": creates++; break;
      case "patch": patches++; break;
      case "replace": replaces++; break;
      case "skip":
        skips++;
        if (action.reason.startsWith("unresolved")) unresolvedSkips++;
        break;
    }
  }

  console.log("\n=== API Action Plan ===");
  console.log(`POST  (create):   ${creates}`);
  console.log(`PATCH (update):   ${patches}`);
  console.log(`REPLACE (del+create): ${replaces}`);
  console.log(`Skip:             ${skips}`);
  if (unresolvedSkips > 0) {
    console.log(`  (${unresolvedSkips} skipped due to unresolved reviews)`);
  }
  console.log(`---`);
  console.log(`Total API calls:  ${creates + patches + replaces * 2}  (approx ${Math.ceil((creates + patches + replaces * 2) * PACE_MS / 60000)} min at ${PACE_MS}ms pacing)`);
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

async function execute(
  client: TadaApiClient,
  plan: ActionPlanEntry[],
  resumeFromIndex: number,
): Promise<ProgressState> {
  const progress: ProgressState = {
    startedAt: new Date().toISOString(),
    lastProcessedIndex: resumeFromIndex - 1,
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors: [],
    completed: false,
  };

  const total = plan.length;

  for (let i = resumeFromIndex; i < plan.length; i++) {
    const { line, action } = plan[i];
    const prefix = `[${String(i + 1).padStart(String(total).length)}/${total}]`;

    try {
      switch (action.type) {
        case "skip":
          console.log(`${prefix} SKIP  line ${line}: ${action.reason}`);
          progress.skipped++;
          break;

        case "create": {
          const result = await client.createEntry(action.sitting);
          console.log(`${prefix} POST  line ${line}: ${action.sitting.start} (${action.sitting.durationSeconds}s) -> ${result.id}`);
          progress.created++;
          break;
        }

        case "patch": {
          const ok = await client.patchEntry(action.entryId, { durationSeconds: action.durationSeconds });
          if (ok) {
            console.log(`${prefix} PATCH line ${line}: ${action.entryId} -> ${action.durationSeconds}s`);
            progress.updated++;
          } else {
            console.log(`${prefix} PATCH line ${line}: ${action.entryId} not found (already deleted?), skipping`);
            progress.skipped++;
          }
          break;
        }

        case "replace": {
          for (const deleteId of action.deleteIds) {
            const ok = await client.deleteEntry(deleteId);
            if (ok) {
              console.log(`${prefix} DEL   ${deleteId}`);
              progress.deleted++;
            } else {
              console.log(`${prefix} DEL   ${deleteId} not found, skipping`);
            }
          }
          const result = await client.createEntry(action.sitting);
          console.log(`${prefix} POST  line ${line}: ${action.sitting.start} (${action.sitting.durationSeconds}s) -> ${result.id}`);
          progress.created++;
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const httpStatus = message.match(/^HTTP (\d+)/)?.[1];
      console.error(`${prefix} ERROR line ${line}: ${message}`);
      progress.errors.push({
        index: i,
        line,
        action: action.type,
        httpStatus: httpStatus ? parseInt(httpStatus) : undefined,
        error: message,
      });
    }

    progress.lastProcessedIndex = i;

    // Save progress every 10 entries
    if ((i + 1) % 10 === 0) {
      writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    }
  }

  progress.completed = true;
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  return progress;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes("--apply");
  const resumeMode = args.includes("--resume");

  const dbFlagIdx = args.indexOf("--db");
  const dbPath = dbFlagIdx !== -1 && args[dbFlagIdx + 1] ? args[dbFlagIdx + 1] : LIVE_DB_PATH;

  const apiUrl = (process.env.TADA_API_URL || "https://tada.living").replace(/\/$/, "") + "/api/v1";
  const apiKey = process.env.TADA_API_KEY;

  // Validate
  if (applyMode && !apiKey) {
    console.error("Error: TADA_API_KEY environment variable is required for --apply mode.");
    console.error("Generate one at https://tada.living/settings");
    process.exit(1);
  }

  if (!existsSync(dbPath)) {
    console.error(`Error: Database not found at ${dbPath}`);
    console.error("Run './scripts/live-import.sh pull' first to download the live DB.");
    process.exit(1);
  }

  console.log(`Mode: ${applyMode ? "APPLY" : "dry-run"}`);
  console.log(`Database: ${dbPath}`);
  console.log(`API: ${apiUrl}`);
  if (resumeMode) console.log("Resuming from previous progress...");
  console.log();

  // Parse and classify
  console.log("Parsing export file...");
  const sittings = parseSittings(EXPORT_FILE);
  console.log(`Parsed ${sittings.length} sittings`);

  console.log("Loading DB entries from local snapshot...");
  const db = new Database(dbPath, { readonly: true });
  const dbEntries = loadDbEntries(db);
  db.close();
  console.log(`Found ${dbEntries.length} existing mindfulness entries`);

  console.log("Classifying...");
  const classified = classifySittings(sittings, dbEntries);
  printClassificationReport(classified);

  // Load review decisions
  let reviewEntries: ReviewEntry[] = [];
  if (existsSync(REVIEW_FILE)) {
    reviewEntries = JSON.parse(readFileSync(REVIEW_FILE, "utf-8"));
    const resolved = reviewEntries.filter((e) => e.resolution).length;
    console.log(`\nLoaded ${reviewEntries.length} review entries (${resolved} resolved)`);
  } else {
    console.log(`\nNo review file found at ${REVIEW_FILE}`);
  }

  // Build action plan
  const plan = buildActionPlan(classified, reviewEntries);
  printActionSummary(plan);

  if (!applyMode) {
    console.log("\nDry-run complete. Run with --apply to execute API calls.");
    return;
  }

  // Determine resume point
  let resumeFromIndex = 0;
  if (resumeMode && existsSync(PROGRESS_FILE)) {
    const prev: ProgressState = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    if (prev.completed) {
      console.log("\nPrevious run already completed. Nothing to resume.");
      return;
    }
    resumeFromIndex = prev.lastProcessedIndex + 1;
    console.log(`\nResuming from entry ${resumeFromIndex + 1}/${plan.length}`);
  }

  // Execute
  console.log("\n=== Executing API Import ===\n");
  const client = new TadaApiClient(apiUrl, apiKey!);
  const startTime = Date.now();
  const result = await execute(client, plan, resumeFromIndex);
  const durationSec = Math.round((Date.now() - startTime) / 1000);

  console.log("\n=== API Import Complete ===");
  console.log(`Created:  ${result.created}`);
  console.log(`Updated:  ${result.updated}`);
  console.log(`Deleted:  ${result.deleted}`);
  console.log(`Skipped:  ${result.skipped}`);
  console.log(`Errors:   ${result.errors.length}`);
  console.log(`Duration: ${Math.floor(durationSec / 60)}m ${durationSec % 60}s`);

  if (result.errors.length > 0) {
    console.log(`\nErrors saved to ${PROGRESS_FILE}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
