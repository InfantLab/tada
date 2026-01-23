/**
 * useLLMStructure Composable
 * Handles LLM integration for structured extraction from transcriptions
 * @composable
 */

import type { LLMProvider } from "~/types/voice";
import type { ExtractionResult } from "~/types/extraction";
import {
  EXTRACTION_PROMPT,
  parseExtractionResponse,
  extractTadasRuleBased,
} from "~/utils/tadaExtractor";

/**
 * Get the raw API key string from encrypted key
 * Note: In production, this would use Web Crypto API for proper decryption
 * For MVP, we store the key directly in ciphertext field
 */
function getApiKeyString(
  voiceSettings: ReturnType<typeof useVoiceSettings>,
  provider: "openai" | "anthropic" | "groq" | "deepgram",
): string | null {
  const encryptedKey = voiceSettings.getApiKey(provider);
  if (!encryptedKey) return null;
  // For MVP, the ciphertext contains the actual key
  // TODO: Implement proper Web Crypto API decryption
  return encryptedKey.ciphertext;
}

export interface UseLLMStructureReturn {
  /** Extract tadas from transcription */
  extractTadas: (transcription: string) => Promise<ExtractionResult>;
  /** Current extraction status */
  status: Ref<"idle" | "extracting" | "error">;
  /** Error message if extraction failed */
  error: Ref<string | null>;
  /** Active LLM provider being used */
  activeProvider: Ref<LLMProvider | null>;
  /** Token usage for current extraction */
  tokenUsage: Ref<{ prompt: number; completion: number; total: number } | null>;
  /** Reset state */
  reset: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * LLM integration for structured data extraction
 */
export function useLLMStructure(): UseLLMStructureReturn {
  const voiceSettings = useVoiceSettings();

  // State
  const status = ref<"idle" | "extracting" | "error">("idle");
  const error = ref<string | null>(null);
  const activeProvider = ref<LLMProvider | null>(null);
  const tokenUsage = ref<{
    prompt: number;
    completion: number;
    total: number;
  } | null>(null);

  /**
   * Determine which LLM provider to use
   */
  function resolveProvider(): LLMProvider {
    const preferred = voiceSettings.preferences.value.llmProvider;

    if (preferred === "auto") {
      // Check for Groq API key first (fastest)
      if (voiceSettings.getApiKey("groq")) {
        return "groq";
      }
      // Check for OpenAI key
      if (voiceSettings.getApiKey("openai")) {
        return "openai";
      }
      // Check for Anthropic key
      if (voiceSettings.getApiKey("anthropic")) {
        return "anthropic";
      }
      // No API keys - use rule-based fallback
      return "on-device";
    }

    return preferred;
  }

  /**
   * Sleep for retry delay
   */
  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Extract tadas from transcription with retry logic
   */
  async function extractTadas(
    transcription: string,
  ): Promise<ExtractionResult> {
    status.value = "extracting";
    error.value = null;
    tokenUsage.value = null;

    const provider = resolveProvider();
    activeProvider.value = provider;

    // If no LLM available, use rule-based extraction
    if (provider === "on-device") {
      const tadas = extractTadasRuleBased(transcription);
      status.value = "idle";
      return {
        tadas,
        provider: "on-device",
        success: true,
        processingTimeMs: 0,
      };
    }

    // Try LLM extraction with retries
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await callLLMProvider(provider, transcription);
        status.value = "idle";
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[useLLMStructure] Attempt ${attempt + 1} failed:`, err);

        // Don't retry on auth errors
        if (
          lastError.message.includes("401") ||
          lastError.message.includes("403")
        ) {
          break;
        }

        // Wait before retry
        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    // All retries failed - try fallback provider
    const fallbackProvider = getFallbackProvider(provider);
    if (fallbackProvider) {
      try {
        activeProvider.value = fallbackProvider;
        const result = await callLLMProvider(fallbackProvider, transcription);
        status.value = "idle";
        return result;
      } catch (err) {
        console.error("[useLLMStructure] Fallback provider also failed:", err);
        // Fallback also failed
      }
    }

    // Use rule-based as final fallback
    const tadas = extractTadasRuleBased(transcription);
    status.value = "idle";

    return {
      tadas,
      provider: "on-device",
      success: tadas.length > 0,
      error: lastError?.message,
      processingTimeMs: 0,
    };
  }

  /**
   * Get fallback provider
   */
  function getFallbackProvider(primary: LLMProvider): LLMProvider | null {
    switch (primary) {
      case "groq":
        return voiceSettings.getApiKey("openai") ? "openai" : null;
      case "openai":
        return voiceSettings.getApiKey("anthropic") ? "anthropic" : null;
      default:
        return null;
    }
  }

  /**
   * Call specific LLM provider
   */
  async function callLLMProvider(
    provider: LLMProvider,
    transcription: string,
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    switch (provider) {
      case "groq":
        return await callGroq(transcription, startTime);
      case "openai":
        return await callOpenAI(transcription, startTime);
      case "anthropic":
        return await callAnthropic(transcription, startTime);
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }

  /**
   * Call Groq API
   */
  async function callGroq(
    transcription: string,
    startTime: number,
  ): Promise<ExtractionResult> {
    const apiKey = getApiKeyString(voiceSettings, "groq");
    if (!apiKey) {
      throw new Error("Groq API key not configured");
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: EXTRACTION_PROMPT },
            {
              role: "user",
              content: `Extract tadas from this transcription:\n\n${transcription}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as GroqResponse;

    // Track token usage
    if (data.usage) {
      tokenUsage.value = {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      };
    }

    const content = data.choices?.[0]?.message?.content || "";
    const parsed = parseExtractionResponse(content);

    return {
      tadas: parsed.tadas,
      journalFallback: parsed.journalFallback,
      provider: "groq",
      success: parsed.tadas.length > 0 || !!parsed.journalFallback,
      error: parsed.error,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Call OpenAI API
   */
  async function callOpenAI(
    transcription: string,
    startTime: number,
  ): Promise<ExtractionResult> {
    const apiKey = getApiKeyString(voiceSettings, "openai");
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          {
            role: "user",
            content: `Extract tadas from this transcription:\n\n${transcription}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OpenAIResponse;

    // Track token usage
    if (data.usage) {
      tokenUsage.value = {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      };
    }

    const content = data.choices?.[0]?.message?.content || "";
    const parsed = parseExtractionResponse(content);

    return {
      tadas: parsed.tadas,
      journalFallback: parsed.journalFallback,
      provider: "openai",
      success: parsed.tadas.length > 0 || !!parsed.journalFallback,
      error: parsed.error,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Call Anthropic API
   */
  async function callAnthropic(
    transcription: string,
    startTime: number,
  ): Promise<ExtractionResult> {
    const apiKey = getApiKeyString(voiceSettings, "anthropic");
    if (!apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        system: EXTRACTION_PROMPT,
        messages: [
          {
            role: "user",
            content: `Extract tadas from this transcription (respond in JSON only):\n\n${transcription}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    // Track token usage
    if (data.usage) {
      tokenUsage.value = {
        prompt: data.usage.input_tokens,
        completion: data.usage.output_tokens,
        total: data.usage.input_tokens + data.usage.output_tokens,
      };
    }

    const content =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";
    const parsed = parseExtractionResponse(content);

    return {
      tadas: parsed.tadas,
      journalFallback: parsed.journalFallback,
      provider: "anthropic",
      success: parsed.tadas.length > 0 || !!parsed.journalFallback,
      error: parsed.error,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Reset state
   */
  function reset(): void {
    status.value = "idle";
    error.value = null;
    activeProvider.value = null;
    tokenUsage.value = null;
  }

  return {
    extractTadas,
    status,
    error,
    activeProvider,
    tokenUsage,
    reset,
  };
}

// Type definitions for API responses
interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AnthropicResponse {
  content?: Array<{
    type: string;
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}
