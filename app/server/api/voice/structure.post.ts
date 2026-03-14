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
  subcategory?: string;
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
 * Build extraction messages (system + user) based on mode.
 * Returns a { system, user } pair for cleaner LLM prompting.
 */
function buildExtractionMessages(
  text: string,
  mode: string,
  context?: StructureRequestBody["context"],
): { system: string; user: string } {
  if (mode === "tada") {
    const system = `You extract accomplishments from voice transcriptions into structured JSON.

RULES:
- Each tada is a single, specific accomplishment. Split compound sentences.
- name: Short description (3-10 words)
- category: One of: mindfulness, movement, creative, learning, health, work, social, life_admin, moments, events
- subcategory: More specific label within the category (e.g., "cleaning" for life_admin, "yoga" for movement, "family" for social). Use lowercase_snake_case. Omit if unclear.
- significance: "minor" (quick/routine), "normal" (regular), "major" (words like "finally", "first time", "at last")
- If the text contains NO accomplishments (just thoughts, reflections, plans), return {"tadas": []}

EXAMPLES:
Input: "I finally fixed the kitchen sink and also did some laundry"
Output: {"tadas": [{"name": "Fixed the kitchen sink", "category": "life_admin", "subcategory": "maintenance", "significance": "major"}, {"name": "Did the laundry", "category": "life_admin", "subcategory": "laundry", "significance": "normal"}]}

Input: "Had a great yoga session this morning and then met up with Sarah for coffee"
Output: {"tadas": [{"name": "Yoga session this morning", "category": "movement", "subcategory": "yoga", "significance": "normal"}, {"name": "Met up with Sarah for coffee", "category": "social", "subcategory": "friends", "significance": "normal"}]}

Input: "Just thinking about what I should do this weekend"
Output: {"tadas": []}

Respond ONLY with valid JSON.`;

    return { system, user: text };
  }

  if (mode === "journal") {
    const system = `You analyze journal entries from voice transcriptions.

Detect the journal type:
- "dream": mentions dreams, sleeping, nightmares, night visions
- "gratitude": grateful, thankful, appreciate, blessed
- "reflection": thinking about, realized, wondering, feeling
- "note": factual content, daily observations

Suggest a concise title (3-7 words). Extract any accomplishments (tadas) mentioned.

Respond ONLY with valid JSON:
{"journalType": "dream|reflection|gratitude|note", "title": "...", "tadas": [{"name": "...", "category": "...", "subcategory": "...", "significance": "..."}]}`;

    return { system, user: text };
  }

  if (mode === "timer-note") {
    const duration = context?.timerDuration || 0;
    const category = context?.timerCategory || "focus";
    const system = `You analyze post-session notes after a ${duration} second ${category} session.

Extract:
1. Quality rating 1-5: "great/amazing" (5), "good/nice" (4), "okay/fine" (3), "hard/struggled" (2), "terrible/couldn't" (1)
2. Any bonus accomplishments ("also I...", "plus I...", "and I also...")
3. Main session notes

Respond ONLY with valid JSON:
{"quality": 4, "notes": "...", "tadas": [{"name": "...", "category": "...", "subcategory": "...", "significance": "..."}]}`;

    return { system, user: text };
  }

  return {
    system:
      "Extract key information from voice input. Respond ONLY with valid JSON: {\"notes\": \"...\", \"tadas\": []}",
    user: text,
  };
}

/**
 * Extract using Groq (Llama)
 */
