/**
 * Text Structure Extraction Endpoint
 *
 * Uses LLM to extract structured data (tadas, journal entries) from text.
 * Supports Groq, OpenAI, and Anthropic providers.
 * Supports BYOK (Bring Your Own Key).
 * Enforces free tier limit (50/month).
 *
 * POST /api/voice/structure
 *
 * @module server/api/voice/structure
 */

import { defineEventHandler, readBody, createError, getHeader } from "h3";
import { createLogger } from "~/server/utils/logger";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

const logger = createLogger("api:voice:structure");

// Free tier limit
const FREE_TIER_LIMIT = 50;

// Rate limiting: 1 request per 10 seconds per user
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 10_000;

interface StructureRequestBody {
  text: string;
  mode: "journal" | "tada" | "timer-note";
  context?: {
    journalType?: string;
    timerDuration?: number;
    timerCategory?: string;
  };
  provider?: "groq" | "openai" | "anthropic";
}

interface ExtractedTada {
  name: string;
  category?: string;
  significance?: "minor" | "normal" | "major";
}

interface StructureResponse {
  tadas: ExtractedTada[];
  journalType?: "dream" | "reflection" | "note";
  title?: string;
  quality?: number;
  notes?: string;
  provider: string;
  tokensUsed?: number;
}

/**
 * Get the start of the current billing month
 */
function getBillingPeriodStart(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
}

/**
 * Count voice entries this billing period
 */
async function countVoiceEntriesThisMonth(userId: string): Promise<number> {
  const periodStart = getBillingPeriodStart().toISOString();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        eq(entries.source, "voice"),
        gte(entries.createdAt, periodStart),
      ),
    );

  return (result[0] as { count: number } | undefined)?.count || 0;
}

/**
 * Build the extraction prompt based on mode
 */
function buildExtractionPrompt(
  text: string,
  mode: string,
  context?: StructureRequestBody["context"],
): string {
  const basePrompt = `You are extracting structured data from voice input. Be concise and accurate.

Text to analyze:
"${text}"

`;

  if (mode === "tada") {
    return (
      basePrompt +
      `Extract all accomplishments (tadas) mentioned. For each:
- name: Brief description (3-10 words)
- category: subcategory that best fits: work (job, office, meetings), home (chores, repairs, cooking), health (exercise, medical, wellness), social (friends, family, events), hobby (creative, learning, fun), or personal (other personal wins)
- significance: minor (small wins), normal (regular accomplishments), major (big achievements)

Respond ONLY with valid JSON in this format:
{"tadas": [{"name": "...", "category": "...", "significance": "..."}]}`
    );
  }

  if (mode === "journal") {
    return (
      basePrompt +
      `Analyze this journal entry:
1. Detect type: "dream" (mentions dreams, sleeping, night visions), "reflection" (thoughts, feelings, analysis), or "note" (factual, task-oriented)
2. Suggest a title (3-7 words)
3. Extract any tadas mentioned

Respond ONLY with valid JSON:
{"journalType": "...", "title": "...", "tadas": [...]}`
    );
  }

  if (mode === "timer-note") {
    return (
      basePrompt +
      `This is a note after a ${context?.timerDuration || 0} second ${context?.timerCategory || "focus"} session.
Extract:
1. Quality rating 1-5 from phrases like "great" (5), "good" (4), "okay" (3), "hard" (2), "difficult" (1)
2. Any bonus accomplishments mentioned ("also I fixed...", "plus I...", "and I also...")
3. Main session notes

Respond ONLY with valid JSON:
{"quality": 4, "notes": "...", "tadas": [...]}`
    );
  }

  return (
    basePrompt +
    `Extract key information.
Respond ONLY with valid JSON: {"notes": "...", "tadas": []}`
  );
}

/**
 * Extract using Groq (Llama)
 */
async function extractWithGroq(
  prompt: string,
  apiKey: string,
): Promise<StructureResponse> {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Groq extraction error:", errorText);
    throw new Error(`Extraction failed: ${response.status}`);
  }

  const result = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { total_tokens: number };
  };

  const content = result.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(content) as Partial<StructureResponse>;
    return {
      tadas: parsed.tadas || [],
      journalType: parsed.journalType,
      title: parsed.title,
      quality: parsed.quality,
      notes: parsed.notes,
      provider: "groq",
      tokensUsed: result.usage?.total_tokens,
    };
  } catch {
    logger.error("Failed to parse LLM response:", content);
    throw new Error("Invalid response from LLM");
  }
}

/**
 * Extract using OpenAI
 */
