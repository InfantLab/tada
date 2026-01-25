# Voice AI Architecture

> **Version**: v0.3.0  
> **Last Updated**: January 24, 2026

This document explains how voice input and AI processing works in Ta-Da, including the data flow, provider options, and fallback mechanisms.

## Overview

Ta-Da's voice feature allows users to speak naturally and have their accomplishments ("tadas") automatically extracted. The system uses a tiered approach:

1. **Speech-to-Text (STT)**: Browser's Web Speech API (free, runs via Google/Apple)
2. **AI Extraction**: Server-side LLM processing with client-side fallback

## Where to Find Voice Settings

Voice & AI settings are located in **Settings → Voice & AI** (gear icon → Voice & AI section).

The voice recording feature is integrated into:

- **Ta-Da! page** - Record tadas by voice
- **Timer page** - Add voice notes after sessions
- **/voice** - Dedicated voice recording page (hidden from main nav)

## Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│   User speaks   │───▶│ Browser Speech   │───▶│  Text transcript  │
│   into mic      │    │ API (Google/     │    │                   │
│                 │    │ Apple backend)   │    │                   │
└─────────────────┘    └──────────────────┘    └─────────┬─────────┘
                                                         │
                                                         ▼
                       ┌──────────────────────────────────────────┐
                       │           Ta-Da Server                   │
                       │                                          │
                       │  ┌─────────────────────────────────────┐ │
                       │  │ POST /api/voice/structure           │ │
                       │  │                                     │ │
                       │  │  Has X-User-Api-Key header?         │ │
                       │  │  ├─ YES: Use user's OpenAI/Anthropic│ │
                       │  │  └─ NO: Use server's GROQ_API_KEY   │ │
                       │  │       (Llama 3.3 70B - fast/cheap)  │ │
                       │  └─────────────────────────────────────┘ │
                       └──────────────────────────────────────────┘
                                         │
                                         ▼
                              ┌─────────────────┐
                              │  Extracted      │
                              │  Ta-Das         │
                              └─────────────────┘
```

## Data Flow

### 1. Speech-to-Text (Client-Side)

| Component      | Location | Provider                               | Cost |
| -------------- | -------- | -------------------------------------- | ---- |
| Web Speech API | Browser  | Google (Chrome/Edge) or Apple (Safari) | Free |

**How it works:**

- User taps the microphone button
- Browser requests microphone permission
- Audio is streamed to Google/Apple's speech recognition service
- Transcribed text is returned in real-time (interim + final results)

**Privacy Note:** Audio is processed by Google or Apple depending on the browser. This is a browser-level API and cannot be avoided without using a custom STT solution (Whisper WASM - planned for future).

### 2. AI Extraction (Server-Side)

| Scenario         | Provider  | Model          | Who Pays           |
| ---------------- | --------- | -------------- | ------------------ |
| Default          | Groq      | Llama 3.3 70B  | Developer/Operator |
| BYOK (OpenAI)    | OpenAI    | gpt-4o-mini    | User               |
| BYOK (Anthropic) | Anthropic | claude-3-haiku | User               |

**Endpoint:** `POST /api/voice/structure`

**Request:**

```typescript
{
  text: string;           // Transcribed speech
  mode: "tada" | "journal" | "timer-note";
  provider?: "groq" | "openai" | "anthropic";  // Optional, defaults to groq
}
```

**Headers:**

- `X-User-Api-Key`: User's BYOK key (optional)

**Response:**

```typescript
{
  tadas: Array<{
    name: string;
    category?: string;
    significance?: "minor" | "normal" | "major";
  }>;
  journalType?: "dream" | "reflection" | "note";
  provider: string;
  tokensUsed?: number;
}
```

### 3. Fallback Chain

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Extraction Request                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Try Server API (3 retries)   │
              │  with exponential backoff     │
              └───────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
            ✅ Success                 ❌ Fails
                 │                         │
                 ▼                         ▼
         ┌──────────────┐     ┌──────────────────────────┐
         │  LLM Result  │     │  Rule-Based Fallback     │
         │  (high qual) │     │  (client-side, offline)  │
         └──────────────┘     └──────────────────────────┘
```

**Rule-Based Fallback** (`extractTadasRuleBased()`):

- Runs entirely in the browser (no network needed)
- Splits text by conjunctions ("and", "then", "also")
- Detects action verbs: finished, completed, fixed, cleaned, called, etc.
- Detects significance from keywords ("finally" = major)
- Detects category from context keywords
- Returns 60% confidence score (vs 85%+ for LLM)

**When Fallback Activates:**

- Server returns 503 (LLM not configured)
- Server is offline/unreachable
- All 3 retry attempts fail
- Network is completely unavailable

