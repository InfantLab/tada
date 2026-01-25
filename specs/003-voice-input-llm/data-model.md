# Data Model: Voice Input with LLM Processing

**Feature**: 003-voice-input-llm  
**Date**: January 22, 2026

---

## Overview

No new database tables required. Voice features extend existing schemas:

- **Entry.data** field stores voice-specific metadata
- **User preferences** stores API keys and provider settings
- **IndexedDB** (client-side) stores audio queue and model cache

---

## Extended Entry Data (SQLite)

When an entry has `source: "voice"`, the `data` JSONB field includes:

```typescript
interface VoiceEntryData {
  // Transcription metadata
  voiceTranscription: string; // Original unedited transcription
  processingMethod: "web-speech" | "whisper-wasm" | "whisper-cloud";
  transcriptionConfidence?: number; // 0-1 if available

  // LLM extraction metadata (for tadas)
  extractedFrom?: string; // Parent transcription ID if multi-tada
  llmProvider?: "on-device" | "groq" | "openai" | "anthropic";
  llmConfidence?: number; // 0-1 extraction confidence

  // Existing fields remain unchanged
  [key: string]: unknown;
}
```

### Example: Voice Journal Entry

```json
{
  "id": "entry_abc123",
  "type": "journal",
  "name": "Morning dream about flying",
  "category": "journal",
  "subcategory": "dream",
  "source": "voice",
  "data": {
    "voiceTranscription": "I had this weird dream where I was flying over mountains and then I woke up suddenly",
    "processingMethod": "web-speech",
    "transcriptionConfidence": 0.92,
    "content": "I had this weird dream where I was flying over mountains and then I woke up suddenly"
  }
}
```

### Example: Multi-Tada Extraction

Parent transcription creates multiple entries, linked by `extractedFrom`:

```json
// Entry 1 of 3
{
  "id": "entry_tada_001",
  "type": "tada",
  "name": "Fixed the sink",
  "category": "accomplishment",
  "subcategory": "home",
  "source": "voice",
  "data": {
    "voiceTranscription": "Today I fixed the sink, called mom, and finally finished that book",
    "extractedFrom": "voice_session_xyz",
    "llmProvider": "groq",
    "llmConfidence": 0.95,
    "significance": "normal"
  }
}
```

---

## User Preferences Extension

Add to existing `preferences` JSON in user record or preferences table:

```typescript
interface VoicePreferences {
  // STT settings
  sttProvider: "auto" | "web-speech" | "whisper-wasm" | "cloud";
  preferOffline: boolean; // Default: false

  // LLM settings
  llmProvider: "auto" | "on-device" | "groq" | "openai" | "anthropic";

  // BYOK API keys (encrypted)
  apiKeys?: {
    openai?: EncryptedKey;
    anthropic?: EncryptedKey;
    groq?: EncryptedKey;
    deepgram?: EncryptedKey;
  };

  // Usage tracking (for free tier limits)
  voiceEntriesThisMonth?: number;
  voiceEntriesResetDate?: string; // ISO date
}

interface EncryptedKey {
  ciphertext: string; // AES-GCM encrypted
  iv: string; // Initialization vector
  addedAt: string; // ISO timestamp
}
```

---

## Client-Side Storage (IndexedDB)

### Voice Processing Queue

For offline recordings awaiting processing:

```typescript
interface VoiceQueueItem {
  id: string; // UUID
  audioBlob: Blob; // WAV or WebM
  mimeType: string;
  duration: number; // Seconds
  createdAt: string; // ISO timestamp
  status: "pending" | "processing" | "failed";
  retryCount: number;
  error?: string;
  context: "journal" | "tada" | "timer-note";
}

// IndexedDB store: "voice_queue"
```

### Model Cache

For Whisper WASM and WebLLM models:

```typescript
interface ModelCacheEntry {
  modelId: string; // e.g., "whisper-tiny.en"
  version: string;
  downloadedAt: string;
  sizeBytes: number;
  lastUsed: string;
}

// IndexedDB store: "model_cache"
// Actual model files stored in Cache API or OPFS
```

---

## Extracted Entry Types (Client-Side Only)

These types are used during the extraction/review flow but not persisted:

```typescript
// Multi-tada extraction result
interface ExtractedTada {
  tempId: string; // Temporary UUID for UI
  title: string; // Extracted accomplishment text
  category: string | null; // Suggested category
  subcategory: string | null; // Suggested subcategory
  significance: "minor" | "normal" | "major";
  selected: boolean; // User acceptance state
  confidence: number; // 0-1 LLM confidence
  originalText?: string; // Portion of transcription this came from
}

// Journal type detection result
interface JournalDetection {
  subcategory: "dream" | "reflection" | "gratitude" | "note";
  confidence: number;
  signals: string[]; // What triggered detection
}

// Full extraction result from LLM
interface ExtractionResult {
  tadas: ExtractedTada[];
  journalType: JournalDetection | null;
  rawTranscription: string;
  processingMethod: string;
  processingDuration: number; // Milliseconds
}
```

---

## API Request/Response Types

### POST /api/voice/transcribe (Cloud Fallback)

```typescript
// Request (multipart/form-data)
interface TranscribeRequest {
  audio: Blob;
  mimeType: string;
  provider?: "whisper" | "deepgram" | "assemblyai";
  userApiKey?: string; // For BYOK
}

// Response
interface TranscribeResponse {
  text: string;
  confidence: number;
  duration: number; // Audio duration in seconds
  provider: string;
}
```

### POST /api/voice/structure (Cloud LLM)

```typescript
// Request
interface StructureRequest {
  text: string;
  context: "tada" | "journal" | "timer-note";
  provider?: "groq" | "openai" | "anthropic";
  userApiKey?: string; // For BYOK
}

// Response
interface StructureResponse {
  tadas: ExtractedTada[];
  journalType: JournalDetection | null;
  confidence: number;
  tokensUsed: number;
}
```

---

## Migration Notes

### No Schema Migration Required

- Entry `data` field is schemaless JSON - no migration needed
- Preferences stored in existing user preferences system
- IndexedDB created on first use (client-side only)

### Backwards Compatibility

- Entries without `voiceTranscription` in data field continue to work
- `source: "voice"` is a new value alongside "manual" and "import"
- Old clients will display voice entries normally (just won't show voice metadata)

---

## Privacy Considerations

| Data           | Storage                 | Retention                   |
| -------------- | ----------------------- | --------------------------- |
| Audio blobs    | IndexedDB (temp)        | Deleted after transcription |
| Transcriptions | Entry.data              | Permanent (user's data)     |
| API keys       | Preferences (encrypted) | Until user removes          |
| Model cache    | Cache API               | Until cleared by user       |

**Key principle**: Audio is NEVER persisted to server. Only text transcriptions are stored.
