# Quickstart: Voice Input with LLM Processing

**Feature**: 003-voice-input-llm  
**Date**: January 22, 2026

---

## Implementation Order

Build in this sequence to enable incremental testing:

### Phase 1: Core Voice Capture (Week 1)

| #   | Component                  | Description                 | Test                    |
| --- | -------------------------- | --------------------------- | ----------------------- |
| 1   | `useVoiceCapture.ts`       | MediaRecorder wrapper       | Unit test with mock     |
| 2   | `VoiceRecorder.vue`        | Basic recording UI          | Manual - tap and record |
| 3   | `VoiceStatusIndicator.vue` | Recording/processing states | Visual check            |

**Milestone**: User can tap mic, see recording indicator, stop recording.

### Phase 2: Transcription (Week 1-2)

| #   | Component              | Description                     | Test             |
| --- | ---------------------- | ------------------------------- | ---------------- |
| 4   | `useTranscription.ts`  | Web Speech API first            | Integration test |
| 5   | Browser detection      | Safari prefix, Firefox fallback | Matrix test      |
| 6   | `VoiceReviewModal.vue` | Show transcription, allow edit  | Manual flow      |

**Milestone**: Speak → see text → edit → save as basic journal entry.

### Phase 3: LLM Extraction (Week 2)

| #   | Component                    | Description                 | Test                   |
| --- | ---------------------------- | --------------------------- | ---------------------- |
| 7   | `tadaExtractor.ts`           | Extraction prompt + parsing | Unit test with samples |
| 8   | `useLLMStructure.ts`         | Groq API integration        | Integration test       |
| 9   | `useJournalTypeDetection.ts` | Dream/reflection/gratitude  | Unit test              |
| 10  | `TadaChecklistReview.vue`    | Multi-tada accept/dismiss   | Manual flow            |
| 11  | `TadaChecklistItem.vue`      | Inline edit per tada        | Component test         |

**Milestone**: Ramble → see multiple tadas → check/uncheck → save all.

### Phase 4: BYOK & Settings (Week 3)

| #   | Component               | Description                   | Test             |
| --- | ----------------------- | ----------------------------- | ---------------- |
| 12  | API key encryption      | Web Crypto AES-GCM            | Unit test        |
| 13  | Settings UI             | Provider selection, key entry | Manual flow      |
| 14  | Key validation          | Test connection on save       | Integration test |
| 15  | `/api/voice/transcribe` | Cloud STT proxy               | API test         |
| 16  | `/api/voice/structure`  | Cloud LLM proxy               | API test         |

**Milestone**: User can add OpenAI key, use for better accuracy.

### Phase 5: Offline & Privacy (Week 4)

| #   | Component           | Description                 | Test             |
| --- | ------------------- | --------------------------- | ---------------- |
| 17  | `useVoiceQueue.ts`  | IndexedDB queue management  | Unit test        |
| 18  | Whisper WASM worker | transformers.js integration | Load test        |
| 19  | Model download UI   | Progress, WiFi-only option  | Manual flow      |
| 20  | Background sync     | Process queue on reconnect  | Integration test |

**Milestone**: Record offline → reconnect → see processed entries.

---

## File Structure

```
app/
├── components/
│   ├── voice/
│   │   ├── VoiceRecorder.vue         # Main recording button/UI
│   │   ├── VoiceReviewModal.vue      # Transcription review
│   │   ├── VoiceStatusIndicator.vue  # State feedback
│   │   ├── TadaChecklistReview.vue   # Multi-tada list
│   │   └── TadaChecklistItem.vue     # Individual tada row
│   └── settings/
│       └── VoiceSettings.vue         # Provider & API key config
├── composables/
│   ├── useVoiceCapture.ts            # MediaRecorder wrapper
│   ├── useTranscription.ts           # Tiered STT
│   ├── useLLMStructure.ts            # Extraction logic
│   ├── useJournalTypeDetection.ts    # Subcategory detection
│   └── useVoiceQueue.ts              # Offline queue
├── server/api/voice/
│   ├── transcribe.post.ts            # Cloud STT proxy
│   ├── structure.post.ts             # Cloud LLM proxy
│   └── usage.get.ts                  # Rate limit stats
├── workers/
│   ├── whisper.worker.ts             # WASM transcription
│   └── llm.worker.ts                 # On-device LLM
└── utils/
    ├── tadaExtractor.ts              # Extraction prompt/parsing
    ├── categoryMatcher.ts            # Rule-based fallback
    └── apiKeyEncryption.ts           # Web Crypto helpers
```

---

## Key Code Snippets

### 1. Voice Capture Composable