## Configuration

### Server-Side (Developer/Operator)

Set in `.env`:

```bash
# Primary LLM - RECOMMENDED
# Fast, cheap, reliable. Get yours at https://console.groq.com/keys
GROQ_API_KEY=gsk_...

# Optional fallbacks (if Groq unavailable)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Rate limiting
VOICE_FREE_LIMIT=50  # Monthly limit for free tier
```

**Provider Priority:**

1. If user sends BYOK header → use user's key with requested provider
2. Else if `provider=groq` and `GROQ_API_KEY` set → use Groq
3. Else if `provider=openai` and `OPENAI_API_KEY` set → use OpenAI
4. Else if `provider=anthropic` and `ANTHROPIC_API_KEY` set → use Anthropic
5. Else → return 503 (triggers client fallback)

### Client-Side (User Settings)

Users configure in **Settings → Voice & AI**:

| Setting            | Options                         | Description                     |
| ------------------ | ------------------------------- | ------------------------------- |
| Speech Recognition | Auto, Browser, On-Device, Cloud | How speech is transcribed       |
| AI Processing      | Auto, OpenAI, Anthropic         | Which LLM to use                |
| Prefer Offline     | Toggle                          | Prioritize on-device processing |
| BYOK Keys          | OpenAI, Anthropic               | User's own API keys             |

**BYOK Flow:**

1. User adds API key in Settings
2. Key stored in browser localStorage (encrypted MVP, proper Web Crypto planned)
3. On extraction, key sent in `X-User-Api-Key` header
4. Server uses user's key instead of server's Groq key
5. User billed directly by their provider

## Rate Limiting

| Tier           | Limit     | Enforcement              |
| -------------- | --------- | ------------------------ |
| Free (no BYOK) | 50/month  | Server rejects with 402  |
| BYOK           | Unlimited | Billed to user's account |

**Rate Limit Response:**

```json
{
  "statusCode": 402,
  "statusMessage": "Free tier limit reached (50/month). Add your own API key in settings to continue."
}
```

## Cost Analysis

### Server Costs (Groq)

| Usage                 | Cost                    |
| --------------------- | ----------------------- |
| Per extraction        | ~$0.003 (Llama 3.3 70B) |
| 100 users × 50/month  | ~$15/month              |
| 1000 users × 50/month | ~$150/month             |

### BYOK Costs (User Pays)

| Provider  | Model          | Cost per extraction |
| --------- | -------------- | ------------------- |
| OpenAI    | gpt-4o-mini    | ~$0.002             |
| Anthropic | claude-3-haiku | ~$0.003             |

## Security Considerations

1. **Audio Privacy**: Audio never reaches Ta-Da servers. Browser sends directly to Google/Apple for STT.

2. **Text Privacy**: Transcribed text is sent to Ta-Da server, then to LLM provider. Not stored permanently.

3. **BYOK Keys**: Stored in browser localStorage. Sent to Ta-Da server in header, then used to call provider API. Keys never logged or stored server-side.

4. **Rate Limiting**: Prevents abuse of server's Groq quota. 10-second cooldown between requests per user.

## Browser Compatibility

| Browser | Web Speech API                  | Fallback           |
| ------- | ------------------------------- | ------------------ |
| Chrome  | ✅ Full support                 | N/A                |
| Edge    | ✅ Full support                 | N/A                |
| Safari  | ✅ Full support (webkit prefix) | N/A                |
| Firefox | ❌ Not supported                | Show error message |

## Future Enhancements

1. **Whisper WASM** (T196-T203): On-device transcription for full offline support and privacy
2. **WebLLM**: On-device LLM for extraction without any network calls
3. **Streaming**: Real-time extraction as user speaks

## Troubleshooting

### "Extraction service not configured"

- Server doesn't have `GROQ_API_KEY` set
- Solution: Add key to `.env` or user adds BYOK

### "Free tier limit reached"

- User hit 50/month limit
- Solution: User adds BYOK key in settings

### Low confidence extractions

- Rule-based fallback is being used
- Check server logs for LLM errors
- Verify `GROQ_API_KEY` is valid

### "Speech recognition not supported"

- User is on Firefox
- Solution: Use Chrome, Edge, or Safari

## Related Files

- `app/composables/useLLMStructure.ts` - Client-side extraction orchestration
- `app/server/api/voice/structure.post.ts` - Server endpoint
- `app/utils/tadaExtractor.ts` - Rule-based fallback + LLM prompt
- `app/components/settings/VoiceSettings.vue` - User settings UI
- `app/composables/useTranscription.ts` - Web Speech API wrapper
