/**
 * useTranscription Composable
 * Handles speech-to-text with multiple provider fallbacks
 * @composable
 */

import type {
  STTProvider,
  TranscriptionResult,
  VoiceRecordingStatus,
} from "~/types/voice";
import {
  supportsWebSpeech,
  getSpeechRecognition,
} from "~/utils/voiceBrowserSupport";

export interface TranscriptionOptions {
  /** Force a specific provider instead of using preference cascade */
  forceProvider?: STTProvider;
  /** Language code for transcription (default: "en-US") */
  language?: string;
  /** Callback for interim/partial results */
  onInterim?: (text: string) => void;
}

export interface UseTranscriptionReturn {
  /** Current transcription result */
  result: Ref<TranscriptionResult | null>;
  /** Current status */
  status: Ref<VoiceRecordingStatus>;
  /** Progress percentage (0-100) */
  progress: Ref<number>;
  /** Error message if any */
  error: Ref<string | null>;
  /** Whether transcription is in progress */
  isTranscribing: Ref<boolean>;
  /** Active provider being used */
  activeProvider: Ref<STTProvider | null>;
  /** Live transcript text (from Web Speech API) */
  liveTranscript: Ref<string>;
  /** Start transcription from audio blob */
  transcribe: (
    blob: Blob,
    options?: TranscriptionOptions,
  ) => Promise<TranscriptionResult | null>;
  /** Start live transcription (Web Speech API) */
  startLiveTranscription: (options?: TranscriptionOptions) => Promise<boolean>;
  /** Stop live transcription */
  stopLiveTranscription: () => void;
  /** Reset state */
  reset: () => void;
}

/**
 * Speech-to-text composable with provider fallbacks
 */
// Define interface for SpeechRecognition instance (matches voiceBrowserSupport.ts)
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onsoundend: (() => void) | null;
  onaudioend: (() => void) | null;
}

/** Maximum retry attempts for transient failures */
const MAX_RETRIES = 3;
/** Delay between retries (ms) - doubles each attempt */
const INITIAL_RETRY_DELAY = 1000;

