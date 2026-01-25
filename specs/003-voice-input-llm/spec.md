# Feature Specification: Voice Input with LLM Processing

**Feature Branch**: `003-voice-input-llm`  
**Created**: January 22, 2026  
**Status**: Draft  
**Input**: User description: "Find an innovative and modern solution to voice entry and LLM processing for v0.3.0"

## Overview

Enable users to dictate entries via voice with intelligent LLM processing to structure and categorize content automatically. The feature should feel magical yet respect privacy, work offline where possible, and align with Ta-Da's philosophy of minimal friction capture.

### Roadmap Reference

From [roadmap.md](../../design/roadmap.md) v0.3.0 goals:

- Dictate entries via voice
- LLM processing to structure dictated content
- Extract category, mood, key details automatically
- Review/edit before saving
- Works offline with on-device processing (where possible)

### Related Features

- **Serendipity Capture**: "Just noticed something" minimal friction entry (shares quick-capture UX)
- **Tada Quick Capture**: Already has voice field in TadaData schema (`voiceTranscription`)

---

## User Scenarios & Testing

### User Story 1 - Voice Journal Entry (Priority: P1)

As a user, I want to quickly dictate a dream or reflection when I wake up, so I can capture it before it fades without typing on my phone.

**Why this priority**: Core use case - capturing fleeting thoughts/dreams is time-sensitive and typing-averse. This is the primary value proposition.

**Independent Test**: Can be fully tested by tapping microphone, speaking, and saving. Delivers immediate value even without LLM categorization.

**Acceptance Scenarios**:

1. **Given** user is on the Add page, **When** they tap the microphone button, **Then** recording starts with visual feedback (pulsing indicator)
2. **Given** user is recording, **When** they tap stop, **Then** transcription begins and text appears within 3 seconds
3. **Given** transcription is complete, **When** user reviews the text, **Then** they can edit before saving
4. **Given** user saves the entry, **When** save completes, **Then** entry appears in journal with `source: "voice"`

---

### User Story 2 - Voice Tada Capture with Multi-Extract (Priority: P1)

As a user, I want to ramble about my day and have the system extract multiple ta-das I mentioned, so I can quickly accept or dismiss each one.

**Why this priority**: Tadas are the app's namesake feature - extracting multiple accomplishments from natural speech is the "magic" moment.

**Independent Test**: Speak "Today I fixed the sink, called my mom, and finally finished that book", see 3 proposed ta-das, accept/dismiss each.

**Acceptance Scenarios**:

1. **Given** user speaks multiple accomplishments, **When** LLM processes, **Then** each tada is extracted as a separate proposal
2. **Given** 3 tadas are proposed, **When** user sees the review list, **Then** each has checkbox, title, category, and significance
3. **Given** user unchecks "called my mom", **When** they tap Save, **Then** only 2 entries are created
4. **Given** transcription contains "finally", **When** LLM extracts that tada, **Then** significance is suggested as "major"
5. **Given** user taps a proposed tada, **When** edit mode opens, **Then** they can change title/category before saving

---

### User Story 3 - Journal Type Detection (Priority: P1)

As a user dictating a journal entry, I want the system to detect whether it's a dream, reflection, gratitude, or note based on content.

**Why this priority**: Reduces friction by auto-selecting the right subcategory - especially important for dreams captured on waking.

**Independent Test**: Say "I had this weird dream where I was flying", see subcategory auto-set to "dream".

**Acceptance Scenarios**:

1. **Given** user says "I dreamed...", **When** LLM processes, **Then** subcategory is set to "dream"
2. **Given** user says "I'm grateful for...", **When** LLM processes, **Then** subcategory is set to "gratitude"
3. **Given** user says "Just thinking about...", **When** LLM processes, **Then** subcategory is set to "reflection"
4. **Given** ambiguous content, **When** LLM is uncertain, **Then** default to "note" with easy change option

---

### User Story 4 - Voice Timer Note (Priority: P2)

As a user finishing meditation, I want to add a voice reflection before saving my session.

**Why this priority**: Enhances existing timer flow but not critical for standalone voice feature.

**Independent Test**: Complete timer, tap voice note button, speak reflection, see it added to entry notes.

**Acceptance Scenarios**:

1. **Given** user completes a timer session, **When** they tap "Add voice note", **Then** recording starts
2. **Given** user says "that was a great session", **When** LLM processes, **Then** quality rating 5 is suggested
3. **Given** voice note is transcribed, **When** user saves, **Then** transcription appears in entry notes field
4. **Given** voice note mentions tadas ("also I fixed the light"), **When** LLM processes, **Then** bonus tada is proposed for quick accept

---

### User Story 5 - Offline Voice Capture (Priority: P3)

As a user without internet, I want to record voice and have it processed later.

