# Research: Voice Input with LLM Processing

**Feature**: 003-voice-input-llm  
**Date**: January 22, 2026  
**Status**: Complete

---

## Executive Summary

This research explores a **commercial-ready** voice input system with tiered pricing model. Key findings:

1. **STT (Speech-to-Text)**: Web Speech API for free tier, Whisper WASM for privacy, cloud APIs for premium
2. **LLM**: Groq offers 10-20x cost advantage over OpenAI; on-device viable only for simple extraction
3. **BYOK**: Essential for power users; client-side encrypted storage is industry standard

---

## Decision 1: Speech-to-Text Provider

### Options Evaluated

| Option                         | Cost        | Privacy            | Accuracy  | Offline |
| ------------------------------ | ----------- | ------------------ | --------- | ------- |
| Web Speech API                 | Free        | ⚠️ Audio to Google | Good      | ❌      |
| Whisper WASM (transformers.js) | Free        | ✅ On-device       | Good      | ✅      |
| OpenAI Whisper API             | $0.006/min  | ⚠️ Cloud           | Excellent | ❌      |
| Deepgram Nova-3                | $0.0077/min | ⚠️ Cloud           | Excellent | ❌      |
| AssemblyAI                     | $0.0025/min | ⚠️ Cloud           | Excellent | ❌      |

### Decision: Tiered STT

| Tier                | Provider                    | Rationale                            |
| ------------------- | --------------------------- | ------------------------------------ |
| **Free**            | Web Speech API              | Works instantly, 88% browser support |
| **Privacy Mode**    | Whisper WASM (tiny/base)    | 40-75MB download, fully on-device    |
| **Premium BYOK**    | User's OpenAI/Deepgram key  | Best accuracy, user pays directly    |
| **Premium Managed** | Our AssemblyAI/Deepgram key | Best UX, we control (future)         |

### Implementation Notes

```typescript
// Tiered transcription selection
type STTProvider = "web-speech" | "whisper-wasm" | "openai" | "deepgram";

interface STTConfig {
  provider: STTProvider;
  apiKey?: string; // For BYOK
  preferOffline: boolean;
}
```

**Privacy Disclosure Required**: Must inform users that Web Speech API sends audio to Google (Chrome/Edge) or Apple (Safari).

---

## Decision 2: LLM for Structured Extraction

### Options Evaluated

| Model                 | Cost per 1K extractions | Speed   | Quality   | On-Device? |
| --------------------- | ----------------------- | ------- | --------- | ---------- |
| Qwen2-0.5B (WebLLM)   | $0                      | Slow    | Basic     | ✅         |
| Llama-3.2-1B (WebLLM) | $0                      | Slow    | Good      | ✅         |
| Groq Llama-3.1-8B     | $0.02                   | ⚡ Fast | Good      | ❌         |
| Groq Llama-3.3-70B    | $0.14                   | ⚡ Fast | Excellent | ❌         |
| OpenAI GPT-4o-mini    | $0.80                   | Fast    | Excellent | ❌         |
| Claude Haiku          | $0.70                   | Fast    | Excellent | ❌         |

### Decision: Tiered LLM

| Tier        | Provider                         | Cost Impact               |
| ----------- | -------------------------------- | ------------------------- |
| **Free**    | Rule-based + Qwen2-0.5B fallback | $0                        |
| **Premium** | Groq Llama-3.3-70B               | ~$0.50/month for avg user |
| **BYOK**    | User's OpenAI/Anthropic key      | User pays                 |

### Why Groq for Premium?

1. **10-20x cheaper** than OpenAI/Anthropic
2. **Fastest inference** (300-800 tokens/sec)
3. **Excellent quality** with Llama-3.3-70B
4. **Simple API** compatible with OpenAI SDK

### Multi-Tada Extraction Prompt

```typescript
const EXTRACTION_PROMPT = `You extract structured data from voice transcriptions.

Return JSON matching this schema:
{
  "tadas": [
    {
      "title": "string",
      "category": "home" | "work" | "health" | "family" | "creative" | "learning" | null,
      "significance": "minor" | "normal" | "major"
    }
  ],
  "journalType": "dream" | "reflection" | "gratitude" | "note" | null,
  "confidence": 0.0-1.0
}

Rules:
- Split compound accomplishments into separate tadas
- "finally" or "at last" → significance: "major"
- Dreams: mentions of sleeping, dreaming, waking up
- Gratitude: "thankful", "grateful", "appreciate"
- Reflection: "thinking about", "realized", "wondering"
- Keep original wording where possible`;

// Example input:
"Today I fixed the sink, called mom, and finally finished that book.
 Also had a weird dream about flying."

// Expected output:
{
  "tadas": [
    { "title": "Fixed the sink", "category": "home", "significance": "normal" },
    { "title": "Called mom", "category": "family", "significance": "normal" },
    { "title": "Finished that book", "category": null, "significance": "major" }
  ],
  "journalType": "dream",
  "confidence": 0.85
}
```

---

## Decision 3: BYOK (Bring Your Own Key)

### Industry Patterns Reviewed

