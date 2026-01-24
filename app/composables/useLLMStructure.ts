/**
 * useLLMStructure Composable
 * Handles LLM integration for structured extraction from transcriptions
 * Uses server-side API for LLM calls (Groq managed server-side, BYOK for OpenAI/Anthropic)
 * @composable
 */

import type { LLMProvider } from "~/types/voice";
import type { ExtractionResult, ExtractedTada } from "~/types/extraction";
import { extractTadasRuleBased } from "~/utils/tadaExtractor";

/**
 * Get the raw API key string from encrypted key
 * Note: In production, this would use Web Crypto API for proper decryption
 * For MVP, we store the key directly in ciphertext field
 */
function getApiKeyString(
  voiceSettings: ReturnType<typeof useVoiceSettings>,
  provider: "openai" | "anthropic",
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

/** Response from server structure API */
interface ServerStructureResponse {
  tadas: Array<{
    name: string;
    category?: string;
    significance?: "minor" | "normal" | "major";
  }>;
  journalType?: string;
  title?: string;
  provider: string;
  tokensUsed?: number;
}

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
   * Sleep for retry delay
   */
  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Determine if user has their own API key configured (BYOK)
   */
  function getUserApiKey(): {
    provider: "openai" | "anthropic";
    key: string;
  } | null {
    const preferred = voiceSettings.preferences.value.llmProvider;

    // If user specifically chose a provider and has a key, use it
    if (preferred === "openai") {
      const key = getApiKeyString(voiceSettings, "openai");
      if (key) return { provider: "openai", key };
    }
    if (preferred === "anthropic") {
      const key = getApiKeyString(voiceSettings, "anthropic");
      if (key) return { provider: "anthropic", key };
    }

    // In auto mode, check if user has any BYOK configured
    if (preferred === "auto") {
      const openaiKey = getApiKeyString(voiceSettings, "openai");
      if (openaiKey) return { provider: "openai", key: openaiKey };

      const anthropicKey = getApiKeyString(voiceSettings, "anthropic");
      if (anthropicKey) return { provider: "anthropic", key: anthropicKey };
    }

    return null;
  }

  /**
   * Extract tadas from transcription using server API
   * Server uses Groq (managed), or user's BYOK if configured
   */
  async function extractTadas(
    transcription: string,
  ): Promise<ExtractionResult> {
    status.value = "extracting";
    error.value = null;
    tokenUsage.value = null;
    const startTime = Date.now();

    console.log(
      "[useLLMStructure] extractTadas called with:",
      transcription.substring(0, 100) + "...",
    );

    // Check if user has BYOK configured
    const userKey = getUserApiKey();

    // Try server API (server has Groq key configured)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(
          `[useLLMStructure] Calling server API, attempt ${attempt + 1}`,
        );

        const headers: Record<string, string> = {};
        if (userKey) {
          headers["X-User-Api-Key"] = userKey.key;
        }

        const response = await $fetch<ServerStructureResponse>(
          "/api/voice/structure",
          {
            method: "POST",
            body: {
              text: transcription,
              mode: "tada",
              provider: userKey?.provider, // undefined = let server choose (Groq)
            },
            headers: Object.keys(headers).length > 0 ? headers : undefined,
          },
        );

        console.log("[useLLMStructure] Server response:", response);

        // Convert server response to ExtractedTada format
        const tadas: ExtractedTada[] = response.tadas.map((t, i) => ({
          id: `extracted-${i}`,
          title: t.name,
          category: t.category || "life",
          significance: t.significance || "normal",
          selected: true,
          confidence: 0.85,
        }));

        activeProvider.value = response.provider as LLMProvider;
        if (response.tokensUsed) {
          tokenUsage.value = {
            prompt: 0,
            completion: 0,
            total: response.tokensUsed,
          };
        }
        status.value = "idle";

        return {
          tadas,
          provider: response.provider as LLMProvider,
          success: true,
          processingTimeMs: Date.now() - startTime,
        };
      } catch (err) {
        console.error(`[useLLMStructure] Attempt ${attempt + 1} failed:`, err);

        // Check if it's a service unavailable error
        const errMessage = err instanceof Error ? err.message : String(err);
        if (
          errMessage.includes("503") ||
          errMessage.includes("not configured")
        ) {
          // Server doesn't have LLM configured, fall back to rule-based
          console.log(
            "[useLLMStructure] Server LLM not configured, using rule-based",
          );
          break;
        }

        // Wait before retry
        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    // Fallback to rule-based extraction
    console.log("[useLLMStructure] Falling back to rule-based extraction");
    const tadas = extractTadasRuleBased(transcription);
    activeProvider.value = "on-device";
    status.value = "idle";

    return {
      tadas,
      provider: "on-device",
      success: tadas.length > 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Reset composable state
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