**Why this priority**: Important for reliability but not core to initial MVP. Progressive enhancement.

**Independent Test**: Turn off network, record voice, see queued indicator, restore network, see processing complete.

**Acceptance Scenarios**:

1. **Given** user is offline, **When** they record voice, **Then** audio is stored locally with "pending" status
2. **Given** pending recordings exist, **When** user goes online, **Then** processing resumes automatically
3. **Given** processing fails, **When** user taps retry, **Then** transcription is attempted again

---

### User Story 6 - Privacy-First Processing (Priority: P2)

As a privacy-conscious user, I want on-device processing when possible.

**Why this priority**: Aligns with Ta-Da philosophy of data ownership. Differentiator from cloud-only solutions.

**Independent Test**: See "Processing on device" indicator during transcription when offline mode enabled.

**Acceptance Scenarios**:

1. **Given** user has "on-device processing" enabled, **When** they record voice, **Then** Whisper WASM is used
2. **Given** cloud processing is used, **When** processing starts, **Then** clear indicator shows "Sending to cloud..."
3. **Given** transcription completes, **When** audio was sent to cloud, **Then** audio is deleted from server immediately

---

### Edge Cases

- What happens when microphone permission is denied? → Show friendly message with instructions to enable
- What happens when recording exceeds 5 minutes? → Auto-stop with "Recording limit reached" message
- What happens when transcription returns empty? → Prompt user to try again or type manually
- What happens when LLM fails to categorize? → Default to "journal/note" with manual selection available
- What happens when browser doesn't support Web Speech API? → Fall back to Whisper WASM or show "Voice not available" with graceful degradation
- What happens when LLM extracts 10+ tadas? → Show first 5 with "Show more" option to prevent overwhelm
- What happens when user dismisses all proposed tadas? → Offer to save as plain journal entry instead

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST capture audio using MediaRecorder API with WAV or WebM format
- **FR-002**: System MUST provide real-time visual feedback during recording (audio level indicator)
- **FR-003**: System MUST transcribe audio to text within 10 seconds for 60 seconds of audio
- **FR-004**: System MUST extract entry type (tada, journal, note) from transcription content
- **FR-005**: System MUST suggest category and subcategory based on transcription content
- **FR-006**: System MUST allow user to review and edit all extracted fields before saving
- **FR-007**: System MUST store original transcription in entry data for reference
- **FR-008**: System MUST support tiered transcription: Web Speech API → Whisper WASM → Cloud API
- **FR-009**: System MUST queue recordings when offline and process when connection restored
- **FR-010**: System MUST delete audio data after transcription is complete (no persistent storage)
- **FR-011**: System MUST extract MULTIPLE tadas from a single transcription when present
- **FR-012**: System MUST present extracted tadas as a checklist for quick accept/dismiss
- **FR-013**: System MUST detect journal subcategory (dream, reflection, gratitude, note) from content
- **FR-014**: System MUST allow inline editing of any proposed tada before batch save
- **FR-015**: System MUST create all accepted entries in a single transaction

### Key Entities

- **VoiceRecording**: Temporary audio blob with status (recording, pending, transcribed, failed)
- **TranscriptionResult**: Text output with confidence score and processing method used
- **ExtractedEntry**: Draft entry with LLM-suggested fields (type, category, mood, tags, name)
- **ExtractedTadaList**: Array of proposed tadas with title, category, significance, selected state
- **ProcessingQueue**: IndexedDB store for offline recordings awaiting processing

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete voice-to-entry in under 30 seconds (tap → save)
- **SC-002**: Transcription accuracy exceeds 90% for clear speech in quiet environment
- **SC-003**: LLM correctly categorizes entry type 80% of the time without user correction
- **SC-004**: Recording starts within 100ms of microphone tap
- **SC-005**: Offline queue successfully processes 99% of recordings when connection restored
- **SC-006**: 70% of voice entries saved without editing extracted fields (indicating good defaults)
- **SC-007**: Multi-tada extraction correctly identifies 85% of accomplishments mentioned
- **SC-008**: Journal subcategory detection (dream vs reflection vs note) is correct 80% of time

---

## Assumptions

- Users have devices with microphone access (standard for modern smartphones/laptops)
- Primary language is English (v1.0); multi-language support can be added later via Whisper
- Users accept ~40MB model download for offline Whisper (can be WiFi-only option)
- Web Speech API availability varies by browser; fallbacks are essential
- LLM structuring quality acceptable from small models (phi-2, TinyLlama) for cost/privacy reasons

---

## Out of Scope (v0.3.0)

- Voice commands ("Start a meditation timer")
- Continuous voice journaling (long-form dictation beyond 5 minutes)
- Voice playback of entries
- Speech synthesis for reading entries back
- Multi-speaker detection
- Real-time translation
