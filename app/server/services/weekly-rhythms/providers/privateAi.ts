/**
 * Private AI provider adapter for Tier 2 celebrations.
 *
 * Uses a local AI model (when available) to generate narrative text.
 * Falls back to Tier 1 if local AI is not available or times out.
 * All data stays on the user's server — nothing leaves the instance.
 */

import { createLogger } from "~/server/utils/logger";
import { renderTier1Stats } from "../renderer";
import type { WeeklyStatsSnapshot } from "~/server/db/schema";
import type { SummaryBlock, WeeklyNarrativeInput } from "~/types/weekly-rhythms";
import { formatWeekLabel } from "../time";

const logger = createLogger("service:weekly-rhythms:providers:privateAi");

const PRIVATE_AI_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Check whether the local AI capability is available.
 */
export async function checkPrivateAiCapability(): Promise<boolean> {
  // Check if a local AI endpoint is configured
  const localAiUrl = process.env["LOCAL_AI_URL"];
  if (!localAiUrl) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${localAiUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Render a Tier 2 private AI celebration narrative.
 * Throws if unavailable — caller should catch and fall back.
 */
export async function renderTier2PrivateAi(
  snapshot: WeeklyStatsSnapshot,
  userId: string,
): Promise<{
  title: string;
  summaryBlocks: SummaryBlock[];
  narrativeText: string | null;
}> {
  const available = await checkPrivateAiCapability();
  if (!available) {
    throw new Error("private_ai_unavailable");
  }

  const localAiUrl = process.env["LOCAL_AI_URL"]!;
  const narrativeInput = buildNarrativeInput(snapshot);

  logger.info("Generating private AI narrative", { userId });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PRIVATE_AI_TIMEOUT_MS);

    const response = await fetch(`${localAiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are a warm, encouraging assistant for a life-tracking app called Ta-Da! " +
              "Write a brief, celebratory narrative (2-3 sentences) about the user's week. " +
              "Be factual — only reference data provided. Always positive, never guilt or shame.",
          },
          {
            role: "user",
            content: `Here is my week summary:\n${JSON.stringify(narrativeInput, null, 2)}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Private AI returned ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const narrative = data.choices?.[0]?.message?.content?.trim() ?? null;

    // Get base Tier 1 output and enhance with narrative
    const tier1 = renderTier1Stats(snapshot);

    return {
      title: tier1.title,
      summaryBlocks: tier1.summaryBlocks,
      narrativeText: narrative,
    };
  } catch (err) {
    const errStr = String(err);
    if (errStr.includes("abort") || errStr.includes("timeout")) {
      throw new Error("private_ai_timeout");
    }
    throw err;
  }
}

function buildNarrativeInput(
  snapshot: WeeklyStatsSnapshot,
): WeeklyNarrativeInput {
  const gp = snapshot.generalProgress;
  return {
    kind: snapshot.kind as "celebration" | "encouragement",
    weekLabel: formatWeekLabel(snapshot.weekStartDate, snapshot.weekEndDate),
    timezone: snapshot.timezone,
    generalProgress: {
      countsByType: gp.entryCountsByType,
      durationByCategorySeconds: gp.sessionDurationsByCategory,
      weekOverWeek: {
        entryCountDelta: gp.weekOverWeek.entryCountDelta,
        durationDeltaSeconds: gp.weekOverWeek.durationDeltaSeconds,
        byType: gp.weekOverWeek.byType,
      },
      monthlyHighlights: gp.personalRecordsThisMonth.map((pr) => ({
        label: pr.label,
        value: pr.value,
        unit: pr.unit,
      })),
      quietWeek: gp.quietWeek,
    },
    rhythmWins: snapshot.rhythmWins.map((w) => ({
      rhythmName: w.rhythmName,
      chainStatus: w.chainStatus,
      achievedTier: w.achievedTier,
      completedDays: w.completedDays,
      milestones: w.allTimeMilestones.map((m) => m.label),
      stretchGoal: w.stretchGoal,
    })),
  };
}