async function extractWithGroq(
  messages: { system: string; user: string },
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
        messages: [
          { role: "system", content: messages.system },
          { role: "user", content: messages.user },
        ],
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
  messages: { system: string; user: string },
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
      messages: [
        { role: "system", content: messages.system },
        { role: "user", content: messages.user },
      ],
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
  messages: { system: string; user: string },
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: messages.system,
      messages: [
        {
          role: "user",
          content: messages.user,
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
    throw createError(unauthorized(event));
  }

  const userId = event.context.user.id;
  const userApiKey = getHeader(event, "x-user-api-key");

  // Check API key availability BEFORE rate limiting
  const groqApiKey = process.env['GROQ_API_KEY'] || "";
  const openaiApiKey = process.env['OPENAI_API_KEY'] || "";
  const anthropicApiKey = process.env['ANTHROPIC_API_KEY'] || "";
  if (
    !userApiKey &&
    !groqApiKey &&
    !openaiApiKey &&
    !anthropicApiKey
  ) {
    throw createError(
      apiError(event, "SERVICE_UNAVAILABLE", "Voice extraction is not available. Please configure your own API key in settings or contact the administrator.", 503)
    );
  }

  // Rate limiting (checked after service availability)
  const lastRequest = rateLimitMap.get(userId);
  const now = Date.now();
  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW_MS) {
    const waitSeconds = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - lastRequest)) / 1000,
    );
    throw createError(
      apiError(event, "RATE_LIMITED", `Rate limited. Please wait ${waitSeconds} seconds before making another request.`, 429)
    );
  }

  // Check free tier limit
  const usageThisMonth = await countVoiceEntriesThisMonth(userId);

  // Only enforce limit if user doesn't have their own key
  if (!userApiKey && usageThisMonth >= FREE_TIER_LIMIT) {
    throw createError(
      apiError(event, "FREE_TIER_LIMIT_REACHED", `Free tier limit reached (${FREE_TIER_LIMIT}/month). Add your own API key in settings to continue.`, 402)
    );
  }

  // Read request body
  let body: unknown;
  try {
    body = await readBody(event);
  } catch {
    throw createError(
      apiError(event, "INVALID_REQUEST_BODY", "Invalid request body", 400)
    );
  }

  if (!body || typeof body !== "object") {
    throw createError(
      apiError(event, "INVALID_REQUEST_BODY", "Invalid request body", 400)
    );
  }

  const {
    text,
    mode,
    context,
    provider: requestedProvider,
  } = body as Partial<StructureRequestBody>;

  if (!text || typeof text !== "string" || text.length < 2) {
    throw createError(
      apiError(event, "INVALID_TEXT", "Missing or invalid text field", 400)
    );
  }

  if (!mode || !["journal", "tada", "timer-note"].includes(mode)) {
    throw createError(
      apiError(event, "INVALID_MODE", "Invalid mode. Must be one of: journal, tada, timer-note", 400)
    );
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
    // Use server-side API key (already validated above)
    if (provider === "groq" && groqApiKey) {
      apiKey = groqApiKey;
    } else if (provider === "openai" && openaiApiKey) {
      apiKey = openaiApiKey;
    } else if (provider === "anthropic" && anthropicApiKey) {
      apiKey = anthropicApiKey;
    } else if (groqApiKey) {
      // Fallback to available provider
      apiKey = groqApiKey;
      provider = "groq";
    } else if (openaiApiKey) {
      apiKey = openaiApiKey;
      provider = "openai";
    } else {
      apiKey = anthropicApiKey;
      provider = "anthropic";
    }
  }

  logger.info(
    `Extracting structure from text for user ${userId} using ${provider}`,
  );

  try {
    const messages = buildExtractionMessages(text, mode, context);

    let result: StructureResponse;

    switch (provider) {
      case "openai":
        result = await extractWithOpenAI(messages, apiKey);
        break;
      case "anthropic":
        result = await extractWithAnthropic(messages, apiKey);
        break;
      case "groq":
      default:
        result = await extractWithGroq(messages, apiKey);
        break;
    }

    logger.info(`Extraction complete: ${result.tadas.length} tadas found`);

    // Update rate limit only AFTER successful extraction
    // This prevents failed requests from consuming rate limit
    rateLimitMap.set(userId, now);

    return result;
  } catch (err) {
    logger.error("Extraction failed:", err);
    throw createError(internalError(event, "Extraction failed. Please try again."));
  }
});
