/**
 * Voice Input Feature Types
 * @module types/voice
 */

/** Voice recording status */
export type VoiceRecordingStatus =
  | "idle"
  | "recording"
  | "processing"
  | "transcribing"
  | "extracting"
  | "complete"
  | "error"
  | "offline"
  | "queued"
  | "requesting-permission";

/** Supported STT providers */
export type STTProvider =
  | "auto"
  | "web-speech"
  | "whisper-wasm"
  | "whisper-cloud";

/** Supported LLM providers */
export type LLMProvider =
  | "auto"
  | "on-device"
  | "groq"
  | "openai"
  | "anthropic";

/** Processing method used for transcription */
export type ProcessingMethod = "web-speech" | "whisper-wasm" | "whisper-cloud";

/** Voice recording state */
export interface VoiceRecordingState {
  status: VoiceRecordingStatus;
  audioBlob: Blob | null;
  audioLevel: number;
  duration: number;
  error: string | null;
}

/** Transcription result from any provider */
export interface TranscriptionResult {
  text: string;
  confidence: number;
  processingMethod: ProcessingMethod;
  duration: number; // processing time in ms
  provider: STTProvider; // which provider was used
  language?: string; // detected or specified language
  error?: string; // error message if failed
}

/** Voice entry metadata stored in Entry.data field */
export interface VoiceEntryData {
  voiceTranscription: string;
  processingMethod: ProcessingMethod;
  transcriptionConfidence?: number;
  extractedFrom?: string; // Parent transcription ID for multi-tada
  llmProvider?: LLMProvider;
  llmConfidence?: number;
  [key: string]: unknown;
}

/** User voice preferences */
export interface VoicePreferences {
  sttProvider: STTProvider;
  llmProvider: LLMProvider;
  preferOffline: boolean;
  hasSeenPrivacyDisclosure: boolean;
  apiKeys?: {
    openai?: EncryptedKey;
    anthropic?: EncryptedKey;
    groq?: EncryptedKey;
    deepgram?: EncryptedKey;
  };
  voiceEntriesThisMonth?: number;
  voiceEntriesResetDate?: string;
}

/** Encrypted API key storage */
export interface EncryptedKey {
  ciphertext: string;
  iv: string;
  addedAt: string;
}

/** Browser voice capabilities */
export interface VoiceBrowserCapabilities {
  webSpeechAPI: boolean;
  mediaRecorder: boolean;
  webGPU: boolean;
  wasmSIMD: boolean;
  preferredCodec: "audio/webm;codecs=opus" | "audio/mp4" | "audio/wav";
}

/** Voice queue item for offline storage (IndexedDB) */
export interface VoiceQueueItem {
  id: string;
  audioBlob: Blob;
  mimeType: string;
  duration: number;
  createdAt: string;
  status: "pending" | "processing" | "failed";
  retryCount: number;
  error?: string;
  context: "journal" | "tada" | "timer-note";
}

/** Model cache entry (IndexedDB) */
export interface ModelCacheEntry {
  modelId: string;
  version: string;
  downloadedAt: string;
  sizeBytes: number;
  lastUsed: string;
}
