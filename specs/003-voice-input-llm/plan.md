# Implementation Plan: Voice Input with LLM Processing

**Branch**: `003-voice-input-llm` | **Date**: January 22, 2026 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-voice-input-llm/spec.md`

## Summary

Enable voice-dictated entry creation with intelligent LLM processing. Users can speak naturally to create journal entries, tadas, and notes. Key innovations:

1. **Multi-tada extraction**: LLM extracts multiple accomplishments from rambling speech, presenting a checklist for quick accept/dismiss
2. **Journal type detection**: Auto-detects dream/reflection/gratitude/note from content
3. **Tiered processing**: Web Speech API → Whisper WASM → Cloud API for transcription
4. **Privacy-first**: On-device processing as default with cloud opt-in
5. **Commercial model**: Free/Premium/BYOK tiers with 94% margin on Premium

## Commercial Architecture

| Tier        | STT Provider          | LLM Provider            | Price    | Limit     |
| ----------- | --------------------- | ----------------------- | -------- | --------- |
| **Free**    | Web Speech API        | Rule-based + Qwen2-0.5B | $0       | 50/month  |
| **Premium** | Whisper API (managed) | Groq Llama-3.3-70B      | $5/month | Unlimited |
| **BYOK**    | User's API key        | User's API key          | $0       | Unlimited |

**COGS per Premium user**: ~$0.32/month (100 voice entries)

See [research.md](./research.md) for full cost analysis.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 (production), Bun (development)  
**Primary Dependencies**: Nuxt 3, Vue 3, Drizzle ORM, Whisper.cpp (WASM), WebLLM  
**Storage**: SQLite (Drizzle), IndexedDB (audio blobs, model cache)  
**Testing**: Vitest, @nuxt/test-utils  
**Target Platform**: PWA (Chrome, Edge, Safari; Firefox with fallbacks)  
**Project Type**: Web application (Nuxt fullstack)  
**Performance Goals**: Recording start <100ms, Whisper <10s/60s audio, LLM <3s  
**Constraints**: Offline-capable, <50MB initial download (models cached separately)  
**Scale/Scope**: Self-hosted single user, future cloud multi-tenant

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Based on Ta-Da Philosophy (design/philosophy.md) and SDR (design/SDR.md):

| Principle                  | Requirement                                         | Status  |
| -------------------------- | --------------------------------------------------- | ------- |
| **Timers Count Up**        | Voice feature doesn't conflict                      | ✅ PASS |
| **Identity Over Behavior** | Voice supports capturing growth moments             | ✅ PASS |
| **Chains That Bend**       | Voice doesn't affect rhythm mechanics               | ✅ PASS |
| **Data Ownership**         | Local-first processing, user owns audio/transcripts | ✅ PASS |
| **Open Standards**         | Standard Entry model, no proprietary formats        | ✅ PASS |
| **Privacy First**          | On-device default, cloud opt-in with consent        | ✅ PASS |
| **Simplicity First**       | Progressive enhancement keeps base simple           | ✅ PASS |
| **No Feature Bloat**       | Targeted scope, clear user stories                  | ✅ PASS |

**Gate Status**: ✅ PASSED - All principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/003-voice-input-llm/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output - technology research
├── data-model.md        # Phase 1 output - schema additions
├── quickstart.md        # Phase 1 output - implementation guide
├── contracts/           # Phase 1 output - API specifications
│   └── voice-api.yaml   # OpenAPI spec for voice endpoints
└── tasks.md             # Phase 2 output (future)
```

### Source Code (existing structure, additions marked with +)

```text
app/
├── components/
│   ├── + voice/                      # Voice capture components
│   │   ├── VoiceRecorder.vue         # Recording UI with waveform
│   │   ├── VoiceReviewModal.vue      # Edit extracted fields before save
│   │   ├── VoiceStatusIndicator.vue  # Processing state feedback
│   │   ├── VoicePrivacyDisclosure.vue # First-use privacy notice
│   │   ├── VoiceErrorBoundary.vue    # Error handling wrapper
│   │   ├── TadaChecklistReview.vue   # Multi-tada accept/dismiss checklist
│   │   ├── TadaChecklistItem.vue     # Individual tada with inline edit
│   │   └── ModelDownloadProgress.vue # Whisper model download UI
│   └── + settings/
│       └── VoiceSettings.vue         # Provider & API key config
├── composables/
│   ├── + useVoiceCapture.ts        # MediaRecorder wrapper
│   ├── + useVoiceSettings.ts       # STT/LLM provider preferences
│   ├── + useTranscription.ts       # Tiered transcription logic
│   ├── + useLLMStructure.ts        # Entry field extraction + multi-tada
│   ├── + useJournalTypeDetection.ts # Dream/reflection/gratitude detection
│   └── + useVoiceQueue.ts          # Offline queue management
├── pages/
│   └── (existing add.vue, timer.vue, settings.vue enhanced with voice)
├── server/
│   └── api/
│       └── + voice/
│           ├── transcribe.post.ts  # Cloud transcription fallback
│           ├── structure.post.ts   # Cloud LLM fallback
│           ├── validate-key.post.ts # BYOK key validation
│           └── usage.get.ts        # Rate limit stats
├── workers/
│   └── + whisper.worker.ts         # Whisper WASM transcription worker
├── utils/
│   ├── + voiceBrowserSupport.ts    # Browser capability detection
│   ├── + tadaExtractor.ts          # Multi-tada extraction logic
│   ├── + categoryMatcher.ts        # Rule-based category detection
│   └── + apiKeyEncryption.ts       # Web Crypto API key helpers
└── types/
    ├── + voice.ts                  # Voice feature types
    └── + extraction.ts             # LLM extraction types
```

