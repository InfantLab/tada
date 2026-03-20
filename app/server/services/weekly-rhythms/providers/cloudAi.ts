/**
 * Cloud AI provider adapter for Tier 3 (factual) and Tier 4 (creative) celebrations.
 *
 * Uses a cloud LLM API to generate narrative text from summary-only payloads.
 * Privacy boundary: only WeeklyNarrativeInput crosses to the provider.
 * Falls back to Tier 1 on failure — caller should catch and handle.
 */

import { createLogger } from "~/server/utils/logger";
import { renderTier1Stats } from "../renderer";
import { formatWeekLabel } from "../time";
import type { WeeklyStatsSnapshot } from "~/server/db/schema";
import type { SummaryBlock, WeeklyNarrativeInput } from "~/types/weekly-rhythms";

const logger = createLogger("service:weekly-rhythms:providers:cloudAi");

const CLOUD_AI_TIMEOUT_MS = 30_000;

type PromptMode = "factual" | "creative";

const SYSTEM_PROMPTS: Record<PromptMode, string> = {
  factual:
    "You are a warm, factual assistant for Ta-Da!, a life-tracking app. " +
    "Write a brief celebration narrative (2-3 sentences) about the user's week. " +
    "Be strictly factual — only reference the data provided. Use warm, encouraging language. " +
    "Never guilt, shame, or compare negatively. If it was a quiet week, celebrate rest.",
  creative:
    "You are a creative, enthusiastic writer for Ta-Da!, a life-tracking app. " +
    "Write a distinctive, personalised celebration narrative (3-4 sentences) about the user's week. " +
    "Be creative with metaphors and voice, but every fact you mention MUST come from the data provided. " +
    "Never invent activities or stats. Always positive — celebrate what happened, not what didn't. " +
    "Make it feel different from a standard summary.",
};

/**
 * Render a cloud AI celebration narrative.
 * Throws on failure — caller should fall back to Tier 1.
 */
export async function renderCloudAi(
  snapshot: WeeklyStatsSnapshot,
  userId: string,
  mode: PromptMode,
): Promise<{
  title: string;
  summaryBlocks: SummaryBlock[];
  narrativeText: string | null;
}> {
  const narrativeInput = buildNarrativeInput(snapshot);

  logger.info("Generating cloud AI narrative", { userId, mode });

  try {
    const narrative = await callCloudProvider(narrativeInput, mode);

    // Get base Tier 1 output and enhance with narrative
    const tier1 = renderTier1Stats(snapshot);

    return {
      title: tier1.title,
      summaryBlocks: tier1.summaryBlocks,
      narrativeText: narrative,
    };
  } catch (err) {
    logger.error("Cloud AI generation failed", err as Error, { userId, mode });
    throw err;
  }
}

/**
 * Call the cloud AI provider (Groq, OpenAI, or Anthropic — in priority order).
 */
async function callCloudProvider(
  input: WeeklyNarrativeInput,
  mode: PromptMode,
): Promise<string | null> {
  const groqKey = process.env["GROQ_API_KEY"];
  const openaiKey = process.env["OPENAI_API_KEY"];
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];

  if (groqKey) {
    return callGroq(input, mode, groqKey);
  }
  if (openaiKey) {
    return callOpenAiCompatible(
      input,
      mode,
      openaiKey,
      "https://api.openai.com/v1/chat/completions",
      "gpt-4o-mini",
    );
  }
  if (anthropicKey) {
    return callAnthropic(input, mode, anthropicKey);
  }

  throw new Error("No cloud AI provider configured");
}

async function callGroq(
  input: WeeklyNarrativeInput,
  mode: PromptMode,
  apiKey: string,
): Promise<string | null> {
  return callOpenAiCompatible(
    input,
    mode,
    apiKey,
    "https://api.groq.com/openai/v1/chat/completions",
    "llama-3.3-70b-versatile",
  );
}

async function callOpenAiCompatible(
  input: WeeklyNarrativeInput,
  mode: PromptMode,
  apiKey: string,
  endpoint: string,
  model: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLOUD_AI_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[mode] },
          {
            role: "user",
            content: `Here is my week summary:\n${JSON.stringify(input, null, 2)}`,
          },
        ],
        max_tokens: mode === "creative" ? 300 : 200,
        temperature: mode === "creative" ? 0.9 : 0.5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Cloud AI returned ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropic(
  input: WeeklyNarrativeInput,
  mode: PromptMode,
  apiKey: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLOUD_AI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: mode === "creative" ? 300 : 200,
        system: SYSTEM_PROMPTS[mode],
        messages: [
          {
            role: "user",
            content: `Here is my week summary:\n${JSON.stringify(input, null, 2)}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Anthropic returned ${response.status}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const textBlock = data.content?.find((c) => c.type === "text");
    return textBlock?.text?.trim() ?? null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Mapper ────────────────────────────────────────────────────────────────

/**
 * Build the summary-only narrative input from a snapshot.
 * This is the ONLY payload that crosses to the cloud provider.
 * No raw entry text, notes, or personal content is included.
 */
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
      personalRecordsThisMonth: gp.personalRecordsThisMonth.map((pr) => ({
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