```typescript
// composables/useVoiceCapture.ts
export function useVoiceCapture() {
  const isRecording = ref(false);
  const audioBlob = ref<Blob | null>(null);
  const audioLevel = ref(0);

  let mediaRecorder: MediaRecorder | null = null;
  let analyser: AnalyserNode | null = null;

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Audio level visualization
    const audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    // Recording
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      audioBlob.value = new Blob(chunks, { type: "audio/webm" });
    };

    mediaRecorder.start();
    isRecording.value = true;
  }

  function stopRecording() {
    mediaRecorder?.stop();
    isRecording.value = false;
  }

  return { isRecording, audioBlob, audioLevel, startRecording, stopRecording };
}
```

### 2. Tiered Transcription

```typescript
// composables/useTranscription.ts
export function useTranscription() {
  const { provider, apiKey } = useVoiceSettings();

  async function transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    // Tier 1: Web Speech API (if available and not Firefox)
    if (provider.value === "auto" && supportsWebSpeech()) {
      try {
        return await transcribeWithWebSpeech(audioBlob);
      } catch (e) {
        console.warn("Web Speech failed, falling back", e);
      }
    }

    // Tier 2: Whisper WASM (if model cached)
    if (
      provider.value === "whisper-wasm" ||
      (await isModelCached("whisper-tiny"))
    ) {
      return await transcribeWithWhisperWasm(audioBlob);
    }

    // Tier 3: Cloud API
    return await transcribeWithCloud(audioBlob, apiKey.value);
  }

  return { transcribe };
}
```

### 3. Multi-Tada Extraction

```typescript
// utils/tadaExtractor.ts
const EXTRACTION_PROMPT = `Extract accomplishments from this voice transcription.

Return JSON:
{
  "tadas": [{ "title": "string", "category": "string|null", "significance": "minor|normal|major" }],
  "journalType": "dream|reflection|gratitude|note|null"
}

Rules:
- Split compound accomplishments into separate tadas
- "finally" or "at last" → significance: "major"
- Dreams: mentions sleeping, dreaming
- Keep original wording`;

export async function extractTadas(
  text: string,
  llmClient: LLMClient,
): Promise<ExtractionResult> {
  const response = await llmClient.chat({
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.content);
}
```

### 4. BYOK API Key Storage

```typescript
// utils/apiKeyEncryption.ts
export async function encryptApiKey(
  key: string,
  password: string,
): Promise<EncryptedKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("tada-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoder.encode(key),
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
    addedAt: new Date().toISOString(),
  };
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// utils/tadaExtractor.test.ts
describe("extractTadas", () => {
  it("extracts multiple tadas from compound sentence", async () => {
    const text = "Today I fixed the sink, called mom, and finished the book";
    const result = await extractTadas(text, mockLLM);

    expect(result.tadas).toHaveLength(3);
    expect(result.tadas[0].title).toContain("sink");
    expect(result.tadas[1].title).toContain("mom");
  });

  it('marks "finally" as major significance', async () => {
    const text = "I finally finished that project";
    const result = await extractTadas(text, mockLLM);

    expect(result.tadas[0].significance).toBe("major");
  });

  it("detects dream journal type", async () => {
    const text = "I had a weird dream about flying";
    const result = await extractTadas(text, mockLLM);

    expect(result.journalType).toBe("dream");
  });
});
```

### Integration Tests

```typescript
// tests/voice-flow.test.ts
describe("Voice to Entry Flow", () => {
  it("creates entry from voice recording", async () => {
    // 1. Record audio (mock)
    const audioBlob = createMockAudio("test audio");

    // 2. Transcribe
    const { transcribe } = useTranscription();
    const text = await transcribe(audioBlob);

    // 3. Extract
    const { extractTadas } = useLLMStructure();
    const result = await extractTadas(text);

    // 4. Save
    const entries = await saveExtractedEntries(result);

    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe("voice");
  });
});
```

---

## Environment Variables

```bash
# .env for development
GROQ_API_KEY=gsk_...           # Managed tier LLM
OPENAI_API_KEY=sk-...          # Fallback/testing
DEEPGRAM_API_KEY=...           # Premium STT

# Feature flags
VOICE_ENABLED=true
VOICE_FREE_LIMIT=50            # Monthly limit for free tier
VOICE_PREMIUM_ENABLED=false    # Enable managed premium
```

---

## Definition of Done

- [x] Voice capture works in Chrome, Safari, Edge
- [x] Firefox shows graceful degradation message
- [x] Multi-tada extraction works with 3+ items
- [x] Journal type detection works for dream/reflection/gratitude
- [x] BYOK flow allows OpenAI key entry and validation
- [x] Offline queue stores and replays recordings
- [x] 80% unit test coverage on extraction logic
- [x] Privacy disclosure shown before first use
