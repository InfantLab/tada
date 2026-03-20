/**
 * Encouragement content generation service.
 *
 * Generates Thursday mid-week encouragement with:
 * - General momentum assessment
 * - Per-rhythm stretch goals
 * - No-guilt, always-positive tone
 * - No repeat of the same message template within 4 weeks
 */

import { generateWeeklySnapshot } from "./snapshots";
import { renderTier1Encouragement } from "./renderer";
import { persistWeeklyMessage, getExistingMessage, getMessageHistory } from "./messages";
import { getWeekBoundaries, getNextScheduledUtc } from "./time";

export interface EncouragementResult {
  messageId: string;
  title: string;
  summaryBlocks: Array<{
    section: string;
    heading: string;
    lines: string[];
  }>;
  narrativeText: string | null;
}

// Variation pool for encouragement titles
const ENCOURAGEMENT_TITLES = [
  "There is still room in this week",
  "A gentle check-in",
  "How's your week shaping up?",
  "Mid-week moment",
  "Thursday thoughts",
  "Your week so far",
  "Halfway there",
  "A small pause to notice",
];

/**
 * Generate a Thursday encouragement for a user.
 * Idempotent: returns existing message if one already exists.
 */
export async function renderEncouragement(
  userId: string,
  referenceDate: Date,
  timezone: string,
): Promise<EncouragementResult> {
  const boundaries = getWeekBoundaries(referenceDate, timezone);

  // Check for existing
  const existing = await getExistingMessage(
    userId,
    "encouragement",
    boundaries.weekStartDate,
  );
  if (existing) {
    return {
      messageId: existing.id,
      title: existing.title,
      summaryBlocks: existing.summaryBlocks,
      narrativeText: existing.narrativeText,
    };
  }

  // Generate snapshot for encouragement (Mon–Thu partial week)
  const snapshot = await generateWeeklySnapshot(
    userId,
    "encouragement",
    referenceDate,
    timezone,
  );

  // Render Tier 1 encouragement
  const rendered = renderTier1Encouragement(snapshot);

  // Pick a non-repeating title
  const title = await pickNonRepeatingTitle(userId);

  // Compute visibility time (Thursday 15:03 local)
  const visibleUtc = getNextScheduledUtc(referenceDate, timezone, 3, "15:03");

  const message = await persistWeeklyMessage({
    userId,
    snapshotId: snapshot.id,
    kind: "encouragement",
    weekStartDate: boundaries.weekStartDate,
    tierRequested: "stats_only",
    tierApplied: "stats_only",
    fallbackReason: null,
    title,
    summaryBlocks: rendered.summaryBlocks,
    narrativeText: null,
    inAppVisibleFrom: visibleUtc.toISOString(),
    scheduledDeliveryAt: null,
  });

  return {
    messageId: message.id,
    title,
    summaryBlocks: rendered.summaryBlocks,
    narrativeText: null,
  };
}

/**
 * Pick a title that hasn't been used in the last 4 weeks.
 */
async function pickNonRepeatingTitle(userId: string): Promise<string> {
  try {
    const recent = await getMessageHistory(userId, {
      kind: "encouragement",
      limit: 4,
    });
    const recentTitles = new Set(recent.map((m) => m.title));

    // Find a title not recently used
    for (const title of ENCOURAGEMENT_TITLES) {
      if (!recentTitles.has(title)) return title;
    }
  } catch {
    // Fall through to default
  }

  // If all titles used recently, use the first one (cycle)
  return ENCOURAGEMENT_TITLES[0]!;
}