/**
 * Helper to retry async operations with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_RETRY_DELAY,
): Promise<T> {
  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry for permanent failures
      const permanentErrors = [
        "not supported",
        "permission",
        "denied",
        "invalid",
        "unauthorized",
      ];
      if (
        permanentErrors.some((e) =>
          lastError!.message.toLowerCase().includes(e),
        )
      ) {
        throw lastError;
      }

      // Wait before retry with exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  throw lastError || new Error("Operation failed after retries");
}

export function useTranscription(): UseTranscriptionReturn {
  // State
  const result = ref<TranscriptionResult | null>(null);
  const status = ref<VoiceRecordingStatus>("idle");
  const progress = ref(0);
  const error = ref<string | null>(null);
  const activeProvider = ref<STTProvider | null>(null);

  // Live transcription state
  const recognitionInstance = ref<SpeechRecognitionInstance | null>(null);
  const liveTranscript = ref("");

  // Computed
  const isTranscribing = computed(() => status.value === "transcribing");

  // Settings composable
  const voiceSettings = useVoiceSettings();

  /**
   * Determine which provider to use based on preferences and availability
   */
  function resolveProvider(forceProvider?: STTProvider): STTProvider {
    if (forceProvider && forceProvider !== "auto") {
      return forceProvider;
    }

    const preferred = voiceSettings.preferences.value.sttProvider;

    // Auto-resolve logic
    if (preferred === "auto") {
      // Check Web Speech API first (free, no API key needed)
      if (supportsWebSpeech()) {
        return "web-speech";
      }
      // TODO: Check for Whisper WASM when implemented
      // Fallback to cloud if API key available
      if (voiceSettings.getApiKey("groq")) {
        return "whisper-cloud";
      }
      // Default to web-speech attempt (will fail gracefully)
      return "web-speech";
    }

    return preferred;
  }

  /**
   * Transcribe audio blob using appropriate provider
   */
  async function transcribe(
    blob: Blob,
    options: TranscriptionOptions = {},
  ): Promise<TranscriptionResult | null> {
    const startTime = Date.now();
    error.value = null;
    result.value = null;
    progress.value = 0;
    status.value = "transcribing";

    const provider = resolveProvider(options.forceProvider);
    activeProvider.value = provider;

    try {
      let transcriptionResult: TranscriptionResult;

      switch (provider) {
        case "web-speech":
          transcriptionResult = await transcribeWithWebSpeech(blob, options);
          break;

        case "whisper-wasm":
          transcriptionResult = await transcribeWithWhisperWasm(blob, options);
          break;

        case "whisper-cloud":
          // Cloud providers get retry logic for transient network failures
          transcriptionResult = await withRetry(
            () => transcribeWithWhisperCloud(blob, options),
            MAX_RETRIES,
            INITIAL_RETRY_DELAY,
          );
          break;

        default:
          throw new Error(`Unknown STT provider: ${provider}`);
      }

      progress.value = 100;
      result.value = transcriptionResult;
      status.value = "idle";

      // Track usage if successful
      voiceSettings.incrementUsage();

      return transcriptionResult;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Transcription failed";
      // Log to console for debugging
      console.error("[useTranscription] Error:", err);
      error.value = message;
      status.value = "error";
      result.value = {
        text: "",
        provider,
        processingMethod:
          provider === "auto"
            ? "web-speech"
            : (provider as "web-speech" | "whisper-wasm" | "whisper-cloud"),
        confidence: 0,
        duration: Date.now() - startTime,
        error: message,
      };
      return null;
    }
  }

  /**
   * Transcribe using Web Speech API
   * Note: Web Speech API typically works with live audio, not blobs
   * This implementation uses a workaround via audio playback
   */
  async function transcribeWithWebSpeech(
    blob: Blob,
    options: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const language = options.language || "en-US";

    return new Promise((resolve, reject) => {
      const SpeechRecognition = getSpeechRecognition();
      if (!SpeechRecognition) {
        reject(new Error("Web Speech API not supported"));
        return;
      }

      // For blob transcription, we need to play the audio and capture it
      // This is a limitation of Web Speech API - it works best with live mic input
      // For recorded blobs, we'll use the live transcription approach
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = !!options.onInterim;
      recognition.lang = language;

      let finalTranscript = "";

      recognition.onresult = (event: Event) => {
        const speechEvent = event as SpeechRecognitionEvent;
        for (
          let i = speechEvent.resultIndex;
          i < speechEvent.results.length;
          i++
        ) {
          const result = speechEvent.results[i];
          if (!result) continue;
          const alternative = result[0];
          if (!alternative) continue;

          if (result.isFinal) {
            finalTranscript += alternative.transcript;
          } else if (options.onInterim) {
            options.onInterim(alternative.transcript);
          }
        }
        progress.value = Math.min(90, progress.value + 10);
      };

      recognition.onend = () => {
        resolve({
          text: finalTranscript.trim(),
          provider: "web-speech",
          processingMethod: "web-speech",
          confidence: 0.8, // Web Speech doesn't provide reliable confidence
          duration: Date.now() - startTime,
          language,
        });
      };

      recognition.onerror = (event: Event) => {
        const errorEvent = event as SpeechRecognitionErrorEvent;
        reject(new Error(getSpeechErrorMessage(errorEvent.error)));
      };

      // Start recognition - note: this captures from mic, not blob
      // For blob playback transcription, we'd need a more complex setup
      recognition.start();
      progress.value = 10;

      // Auto-stop after reasonable duration based on blob size
      const estimatedDuration = Math.min(blob.size / 16000, 60) * 1000; // rough estimate
      setTimeout(() => {
        recognition.stop();
      }, estimatedDuration + 2000);
    });
  }

  /**
   * Transcribe using Whisper WASM (local, private)
   * Uses Web Worker with transformers.js for on-device transcription
   */
  async function transcribeWithWhisperWasm(
    blob: Blob,
    options: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const language = options.language || "en";

    return new Promise((resolve, reject) => {
      // Create worker for Whisper transcription
      let worker: Worker | null = null;

      try {
        worker = new Worker(
          new URL("~/workers/whisper.worker.ts", import.meta.url),
          { type: "module" },
        );
      } catch {
        reject(
          new Error(
            "Failed to create Whisper worker. Web Workers may not be supported.",
          ),
        );
        return;
      }

      // Timeout after 5 minutes
      const timeout = setTimeout(
        () => {
          if (worker) {
            worker.terminate();
          }
          reject(new Error("Whisper transcription timed out after 5 minutes"));
        },
        5 * 60 * 1000,
      );

      // Track if we need to initialize first
      let isInitialized = false;
      const requestId = crypto.randomUUID();

      worker.onmessage = async (event) => {
        const { type, id, payload } = event.data;

        switch (type) {
          case "ready":
            if (!isInitialized && payload?.status === "worker-loaded") {
              // Worker is loaded, now initialize the model
              worker!.postMessage({
                type: "init",
                payload: { modelSize: "tiny" }, // Start with tiny for faster init
              });
            } else if (payload?.modelName) {
              // Model is ready, now transcribe
              isInitialized = true;
              progress.value = 30;

              // Convert blob to ArrayBuffer
              const arrayBuffer = await blob.arrayBuffer();
              worker!.postMessage({
                type: "transcribe",
                id: requestId,
                payload: {
                  audioBlob: arrayBuffer,
                  language,
                },
              });
            }
            break;

          case "download-progress": {
            // Report download progress (0-30%)
            const downloadProgress = payload.percentComplete;
            progress.value = Math.round(downloadProgress * 0.3);
            break;
          }

          case "result":
            if (id === requestId) {
              clearTimeout(timeout);
              worker!.terminate();
              progress.value = 100;

              resolve({
                text: payload.text || "",
                provider: "whisper-wasm",
                processingMethod: "whisper-wasm",
                confidence: payload.confidence || 0.9,
                duration: Date.now() - startTime,
                language,
              });
            }
            break;

          case "error":
            clearTimeout(timeout);
            worker!.terminate();
            reject(
              new Error(payload?.message || "Whisper transcription failed"),
            );
            break;
        }
      };

      worker.onerror = (err) => {
        clearTimeout(timeout);
        worker!.terminate();
        reject(new Error(`Whisper worker error: ${err.message}`));
      };

      // Start progress
      progress.value = 5;
    });
  }

  /**
   * Transcribe using cloud Whisper API (Groq or OpenAI)
   */
  async function transcribeWithWhisperCloud(
    blob: Blob,
    options: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const language = options.language || "en";

    // Check for API key
    const apiKey = voiceSettings.getApiKey("groq");
    if (!apiKey) {
      throw new Error(
        "Groq API key required for cloud transcription. Add it in Settings.",
      );
    }

    progress.value = 10;

    // Create form data with audio file
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-large-v3");
    formData.append("language", language);

    progress.value = 30;

    // Call Groq Whisper API
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

    progress.value = 80;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as { text: string };

    return {
      text: data.text.trim(),
      provider: "whisper-cloud",
      processingMethod: "whisper-cloud",
      confidence: 0.95, // Whisper is generally high confidence
      duration: Date.now() - startTime,
      language,
    };
  }

  /**
   * Safely cleanup any existing recognition instance
   * This MUST be called before creating a new instance to prevent
   * stale instances from causing network errors
   */
  function cleanupRecognitionInstance(): void {
    const instance = recognitionInstance.value;
    if (instance) {
      console.log(
        `[useTranscription] Cleaning up existing recognition instance`,
        {
          timestamp: new Date().toISOString(),
        },
      );

      // Remove all event handlers to prevent callbacks during cleanup
      instance.onresult = null;
      instance.onerror = null;
      instance.onend = null;
      instance.onstart = null;
      instance.onaudiostart = null;
      instance.onsoundstart = null;
      instance.onspeechstart = null;
      instance.onspeechend = null;
      instance.onsoundend = null;
      instance.onaudioend = null;

      // Abort the recognition (more forceful than stop())
      try {
        instance.abort();
      } catch {
        // Ignore errors during abort - instance may already be stopped
      }

      recognitionInstance.value = null;
    }
  }

  /**
   * Start live transcription from microphone
   * IMPORTANT: Creates a fresh SpeechRecognition instance every time
   * to avoid stale session issues with Chrome's remote speech service
   */
  async function startLiveTranscription(
    options: TranscriptionOptions = {},
  ): Promise<boolean> {
    console.log(`[useTranscription] startLiveTranscription called`, {
      timestamp: new Date().toISOString(),
      hasExistingInstance: !!recognitionInstance.value,
      currentStatus: status.value,
    });

    // CRITICAL: Always cleanup any existing instance first
    // This prevents stale session errors when navigating between pages
    cleanupRecognitionInstance();

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      error.value = "Web Speech API not supported in this browser";
      return false;
    }

    try {
      // Always create a FRESH instance - never reuse old ones
      const recognition = new SpeechRecognition() as SpeechRecognitionInstance;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = options.language || "en-US";

      // Clear previous state
      error.value = null;
      status.value = "transcribing";
      activeProvider.value = "web-speech";
      liveTranscript.value = "";
      result.value = null;

      // Track if this instance is still active (for async callbacks)
      // This prevents race conditions if a new instance is created
      const instanceId = crypto.randomUUID();
      let isActive = true;

      // Simple transcript accumulation following MDN pattern
      // Web Speech API accumulates all results in event.results
      recognition.onresult = (event: Event) => {
        if (!isActive) return;

        const speechEvent = event as SpeechRecognitionEvent;
        let finalTranscript = "";
        let interimTranscript = "";

        // Loop through ALL results and concatenate
        for (let i = 0; i < speechEvent.results.length; i++) {
          const result = speechEvent.results[i];
          if (!result?.[0]) continue;

          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Full text = all finals + current interim
        const fullText = (finalTranscript + interimTranscript).trim();

        console.log(`[useTranscription] onresult`, {
          timestamp: new Date().toISOString(),
          instanceId: instanceId.slice(0, 8),
          resultIndex: speechEvent.resultIndex,
          resultsLength: speechEvent.results.length,
          finalTranscriptLength: finalTranscript.length,
          interimTranscriptLength: interimTranscript.length,
          fullTextPreview:
            fullText.slice(0, 80) + (fullText.length > 80 ? "..." : ""),
        });

        // Update our refs
        liveTranscript.value = fullText;
        result.value = {
          text: fullText,
          provider: "web-speech",
          processingMethod: "web-speech",
          confidence: finalTranscript ? 0.85 : 0.5,
          duration: 0,
        };

        // Callback for UI updates
        if (options.onInterim) {
          options.onInterim(fullText);
        }
      };

      recognition.onerror = (event: Event) => {
        if (!isActive) return;

        const errorEvent = event as SpeechRecognitionErrorEvent;
        const timestamp = new Date().toISOString();

        console.log(`[useTranscription] onerror fired`, {
          timestamp,
          instanceId: instanceId.slice(0, 8),
          errorCode: errorEvent.error,
          errorMessage: errorEvent.message,
          currentStatus: status.value,
          hasLiveTranscript: !!liveTranscript.value,
          liveTranscriptLength: liveTranscript.value?.length || 0,
          liveTranscriptPreview:
            liveTranscript.value?.slice(0, 50) || "(empty)",
        });

        // Ignore non-fatal errors - these happen normally during speech recognition
        if (errorEvent.error === "no-speech") {
          console.log(
            `[useTranscription] No speech detected, continuing to listen...`,
          );
          return;
        }

        if (errorEvent.error === "aborted") {
          console.log(
            `[useTranscription] Recognition aborted (expected during cleanup)`,
          );
          return;
        }

        // Network error is often transient - if we have transcript, consider it success
        if (errorEvent.error === "network") {
          if (liveTranscript.value) {
            console.log(
              `[useTranscription] Network error but have transcript - treating as success`,
            );
            // Don't set error state, the transcript is valid
            return;
          }
          // Network error with no transcript - this is the problematic case
          // Mark instance as inactive to prevent auto-restart
          isActive = false;
          console.warn(
            `[useTranscription] Network error with no transcript - stopping recognition`,
            {
              errorCode: errorEvent.error,
            },
          );
        }

        console.error(`[useTranscription] Fatal error, setting error state`, {
          errorCode: errorEvent.error,
          mappedMessage: getSpeechErrorMessage(errorEvent.error),
        });
        error.value = getSpeechErrorMessage(errorEvent.error);
        status.value = "error";
        isActive = false;
        cleanupRecognitionInstance();
      };

      recognition.onend = () => {
        console.log(`[useTranscription] onend fired`, {
          timestamp: new Date().toISOString(),
          instanceId: instanceId.slice(0, 8),
          isActive,
          status: status.value,
          hasRecognitionInstance: !!recognitionInstance.value,
          liveTranscriptLength: liveTranscript.value?.length || 0,
        });

        // Only auto-restart if this instance is still active and we're still transcribing
        if (
          isActive &&
          status.value === "transcribing" &&
          recognitionInstance.value === recognition
        ) {
          console.log(`[useTranscription] Auto-restarting recognition`);
          try {
            recognition.start();
          } catch (err) {
            console.error(
              `[useTranscription] Failed to restart recognition`,
              err,
            );
            // If restart fails, create a completely fresh instance
            isActive = false;
            error.value =
              "Speech recognition temporarily unavailable. Try speaking in shorter segments or check your internet connection.";
            status.value = "error";
            cleanupRecognitionInstance();
          }
        } else {
          console.log(
            `[useTranscription] Not restarting - session ended normally`,
          );
        }
      };

      console.log(`[useTranscription] Starting recognition`, {
        timestamp: new Date().toISOString(),
        instanceId: instanceId.slice(0, 8),
        language: recognition.lang,
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
      });

      recognition.start();
      recognitionInstance.value = recognition as SpeechRecognitionInstance;
      return true;
    } catch (err) {
      console.error(`[useTranscription] Failed to start recognition`, err);
      error.value =
        err instanceof Error ? err.message : "Failed to start transcription";
      status.value = "error";
      cleanupRecognitionInstance();
      return false;
    }
  }

  /**
   * Stop live transcription
   * Properly cleans up the recognition instance to prevent stale session issues
   */
  function stopLiveTranscription(): void {
    console.log(`[useTranscription] stopLiveTranscription called`, {
      timestamp: new Date().toISOString(),
      hasInstance: !!recognitionInstance.value,
      currentStatus: status.value,
      liveTranscriptLength: liveTranscript.value?.length || 0,
    });

    // Set status to idle FIRST to prevent auto-restart in onend handler
    status.value = "idle";

    // Then cleanup the instance (this will abort and null out the handlers)
    cleanupRecognitionInstance();
  }

  /**
   * Reset all state
   */
  function reset(): void {
    console.log(`[useTranscription] reset called`, {
      timestamp: new Date().toISOString(),
    });
    status.value = "idle";
    cleanupRecognitionInstance();
    result.value = null;
    progress.value = 0;
    error.value = null;
    activeProvider.value = null;
    liveTranscript.value = "";
  }

  // Cleanup on unmount - critical for preventing stale instances after navigation
  onUnmounted(() => {
    console.log(`[useTranscription] Component unmounting, cleaning up`, {
      timestamp: new Date().toISOString(),
      hasInstance: !!recognitionInstance.value,
    });
    status.value = "idle";
    cleanupRecognitionInstance();
  });

  return {
    result,
    status,
    progress,
    error,
    isTranscribing,
    activeProvider,
    liveTranscript,
    transcribe,
    startLiveTranscription,
    stopLiveTranscription,
    reset,
  };
}

// Type definitions for Web Speech API (not in standard lib.dom.d.ts)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

/**
 * Map Web Speech API error codes to user-friendly messages
 */
function getSpeechErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    "no-speech":
      "No speech was detected. Please try speaking closer to the microphone.",
    "audio-capture":
      "Could not access microphone. Please check your audio device.",
    "not-allowed":
      "Microphone access was denied. Please allow microphone access in your browser settings.",
    network:
      "Network error occurred. Please check your internet connection and try again.",
    aborted: "Recording was cancelled.",
    "service-not-allowed":
      "Speech recognition service is not available. Try using a different browser.",
    "bad-grammar": "Speech recognition grammar error. Please try again.",
    "language-not-supported": "Language not supported for speech recognition.",
  };
  return errorMessages[errorCode] || `Speech recognition failed: ${errorCode}`;
}