async function extractWithOpenAI(
  prompt: string,
  apiKey: string,
): Promise<StructureResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("OpenAI extraction error:", errorText);
    throw new Error(`Extraction failed: ${response.status}`);
  }

  const result = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { total_tokens: number };
  };

  const content = result.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(content) as Partial<StructureResponse>;
    return {
      tadas: parsed.tadas || [],
      journalType: parsed.journalType,
      title: parsed.title,
      quality: parsed.quality,
      notes: parsed.notes,
      provider: "openai",
      tokensUsed: result.usage?.total_tokens,
    };
  } catch {
    logger.error("Failed to parse LLM response:", content);
    throw new Error("Invalid response from LLM");
  }
}

/**
 * Extract using Anthropic
 */
async function extractWithAnthropic(
  prompt: string,
  apiKey: string,
): Promise<StructureResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content:
            prompt + "\n\nRespond with ONLY the JSON object, no other text.",
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Anthropic extraction error:", errorText);
    throw new Error(`Extraction failed: ${response.status}`);
  }

  const result = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };

  const textContent = result.content.find((c) => c.type === "text");
  const content = textContent?.text || "{}";

  try {
    // Anthropic may include extra text, try to extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
    const parsed = JSON.parse(jsonStr) as Partial<StructureResponse>;

    return {
      tadas: parsed.tadas || [],
      journalType: parsed.journalType,
      title: parsed.title,
      quality: parsed.quality,
      notes: parsed.notes,
      provider: "anthropic",
      tokensUsed: result.usage
        ? result.usage.input_tokens + result.usage.output_tokens
        : undefined,
    };
  } catch {
    logger.error("Failed to parse LLM response:", content);
    throw new Error("Invalid response from LLM");
  }
}

export default defineEventHandler(async (event) => {
  // Require authentication
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const userId = event.context.user.id;

  // Rate limiting
  const lastRequest = rateLimitMap.get(userId);
  const now = Date.now();
  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW_MS) {
    const waitSeconds = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - lastRequest)) / 1000,
    );
    throw createError({
      statusCode: 429,
      statusMessage: `Rate limited. Please wait ${waitSeconds} seconds before making another request.`,
    });
  }
  rateLimitMap.set(userId, now);

  // Check free tier limit
  const usageThisMonth = await countVoiceEntriesThisMonth(userId);
  const userApiKey = getHeader(event, "x-user-api-key");

  // Only enforce limit if user doesn't have their own key
  if (!userApiKey && usageThisMonth >= FREE_TIER_LIMIT) {
    throw createError({
      statusCode: 402,
      statusMessage: `Free tier limit reached (${FREE_TIER_LIMIT}/month). Add your own API key in settings to continue.`,
    });
  }

  // Read request body
  let body: unknown;
  try {
    body = await readBody(event);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body",
    });
  }

  if (!body || typeof body !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body",
    });
  }

  const {
    text,
    mode,
    context,
    provider: requestedProvider,
  } = body as Partial<StructureRequestBody>;

  if (!text || typeof text !== "string" || text.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid text field",
    });
  }

  if (!mode || !["journal", "tada", "timer-note"].includes(mode)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid mode. Must be one of: journal, tada, timer-note",
    });
  }

  // Determine provider (default: groq)
  let provider: "groq" | "openai" | "anthropic" = requestedProvider || "groq";
  if (!["groq", "openai", "anthropic"].includes(provider)) {
    provider = "groq";
  }

  // Determine which API key to use
  let apiKey: string;
  if (userApiKey) {
    apiKey = userApiKey;
    logger.info(`Using BYOK for ${provider} extraction`);
  } else {
    const config = useRuntimeConfig();
    if (provider === "groq" && config.groqApiKey) {
      apiKey = config.groqApiKey;
    } else if (provider === "openai" && config.openaiApiKey) {
      apiKey = config.openaiApiKey;
    } else if (provider === "anthropic" && config.anthropicApiKey) {
      apiKey = config.anthropicApiKey;
    } else {
      throw createError({
        statusCode: 503,
        statusMessage: "Extraction service not configured",
      });
    }
  }

  logger.info(
    `Extracting structure from text for user ${userId} using ${provider}`,
  );

  try {
    const prompt = buildExtractionPrompt(text, mode, context);

    let result: StructureResponse;

    switch (provider) {
      case "openai":
        result = await extractWithOpenAI(prompt, apiKey);
        break;
      case "anthropic":
        result = await extractWithAnthropic(prompt, apiKey);
        break;
      case "groq":
      default:
        result = await extractWithGroq(prompt, apiKey);
        break;
    }

    logger.info(`Extraction complete: ${result.tadas.length} tadas found`);

    return result;
  } catch (err) {
    logger.error("Extraction failed:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Extraction failed. Please try again.",
    });
  }
});
