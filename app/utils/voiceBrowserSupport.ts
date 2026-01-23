/**
 * Browser Voice Capability Detection
 * Detects support for various voice-related APIs
 * @module utils/voiceBrowserSupport
 */

import type { VoiceBrowserCapabilities } from "~/types/voice";

// Type declarations for Web Speech API (not in standard lib.dom.d.ts)
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

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
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

/**
 * Check if Web Speech API is available
 * Available in Chrome, Safari, Edge. NOT available in Firefox.
 */
export function supportsWebSpeech(): boolean {
  if (typeof window === "undefined") return false;

  // Check for standard API
  if ("SpeechRecognition" in window) {
    return true;
  }

  // Check for webkit prefix (Safari)
  if ("webkitSpeechRecognition" in window) {
    return true;
  }

  return false;
}

/**
 * Get the SpeechRecognition constructor (handles webkit prefix)
 */
export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  // Standard API
  if ("SpeechRecognition" in window && window.SpeechRecognition) {
    return window.SpeechRecognition;
  }

  // Webkit prefix (Safari, older Chrome)
  if ("webkitSpeechRecognition" in window && window.webkitSpeechRecognition) {
    return window.webkitSpeechRecognition;
  }

  return null;
}

/**
 * Check if MediaRecorder API is available
 * Available in all modern browsers
 */
export function supportsMediaRecorder(): boolean {
  if (typeof window === "undefined") return false;
  return "MediaRecorder" in window;
}

/**
 * Get preferred audio codec for MediaRecorder
 * Different browsers support different codecs
 */
export function getPreferredAudioCodec():
  | "audio/webm;codecs=opus"
  | "audio/mp4"
  | "audio/wav" {
  if (typeof window === "undefined" || !supportsMediaRecorder()) {
    return "audio/wav";
  }

  // Prefer WebM/Opus (best compression, widely supported)
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }

  // Fallback to WebM without codec specification
  if (MediaRecorder.isTypeSupported("audio/webm")) {
    return "audio/webm;codecs=opus"; // Return preferred, browser will handle
  }

  // Safari uses MP4
  if (MediaRecorder.isTypeSupported("audio/mp4")) {
    return "audio/mp4";
  }

  // Ultimate fallback
  return "audio/wav";
}

/**
 * Check if WebGPU is available (for future WebLLM support)
 */
export async function supportsWebGPU(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (!("gpu" in navigator)) {
    return false;
  }

  try {
    const nav = navigator as Navigator & {
      gpu?: { requestAdapter(): Promise<unknown | null> };
    };
    if (!nav.gpu) return false;
    const adapter = await nav.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Check if WASM SIMD is supported (for Whisper WASM)
 */
export function supportsWasmSIMD(): boolean {
  if (typeof WebAssembly === "undefined") return false;

  try {
    // This is a minimal WASM module that uses SIMD
    // If it compiles, SIMD is supported
    const simdTest = new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10,
      1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
    ]);
    return WebAssembly.validate(simdTest);
  } catch {
    return false;
  }
}

/**
 * Detect browser name
 */
export function getBrowserName():
  | "chrome"
  | "safari"
  | "firefox"
  | "edge"
  | "unknown" {
  if (typeof window === "undefined") return "unknown";

  const ua = navigator.userAgent;

  if (ua.includes("Edg/")) return "edge";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "safari";
  if (ua.includes("Firefox/")) return "firefox";

  return "unknown";
}

/**
 * Check if running on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

/**
 * Get all voice browser capabilities
 */
export async function getVoiceCapabilities(): Promise<VoiceBrowserCapabilities> {
  const webGPU = await supportsWebGPU();

  return {
    webSpeechAPI: supportsWebSpeech(),
    mediaRecorder: supportsMediaRecorder(),
    webGPU,
    wasmSIMD: supportsWasmSIMD(),
    preferredCodec: getPreferredAudioCodec(),
  };
}

/**
 * Get a user-friendly message about voice support
 */
export function getVoiceSupportMessage(): {
  supported: boolean;
  message: string;
} {
  const browser = getBrowserName();

  if (!supportsMediaRecorder()) {
    return {
      supported: false,
      message:
        "Your browser doesn't support audio recording. Please use a modern browser.",
    };
  }

  if (browser === "firefox") {
    return {
      supported: true,
      message:
        "Voice input is available, but transcription requires an internet connection in Firefox.",
    };
  }

  if (!supportsWebSpeech()) {
    return {
      supported: true,
      message:
        "Voice recording is available. Transcription will use cloud processing.",
    };
  }

  return {
    supported: true,
    message: "Full voice input support available.",
  };
}
