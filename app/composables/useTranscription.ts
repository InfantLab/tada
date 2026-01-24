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
   * TODO: Implement when Whisper worker is ready
   */
  async function transcribeWithWhisperWasm(
    _blob: Blob,
    _options: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    // Placeholder for Whisper WASM implementation
    throw new Error(
      "Whisper WASM not yet implemented. Use Web Speech or cloud transcription.",
    );
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
   * Start live transcription from microphone
   */
  async function startLiveTranscription(
    options: TranscriptionOptions = {},
  ): Promise<boolean> {
    if (recognitionInstance.value) {
      console.log("[useTranscription] Already running, returning false");
      return false; // Already running
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      error.value = "Web Speech API not supported in this browser";
      return false;
    }

    try {
      const recognition = new SpeechRecognition() as SpeechRecognitionInstance;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = options.language || "en-US";

      console.log(
        "[useTranscription] Starting live transcription with lang:",
        recognition.lang,
      );
      console.log("[useTranscription] Page context:", {
        url: typeof window !== "undefined" ? window.location.href : "N/A",
        protocol:
          typeof window !== "undefined" ? window.location.protocol : "N/A",
        isSecureContext:
          typeof window !== "undefined" ? window.isSecureContext : "N/A",
      });

      status.value = "transcribing";
      activeProvider.value = "web-speech";
      liveTranscript.value = "";

      recognition.onstart = () => {
        console.log(
          "[useTranscription] Recognition started - listening for speech",
        );
      };

      recognition.onaudiostart = () => {
        console.log("[useTranscription] Audio capture started");
      };

      recognition.onsoundstart = () => {
        console.log("[useTranscription] Sound detected");
      };

      recognition.onspeechstart = () => {
        console.log("[useTranscription] Speech detected");
      };

      recognition.onspeechend = () => {
        console.log("[useTranscription] Speech ended");
      };

      recognition.onsoundend = () => {
        console.log("[useTranscription] Sound ended");
      };

      recognition.onaudioend = () => {
        console.log("[useTranscription] Audio capture ended");
      };

      recognition.onresult = (event: Event) => {
        const speechEvent = event as SpeechRecognitionEvent;
        let interim = "";
        let final = "";

        console.log(
          "[useTranscription] Got result event, results count:",
          speechEvent.results.length,
          "resultIndex:",
          speechEvent.resultIndex,
        );

        for (let i = 0; i < speechEvent.results.length; i++) {
          const result = speechEvent.results[i];
          if (!result) continue;
          const alternative = result[0];
          if (!alternative) continue;

          console.log(
            "[useTranscription] Result",
            i,
            "isFinal:",
            result.isFinal,
            "transcript:",
            JSON.stringify(alternative.transcript),
            "confidence:",
            alternative.confidence,
          );

          if (result.isFinal) {
            final += alternative.transcript;
          } else {
            interim += alternative.transcript;
          }
        }

        console.log(
          "[useTranscription] Processed results - final:",
          JSON.stringify(final),
          "interim:",
          JSON.stringify(interim),
        );

        // Store both final and interim - use interim as fallback if no final yet
        liveTranscript.value = final || interim;

        if (options.onInterim) {
          options.onInterim(interim || final);
        }

        // Update result with current best transcript (final preferred, interim as fallback)
        result.value = {
          text: (final || interim).trim(),
          provider: "web-speech",
          processingMethod: "web-speech",
          confidence: final ? 0.8 : 0.5, // Lower confidence for interim
          duration: 0,
        };

        console.log(
          "[useTranscription] Updated liveTranscript:",
          JSON.stringify(liveTranscript.value),
          "result.text:",
          JSON.stringify(result.value.text),
        );
      };

      recognition.onerror = (event: Event) => {
        const errorEvent = event as SpeechRecognitionErrorEvent;
        console.error("[useTranscription] Recognition error details:", {
          error: errorEvent.error,
          message: errorEvent.message,
          type: errorEvent.type,
          timeStamp: errorEvent.timeStamp,
          currentTranscript: liveTranscript.value,
          resultText: result.value?.text,
        });

        // "no-speech" is not a fatal error - it just means we haven't detected speech yet
        // The recognition will continue and may detect speech later
        if (errorEvent.error === "no-speech") {
          console.log(
            "[useTranscription] No speech detected yet, continuing...",
          );
          // Don't set error state - just let it continue
          return;
        }

        // "aborted" happens when we intentionally stop - not an error
        if (errorEvent.error === "aborted") {
          console.log(
            "[useTranscription] Recognition aborted (intentional stop)",
          );
          return;
        }

        // "network" error - but we may already have partial results
        if (errorEvent.error === "network") {
          console.log(
            "[useTranscription] Network error, but checking if we have transcript:",
            {
              liveTranscript: liveTranscript.value,
              resultText: result.value?.text,
            },
          );
          // If we already captured some text, don't treat as error
          if (liveTranscript.value || result.value?.text) {
            console.log(
              "[useTranscription] Have transcript despite network error, continuing...",
            );
            return;
          }
        }

        error.value = getSpeechErrorMessage(errorEvent.error);
        status.value = "error";
      };

      recognition.onend = () => {
        console.log(
          "[useTranscription] Recognition ended, status:",
          status.value,
          "transcript:",
          liveTranscript.value,
        );
        if (status.value === "transcribing") {
          // Restart if still expected to be running
          console.log("[useTranscription] Restarting recognition...");
          recognition.start();
        }
      };

      recognition.start();
      recognitionInstance.value = recognition as SpeechRecognitionInstance;

      return true;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to start live transcription";
      console.error("[useTranscription] Failed to start:", err);
      error.value = message;
      status.value = "error";
      return false;
    }
  }

  /**
   * Stop live transcription
   */
  function stopLiveTranscription(): void {
    console.log(
      "[useTranscription] stopLiveTranscription called, current state:",
      {
        hasInstance: !!recognitionInstance.value,
        status: status.value,
        liveTranscript: liveTranscript.value,
        resultText: result.value?.text,
      },
    );
    if (recognitionInstance.value) {
      status.value = "idle"; // Set before stop to prevent restart in onend
      recognitionInstance.value.stop();
      recognitionInstance.value = null;
    }
  }

  /**
   * Reset all state
   */
  function reset(): void {
    stopLiveTranscription();
    result.value = null;
    status.value = "idle";
    progress.value = 0;
    error.value = null;
    activeProvider.value = null;
    liveTranscript.value = "";
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopLiveTranscription();
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
