/**
 * API Key Validation Endpoint
 *
 * Validates LLM provider API keys by making minimal API calls.
 * Supports OpenAI, Anthropic, and Groq providers.
 *
 * POST /api/voice/validate-key
 *
 * @module server/api/voice/validate-key
 */

import { defineEventHandler, readBody, createError } from "h3";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:voice:validate-key");

interface ValidateKeyBody {
  provider: "openai" | "anthropic" | "groq";
  apiKey: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  provider: string;
}

/**
 * Validate an OpenAI API key by listing models
 */
async function validateOpenAI(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key", provider: "openai" };
    }

    if (response.status === 429) {
      return {
        valid: false,
        error: "Rate limited - key may be valid but quota exceeded",
        provider: "openai",
      };
    }

    if (!response.ok) {
      const text = await response.text();
      return { valid: false, error: `API error: ${text}`, provider: "openai" };
    }

    return { valid: true, provider: "openai" };
  } catch (err) {
    logger.error("OpenAI validation error:", err);
    return {
      valid: false,
      error: "Network error - could not reach OpenAI",
      provider: "openai",
    };
  }
}

/**
 * Validate an Anthropic API key by making a minimal completion request
 */
async function validateAnthropic(apiKey: string): Promise<ValidationResult> {
  try {
    // Use the messages API with a minimal request
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key", provider: "anthropic" };
    }

    if (response.status === 429) {
      return {
        valid: false,
        error: "Rate limited - key may be valid but quota exceeded",
        provider: "anthropic",
      };
    }

    // A successful response (even with usage errors) means the key is valid
    if (response.ok || response.status === 400) {
      // 400 might mean the request format is wrong but key is valid
      const text = await response.text();
      if (text.includes("invalid_api_key") || text.includes("authentication")) {
        return {
          valid: false,
          error: "Invalid API key",
          provider: "anthropic",
        };
      }
      return { valid: true, provider: "anthropic" };
    }

    const text = await response.text();
    return { valid: false, error: `API error: ${text}`, provider: "anthropic" };
  } catch (err) {
    logger.error("Anthropic validation error:", err);
    return {
      valid: false,
      error: "Network error - could not reach Anthropic",
      provider: "anthropic",
    };
  }
}

/**
 * Validate a Groq API key by listing models
 */
async function validateGroq(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key", provider: "groq" };
    }

    if (response.status === 429) {
      return {
        valid: false,
        error: "Rate limited - key may be valid but quota exceeded",
        provider: "groq",
      };
    }

    if (!response.ok) {
      const text = await response.text();
      return { valid: false, error: `API error: ${text}`, provider: "groq" };
    }

    return { valid: true, provider: "groq" };
  } catch (err) {
    logger.error("Groq validation error:", err);
    return {
      valid: false,
      error: "Network error - could not reach Groq",
      provider: "groq",
    };
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

  const { provider, apiKey } = body as Partial<ValidateKeyBody>;

  if (!provider || !["openai", "anthropic", "groq"].includes(provider)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Invalid provider. Must be one of: openai, anthropic, groq",
    });
  }

  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid API key format",
    });
  }

  logger.info(
    `Validating ${provider} API key for user ${event.context.user.id}`,
  );

  let result: ValidationResult;

  switch (provider) {
    case "openai":
      result = await validateOpenAI(apiKey);
      break;
    case "anthropic":
      result = await validateAnthropic(apiKey);
      break;
    case "groq":
      result = await validateGroq(apiKey);
      break;
    default:
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid provider",
      });
  }

  logger.info(
    `Validation result for ${provider}: ${result.valid ? "valid" : "invalid"}`,
  );

  return result;
});