- **Cursor**: Stores keys in local encrypted storage, validates format
- **Raycast**: Native keychain storage, proxies through backend for premium features
- **Obsidian AI plugins**: Client-side storage, direct API calls

### Decision: Client-Side Encrypted Storage

```typescript
// Store API keys encrypted in localStorage/IndexedDB
interface APIKeyStore {
  provider: "openai" | "anthropic" | "groq" | "deepgram";
  encryptedKey: string; // Encrypted with Web Crypto API
  addedAt: string;
}

// User preferences table (existing)
// Add: llm_api_keys: APIKeyStore[]
```

### Security Considerations

1. **Encrypt at rest** using Web Crypto API with user-derived key
2. **Validate format** before storing (sk-..., gsk\_..., etc.)
3. **Test connection** on save to verify key works
4. **Never log** API keys to console or error tracking
5. **Clear on logout** if user enables secure mode

### UX Flow

1. Settings → "AI Processing" section
2. Toggle: "Use your own API key"
3. Dropdown: Select provider (OpenAI, Anthropic, Groq)
4. Password input: Paste key
5. "Test Connection" button
6. Success: Show green checkmark, hide key

---

## Decision 4: Commercial Tier Structure

### Proposed Pricing Model

| Tier        | Price    | STT                   | LLM                    | Features                   |
| ----------- | -------- | --------------------- | ---------------------- | -------------------------- |
| **Free**    | $0       | Web Speech API        | Rule-based + on-device | 50 voice entries/month     |
| **Premium** | $5/month | Whisper API (managed) | Groq (managed)         | Unlimited, better accuracy |
| **BYOK**    | Free     | User's API            | User's API             | Unlimited, any model       |

### Cost Analysis (Premium Tier)

Per user per month (assuming 100 voice entries):

- STT: 100 × 30sec × $0.006/min = **$0.30**
- LLM: 100 × $0.00014 = **$0.014**
- **Total COGS: ~$0.32/user/month**
- **Margin at $5/month: 94%**

### Rate Limits

| Tier    | Voice Entries/Day | Entries/Month |
| ------- | ----------------- | ------------- |
| Free    | 5                 | 50            |
| Premium | Unlimited         | Unlimited     |
| BYOK    | Unlimited         | Unlimited     |

---

## Decision 5: Browser Compatibility

### Support Matrix

| Feature         | Chrome | Safari | Firefox | Edge |
| --------------- | ------ | ------ | ------- | ---- |
| Web Speech API  | ✅     | ✅     | ❌      | ✅   |
| MediaRecorder   | ✅     | ✅     | ✅      | ✅   |
| WebGPU (WebLLM) | ✅     | 🔶     | 🔶      | ✅   |
| Whisper WASM    | ✅     | ✅     | ✅      | ✅   |
| IndexedDB       | ✅     | ✅     | ✅      | ✅   |

### Firefox Strategy

Firefox lacks Web Speech API. Fallback chain:

1. Try Whisper WASM (on-device)
2. If Premium/BYOK: Use cloud API
3. Show "Voice not available" with typing alternative

---

## Decision 6: On-Device Model Selection

### Whisper Models (STT)

| Model           | Size  | Download | Best For                          |
| --------------- | ----- | -------- | --------------------------------- |
| whisper-tiny.en | 40MB  | 10s      | Quick transcription, English only |
| whisper-base.en | 75MB  | 20s      | Better accuracy, English only     |
| whisper-small   | 250MB | 60s      | Multi-language                    |

**Decision**: Default to `whisper-tiny.en`, offer base as "High Quality" toggle.

### WebLLM Models (Extraction)

| Model                 | Size  | Load Time | Quality          |
| --------------------- | ----- | --------- | ---------------- |
| Qwen2-0.5B-Instruct   | 300MB | 5-10s     | Basic extraction |
| Llama-3.2-1B-Instruct | 500MB | 10-15s    | Good extraction  |

**Decision**: Use Qwen2-0.5B for free tier on-device. Accept quality tradeoff for zero cost.

---

## Alternatives Considered

### Rejected: All-Cloud Architecture

**Why rejected**: Privacy-first philosophy. Many users want on-device processing.

### Rejected: Only On-Device

**Why rejected**: Mobile WebLLM too slow/large. Premium users want best accuracy.

### Rejected: OpenAI-Only Cloud

**Why rejected**: Groq is 10-20x cheaper with comparable quality for extraction task.

---

## Implementation Priority

1. **Phase 1**: Web Speech API + rule-based extraction (MVP)
2. **Phase 2**: Cloud LLM (Groq) for Premium/BYOK
3. **Phase 3**: Whisper WASM for privacy mode
4. **Phase 4**: WebLLM for fully offline (optional)

---

## Open Questions Resolved

| Question               | Resolution                                             |
| ---------------------- | ------------------------------------------------------ |
| Whisper library choice | `@huggingface/transformers` (best maintained)          |
| Local LLM feasibility  | Viable for simple tasks; cloud recommended for quality |
| BYOK security          | Client-side encrypted storage (industry standard)      |
| Premium pricing        | $5/month covers costs with 94% margin                  |
| Firefox support        | Fallback to WASM or cloud; not a blocker               |
