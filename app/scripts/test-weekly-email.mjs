#!/usr/bin/env node
/**
 * Test weekly rhythm email delivery.
 *
 * Usage:
 *   bun run scripts/test-weekly-email.mjs --user <username> --kind <celebration|encouragement>
 *
 * Options:
 *   --user      Username to send to (required)
 *   --kind      Message kind: "celebration" or "encouragement" (default: encouragement)
 *   --as-admin  Send to any user (without this, only works if you ARE the user — for self-hosted single-user)
 *
 * Examples:
 *   bun run scripts/test-weekly-email.mjs --user alice --kind encouragement
 *   bun run scripts/test-weekly-email.mjs --user alice --kind celebration --as-admin
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parseArgs } from "util";

// ── Parse CLI args ──────────────────────────────────────────────────────────
const { values } = parseArgs({
  options: {
    user: { type: "string" },
    kind: { type: "string", default: "encouragement" },
    "as-admin": { type: "boolean", default: false },
  },
  strict: true,
});

const username = values.user;
const kind = values.kind ?? "encouragement";

if (!username) {
  console.error("Error: --user <username> is required");
  process.exit(1);
}

if (kind !== "celebration" && kind !== "encouragement") {
  console.error('Error: --kind must be "celebration" or "encouragement"');
  process.exit(1);
}

// ── Bootstrap database ──────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${join(__dirname, "..", "..", "data", "db.sqlite")}`;
}

const { db } = await import("../server/db/index.ts");
const { users, weeklyRhythmSettings } = await import("../server/db/schema.ts");
const { eq } = await import("drizzle-orm");

// ── Look up user ────────────────────────────────────────────────────────────
const user = await db.query.users.findFirst({
  where: eq(users.username, username),
});

if (!user) {
  console.error(`Error: user "${username}" not found`);
  process.exit(1);
}

if (!user.email) {
  console.error(`Error: user "${username}" has no email address configured`);
  process.exit(1);
}

const timezone = user.timezone || "UTC";
console.log(`User: ${username} (${user.email}), timezone: ${timezone}`);

// ── Check weekly rhythm settings ────────────────────────────────────────────
const settings = await db.query.weeklyRhythmSettings.findFirst({
  where: eq(weeklyRhythmSettings.userId, user.id),
});

if (!settings) {
  console.error(
    `Error: no weekly rhythm settings found for "${username}". ` +
    `Enable weekly rhythms in Settings first.`
  );
  process.exit(1);
}

// ── Generate the message ────────────────────────────────────────────────────
const now = new Date();
console.log(`Generating ${kind} message...`);

let result;
if (kind === "celebration") {
  const { renderCelebration } = await import(
    "../server/services/weekly-rhythms/celebration.ts"
  );
  const tier = settings.celebrationTier || "stats_only";
  // Celebrate the current week (for testing — normally celebrates previous week)
  result = await renderCelebration(user.id, tier, now, timezone);
} else {
  const { renderEncouragement } = await import(
    "../server/services/weekly-rhythms/encouragement.ts"
  );
  result = await renderEncouragement(user.id, now, timezone);
}

console.log(`Generated message: "${result.title}" (id: ${result.messageId})`);

// ── Deliver via email ───────────────────────────────────────────────────────
console.log(`Sending ${kind} email to ${user.email}...`);

const { deliverEmailForMessage } = await import(
  "../server/services/weekly-rhythms/delivery.ts"
);

const delivery = await deliverEmailForMessage(result.messageId, user.id);

if (delivery.success) {
  console.log("Email sent successfully.");
} else {
  console.error(`Email delivery failed: ${delivery.error}`);
  process.exit(1);
}

process.exit(0);
