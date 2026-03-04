/**
 * Interactive CLI review tool for flagged import entries.
 *
 * Shows each unresolved entry with a visual timeline and prompts for a decision.
 *
 * Usage:
 *   bun scripts/review-entries.ts              # review unresolved entries
 *   bun scripts/review-entries.ts --summary    # show summary only
 */

import { readFileSync, writeFileSync } from "fs";
import * as readline from "readline";

const REVIEW_FILE = "./old_data/import-review.json";

interface ReviewEntry {
  line: number;
  classification: string;
  sitting: { start: string; end: string; durationSeconds: number; note?: string };
  conflicts: Array<{ id: string; timestamp: string; durationSeconds: number | null; name: string }>;
  resolution: string | null;
}

function fmtDur(s: number): string {
  if (s >= 3600) return `${(s / 3600).toFixed(1)}h`;
  if (s >= 60) return `${Math.round(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

function fmtTime(iso: string): string {
  return iso.replace("T", " ").replace(".000Z", "").slice(0, 19);
}

function fmtTimeShort(iso: string): string {
  return iso.slice(11, 16);
}

// Simple visual bar in terminal
function drawTimeline(entry: ReviewEntry): string {
  const lines: string[] = [];
  const fileStart = new Date(entry.sitting.start).getTime();
  const fileEnd = new Date(entry.sitting.end).getTime();

  let allStarts = [fileStart];
  let allEnds = [fileEnd];
  for (const c of entry.conflicts) {
    const cs = new Date(c.timestamp).getTime();
    const ce = cs + (c.durationSeconds || 0) * 1000;
    allStarts.push(cs);
    allEnds.push(ce);
  }

  const rangeStart = Math.min(...allStarts) - 60000;
  const rangeEnd = Math.max(...allEnds) + 60000;
  const rangeSpan = rangeEnd - rangeStart;
  const barWidth = 50;

  function makeBar(startMs: number, endMs: number, char: string): string {
    const left = Math.round(((startMs - rangeStart) / rangeSpan) * barWidth);
    const width = Math.max(Math.round(((endMs - startMs) / rangeSpan) * barWidth), 1);
    return " ".repeat(left) + char.repeat(width) + " ".repeat(Math.max(0, barWidth - left - width));
  }

  const fileDur = entry.sitting.durationSeconds;
  lines.push(`  Import  |${makeBar(fileStart, fileEnd, "█")}| ${fmtTimeShort(entry.sitting.start)} ${fmtDur(fileDur)}`);

  for (const c of entry.conflicts) {
    const cs = new Date(c.timestamp).getTime();
    const ce = cs + (c.durationSeconds || 0) * 1000;
    lines.push(`  DB      |${makeBar(cs, ce, "░")}| ${fmtTimeShort(c.timestamp)} ${fmtDur(c.durationSeconds || 0)}`);
  }

  return lines.join("\n");
}

async function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim().toLowerCase()));
  });
}

async function main() {
  const data: ReviewEntry[] = JSON.parse(readFileSync(REVIEW_FILE, "utf-8"));
  const args = process.argv.slice(2);

  if (args.includes("--summary")) {
    const resolved = data.filter((e) => e.resolution).length;
    const unresolved = data.filter((e) => !e.resolution).length;
    console.log(`Total: ${data.length}, Resolved: ${resolved}, Remaining: ${unresolved}`);
    const byRes: Record<string, number> = {};
    for (const e of data) {
      const r = e.resolution || "unresolved";
      byRes[r] = (byRes[r] || 0) + 1;
    }
    for (const [res, count] of Object.entries(byRes)) {
      console.log(`  ${res}: ${count}`);
    }
    return;
  }

  const unresolved = data.filter((e) => !e.resolution);
  if (unresolved.length === 0) {
    console.log("All entries have been resolved!");
    return;
  }

  console.log(`\n${unresolved.length} entries to review. Commands:`);
  console.log("  [s]kip     — don't import this entry");
  console.log("  [i]mport   — import as new entry (keep both)");
  console.log("  [u]pdate   — update DB entry's duration to file's longer duration");
  console.log("  [r]eplace  — soft-delete DB entry, import file entry");
  console.log("  [q]uit     — save progress and exit");
  console.log("  [a]ll-skip — skip all remaining\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let reviewed = 0;

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    if (entry.resolution) continue;

    const fileDur = entry.sitting.durationSeconds;
    const dbDur = entry.conflicts[0]?.durationSeconds || 0;
    const ratio = dbDur > 0 ? (fileDur / dbDur).toFixed(1) : "∞";
    const num = reviewed + 1;
    const remaining = unresolved.length - reviewed;

    console.log(`\n─── Entry ${num}/${unresolved.length} (${remaining} remaining) ──────────────`);
    console.log(`  Date: ${fmtTime(entry.sitting.start).slice(0, 10)}   Line: ${entry.line}`);
    console.log(`  File: ${fmtTime(entry.sitting.start)} → ${fmtTimeShort(entry.sitting.end)}  (${fmtDur(fileDur)})`);
    for (const c of entry.conflicts) {
      const cEnd = new Date(new Date(c.timestamp).getTime() + (c.durationSeconds || 0) * 1000).toISOString();
      console.log(`  DB:   ${fmtTime(c.timestamp)} → ${fmtTimeShort(cEnd)}  (${fmtDur(c.durationSeconds || 0)})`);
    }
    console.log(`  Ratio: ${ratio}x  (file / DB)`);
    console.log();
    console.log(drawTimeline(entry));
    console.log();

    const answer = await ask(rl, "  [s]kip / [i]mport / [u]pdate / [r]eplace / [q]uit / [a]ll-skip > ");

    switch (answer) {
      case "s":
        entry.resolution = "skip";
        reviewed++;
        break;
      case "i":
        entry.resolution = "import";
        reviewed++;
        break;
      case "u":
        entry.resolution = "update-duration";
        reviewed++;
        break;
      case "r":
        entry.resolution = "replace";
        reviewed++;
        break;
      case "q":
        writeFileSync(REVIEW_FILE, JSON.stringify(data, null, 2));
        console.log(`\nSaved. ${reviewed} reviewed this session, ${remaining - 1} remaining.`);
        rl.close();
        return;
      case "a":
        for (const e of data) {
          if (!e.resolution) e.resolution = "skip";
        }
        writeFileSync(REVIEW_FILE, JSON.stringify(data, null, 2));
        console.log(`\nSkipped all remaining. Done.`);
        rl.close();
        return;
      default:
        console.log("  Unknown command, skipping...");
        entry.resolution = "skip";
        reviewed++;
    }

    // Auto-save every 10 entries
    if (reviewed % 10 === 0) {
      writeFileSync(REVIEW_FILE, JSON.stringify(data, null, 2));
    }
  }

  writeFileSync(REVIEW_FILE, JSON.stringify(data, null, 2));
  console.log(`\nDone! All ${unresolved.length} entries reviewed.`);
  rl.close();
}

main();
