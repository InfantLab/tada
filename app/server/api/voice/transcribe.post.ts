/**
 * Audio Transcription Endpoint
 *
 * Transcribes audio using Whisper API (via Groq or OpenAI).
 * Supports BYOK (Bring Your Own Key) for user-provided API keys.
 * Enforces free tier limit (50/month).
 *
 * POST /api/voice/transcribe
 *
 * @module server/api/voice/transcribe
 */

import { defineEventHandler, createError, getHeader } from "h3";
import { createLogger } from "~/server/utils/logger";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

const logger = createLogger("api:voice:transcribe");

// Free tier limit
const FREE_TIER_LIMIT = 50;

// Rate limiting: 1 request per 10 seconds per user
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 10_000;

interface TranscribeResponse {
  text: string;
  confidence?: number;
  language?: string;
  provider: string;
  tokensUsed?: number;
}

/**
 * Get the start of the current billing month (1st of month, 00:00:00 UTC)
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
 * Transcribe audio using Groq's Whisper API
 */
async function transcribeWithGroq(
  audioData: ArrayBuffer,
  apiKey: string,
): Promise<TranscribeResponse> {
  // Create form data with audio file
  const formData = new FormData();
  const blob = new Blob([audioData], { type: "audio/webm" });
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "json");

  const response = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Groq transcription error:", errorText);
    throw new Error(`Transcription failed: ${response.status}`);
  }

  const result = (await response.json()) as { text: string };

  return {
    text: result.text,
    provider: "groq",
  };
}

/**
 * Transcribe audio using OpenAI's Whisper API
 */
async function transcribeWithOpenAI(
  audioData: ArrayBuffer,
  apiKey: string,
): Promise<TranscribeResponse> {
  const formData = new FormData();
  const blob = new Blob([audioData], { type: "audio/webm" });
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("response_format", "json");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("OpenAI transcription error:", errorText);
    throw new Error(`Transcription failed: ${response.status}`);
  }

  const result = (await response.json()) as { text: string };

  return {
    text: result.text,
    provider: "openai",
  };
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
  const userApiKey = getHeader(event, "x-user-api-key");

  // Check API key availability BEFORE rate limiting
  // This prevents 503 errors from consuming rate limit
  const config = useRuntimeConfig();
  if (!userApiKey && !config.groqApiKey && !config.openaiApiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: "Voice transcription is not available. Please configure your own API key in settings or contact the administrator.",
    });
  }

  // Rate limiting (checked after service availability)
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

  // Check free tier limit
  const usageThisMonth = await countVoiceEntriesThisMonth(userId);

  // Only enforce limit if user doesn't have their own key
  if (!userApiKey && usageThisMonth >= FREE_TIER_LIMIT) {
    throw createError({
      statusCode: 402,
      statusMessage: `Free tier limit reached (${FREE_TIER_LIMIT}/month). Add your own API key in settings to continue.`,
    });
  }

  // Read multipart form data
  let audioData: ArrayBuffer;
  let provider: "groq" | "openai" = "groq";

  try {
    // In H3, we need to read the raw body for multipart/form-data
    const contentType = getHeader(event, "content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Parse multipart form data using H3's readMultipartFormData
      const formData = await readMultipartFormData(event);
      if (!formData || formData.length === 0) {
        throw new Error("Could not parse form data");
      }

      const audioFile = formData.find((part) => part.name === "audio");
      if (!audioFile?.data) {
        throw createError({
          statusCode: 400,
          statusMessage: "Missing audio file in request",
        });
      }

      audioData = audioFile.data.buffer as ArrayBuffer;

      // Check for provider preference
      const providerPart = formData.find((part) => part.name === "provider");
      const requestedProvider = providerPart?.data
        ? new TextDecoder().decode(providerPart.data)
        : null;
      if (requestedProvider === "openai") {
        provider = "openai";
      }
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: "Expected multipart/form-data content type",
      });
    }
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode) {
      throw err;
    }
    logger.error("Error reading request:", err);
    throw createError({
      statusCode: 400,
      statusMessage: "Failed to read audio data",
    });
  }

  // Determine which API key to use
  let apiKey: string;
  if (userApiKey) {
    apiKey = userApiKey;
    logger.info(`Using BYOK for ${provider} transcription`);
  } else {
    // Use server-side API key (already validated above)
    if (provider === "groq" && config.groqApiKey) {
      apiKey = config.groqApiKey;
    } else if (provider === "openai" && config.openaiApiKey) {
      apiKey = config.openaiApiKey;
    } else if (config.groqApiKey) {
      // Fallback to groq if openai was requested but not available
      apiKey = config.groqApiKey;
      provider = "groq";
    } else {
      apiKey = config.openaiApiKey;
      provider = "openai";
    }
  }

  logger.info(`Transcribing audio for user ${userId} using ${provider}`);

  try {
    let result: TranscribeResponse;

    if (provider === "openai") {
      result = await transcribeWithOpenAI(audioData, apiKey);
    } else {
      result = await transcribeWithGroq(audioData, apiKey);
    }

    // Update rate limit only AFTER successful transcription
    // This prevents failed requests from consuming rate limit
    rateLimitMap.set(userId, now);

    // Audio is NOT persisted - only the text result is returned
    logger.info(`Transcription complete: ${result.text.substring(0, 50)}...`);

    return result;
  } catch (err) {
    logger.error("Transcription failed:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Transcription failed. Please try again.",
    });
  }
});