**Structure Decision**: Follows existing Nuxt 3 conventions. Voice-specific logic in composables and workers. Server routes only for optional cloud fallback. No new database tables needed - uses existing Entry schema with enhanced `data` field.

## Complexity Tracking

> No violations requiring justification. Design stays within Ta-Da principles.

| Aspect        | Approach                   | Justification                      |
| ------------- | -------------------------- | ---------------------------------- |
| Web Workers   | Required for WASM models   | Browser main thread would block UI |
| IndexedDB     | Required for offline queue | localStorage too small for audio   |
| Multiple APIs | Tiered fallback system     | Progressive enhancement philosophy |

---

## Phase 0: Research Required

### Technology Decisions Needed

| Topic                 | Question                                                     | Research Approach                              |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| **Whisper WASM**      | Which library? whisper.cpp, transformers.js, or whisper-web? | Compare bundle size, accuracy, browser support |
| **Local LLM**         | phi-2 vs TinyLlama vs Gemma-2B for on-device?                | Test extraction quality on sample transcripts  |
| **WebLLM vs Ollama**  | Client-side WASM or local server?                            | Evaluate memory usage, startup time            |
| **Multi-tada prompt** | How to reliably extract multiple items?                      | Test prompt engineering on GPT-4o-mini         |
| **Journal detection** | Keyword rules vs LLM classification?                         | Compare accuracy/latency tradeoffs             |

### Browser Compatibility Matrix

| Feature             | Chrome | Safari | Firefox | Edge |
| ------------------- | ------ | ------ | ------- | ---- |
| Web Speech API      | ✅     | ✅     | ❌      | ✅   |
| MediaRecorder       | ✅     | ✅     | ✅      | ✅   |
| WebGPU (for WebLLM) | ✅     | 🔶     | 🔶      | ✅   |
| WASM SIMD           | ✅     | ✅     | ✅      | ✅   |

**Output**: `research.md` with decisions and rationale

---

## Phase 1: Design Deliverables

### 1. Data Model (`data-model.md`)

No new database tables. Extends existing Entry `data` field:

```typescript
// For entries with source: "voice"
interface VoiceEntryData {
  voiceTranscription: string; // Original transcription
  processingMethod: "web-speech" | "whisper-wasm" | "whisper-cloud";
  confidence?: number; // Transcription confidence 0-1
  extractedFrom?: string; // Parent transcription ID for multi-tada
}

// For multi-tada extraction (client-side only, not persisted)
interface ExtractedTada {
  id: string; // Temporary ID for UI
  title: string; // Extracted tada text
  category: string; // Suggested category
  subcategory?: string; // Suggested subcategory
  significance: "minor" | "normal" | "major";
  selected: boolean; // User acceptance state
  confidence: number; // LLM confidence 0-1
}

// For journal type detection
interface JournalDetection {
  subcategory: "dream" | "reflection" | "gratitude" | "note";
  confidence: number;
  signals: string[]; // What triggered detection
}
```

### 2. API Contracts (`contracts/voice-api.yaml`)

```yaml
# Cloud fallback endpoints (optional, for when on-device unavailable)
POST /api/voice/transcribe
  - Input: audio blob (multipart/form-data)
  - Output: { text: string, confidence: number }

POST /api/voice/structure
  - Input: { text: string, context: "tada" | "journal" | "timer-note" }
  - Output: { entries: ExtractedTada[], journalType?: JournalDetection }
```

### 3. Quickstart (`quickstart.md`)

Implementation order:

1. `useVoiceCapture.ts` - MediaRecorder wrapper (testable in isolation)
2. `VoiceRecorder.vue` - Basic recording UI
3. `useTranscription.ts` - Web Speech API first (simplest tier)
4. `useLLMStructure.ts` - GPT-4o-mini cloud call for prototyping
5. `TadaChecklistReview.vue` - Multi-tada UI
6. Replace cloud LLM with on-device (Phase 2)

---

## User Story to Component Mapping

| Story                   | Primary Components                     | Key Composables                   |
| ----------------------- | -------------------------------------- | --------------------------------- |
| US-1: Voice Journal     | VoiceRecorder, VoiceReviewModal        | useVoiceCapture, useTranscription |
| US-2: Multi-Tada        | TadaChecklistReview, TadaChecklistItem | useLLMStructure, tadaExtractor    |
| US-3: Journal Detection | VoiceReviewModal                       | useJournalTypeDetection           |
| US-4: Timer Note        | VoiceRecorder (embedded in timer)      | useVoiceCapture                   |
| US-5: Offline           | VoiceStatusIndicator                   | useVoiceQueue                     |
| US-6: Privacy           | Settings toggle                        | useTranscription (tier selection) |
