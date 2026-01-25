# Feature Specification: Unified Entry System ("Better Add")

**Feature Branch**: `004-better-add`  
**Created**: 2026-01-25  
**Status**: Draft  
**Input**: User description: "A modular, flexible entry engine for timer events, quick entries, counts, and voice input with a consistent architecture that adapts to context"

## Overview

Ta-da has multiple entry paths (timer, quick add, voice, CSV import) that evolved independently. This feature creates a **unified entry engine** — one system powering all data input while adapting its interface to context.

### Philosophy

- **One engine, many faces**: Same core logic handles all entry types, each context gets optimized UI
- **Foundation for modularity**: Well-designed entry system enables personal customization and new use cases
- **Voice-first ready**: Engine understands natural language for fast voice input
- **Attachments as first-class**: Photos, audio, files designed in from start (storage implementation later)

## Clarifications

### Session 2026-01-25

- Q: Should the unified entry engine be built first (P0) or after features (P2)? → A: Engine First — build as P0, all features use it from day one
- Q: How to identify all entry paths needing migration? → A: Audit first — first task is code audit documenting all entry creation paths
- Q: How to handle entries with both duration AND count? → A: Single type — each entry is timed OR count, never both; complex activities become two entries or use notes
- Q: What if a past timer entry overlaps with an existing entry? → A: Warn only — show warning but allow saving; implement as modular conflict detector reusable for imports (allow both, keep original, replace)
- Q: How to handle partially complete voice entries? → A: Auto-save draft — parsed entry saved as draft; user sees "unsaved entry" indicator to resume

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Unified Entry Engine (Priority: P0)

Every place in the app that creates entries uses the same underlying system. Timer completion, quick add, voice capture, and manual entry all flow through one engine. This is the foundation that all other features build upon.

**Why this priority**: The engine must exist before features can use it. Building features on old architecture then refactoring wastes effort.

**Independent Test**: All entry creation paths produce entries with consistent structure and behavior.

**Acceptance Scenarios**:

1. **Given** I complete a timer session, **When** saving, **Then** it uses the unified entry engine
2. **Given** I use quick add, **When** I save any entry type, **Then** the same validation and storage logic applies
3. **Given** I import via CSV, **When** entries are created, **Then** they're indistinguishable from manually created ones
4. **Given** the engine is deployed, **When** existing entry paths are migrated, **Then** no user-facing behavior changes (backwards compatible)

---

### User Story 2 - Quick Past Timer Entry (Priority: P1)

I just finished a 20-minute meditation but forgot to use the timer. I want to log it quickly — entering the duration, when it happened, and optionally the category — without navigating through multiple screens.

**Why this priority**: Most requested feature. Users frequently forget to start timers or practice away from their device.

**Independent Test**: User can add a past timed entry from a single form and see it appear correctly in their timeline and rhythm stats.

**Acceptance Scenarios**:

1. **Given** I'm on the quick entry screen, **When** I enter duration (20 min), date (today), time (9am), and tap save, **Then** a timed entry appears in my timeline at that time
2. **Given** I'm entering a past timer, **When** I select category "mindfulness" and subcategory "sitting", **Then** the entry is tagged correctly and counts toward my meditation rhythm
3. **Given** I enter a past session, **When** it's saved, **Then** it appears in bar charts and chain calculations as if I'd used the timer

---

### User Story 3 - Quick Count Entry (Priority: P1)

I just did 44 kettlebell swings. I want to record this instantly — just the count, exercise name, and it's done.

**Why this priority**: Enables fitness tracking without timer overhead. Opens Ta-da to "sporty types" who track reps, not minutes.

**Independent Test**: User can log a count-based activity in under 5 seconds and see it reflected in their stats.

**Acceptance Scenarios**:

1. **Given** I'm on quick entry, **When** I tap "count" mode, enter "44" and "kettlebell", **Then** a reps entry is saved with count=44
2. **Given** I have previous kettlebell entries, **When** I start typing "kett", **Then** it auto-suggests "kettlebell" with my usual category
3. **Given** I save a count entry, **When** I view my rhythms, **Then** I see total reps (not minutes) for that activity

---

### User Story 4 - Voice Quick Entry (Priority: P1)

I say "I just did 30 burpees" or "20 minute meditation this morning". The system understands and creates the right entry type without me specifying fields manually.

**Why this priority**: Voice is the fastest input method. If the engine understands natural language, every entry type becomes voice-accessible.

**Independent Test**: Speaking a natural phrase creates the correct entry type with extracted values.

**Acceptance Scenarios**:

1. **Given** I activate voice entry, **When** I say "I just did 30 burpees", **Then** a reps entry is created with count=30, name="burpees"
2. **Given** I say "20 minute meditation this morning at 7am", **Then** a timed entry is created with duration=20min, timestamp=today 7am, category=mindfulness
3. **Given** I say "gratitude: beautiful sunrise today", **Then** a journal entry is created with category=gratitude

---

### User Story 5 - Moment Capture (Priority: P2)

I notice something meaningful — a moment of zen, serendipity, or gratitude. I want to capture it with just a few words, instantly.

**Why this priority**: Lightweight entries encourage noticing life's small moments — core to Ta-da's philosophy.

**Independent Test**: User can capture a moment with a single text field and optional category in under 3 seconds.

**Acceptance Scenarios**:

1. **Given** I tap quick capture, **When** I type "unexpected kindness from stranger" and select "serendipity", **Then** a journal entry is saved immediately
2. **Given** I'm capturing a moment, **When** I don't select a category, **Then** it defaults to a sensible category based on keywords or "moment"
3. **Given** I have the app open, **When** I use a keyboard shortcut or gesture, **Then** moment capture opens instantly

---

### User Story 6 - Rhythms Handle Counts (Priority: P2)

My rhythm for "strength training" should show total reps, not minutes. When I view my press-ups this month, I see "1,247 reps" not "0 minutes".

**Why this priority**: Count-based activities need appropriate aggregation to be meaningful.

**Independent Test**: Rhythm bar charts display rep totals when the underlying entries are count-based.

**Acceptance Scenarios**:

1. **Given** I have reps entries for press-ups, **When** I view the rhythm bar chart, **Then** bars show rep counts, not duration
2. **Given** I'm viewing strength rhythm, **When** I see the summary, **Then** it shows "This month: 1,247 reps" and "All time: 15,892 reps"
3. **Given** I have mixed entry types in a category, **When** viewing rhythms, **Then** timed entries show duration, reps entries show counts (separate or combined sensibly)

---

### User Story 7 - Attachment Placeholder (Priority: P3)

When creating entries, I can see where attachments would go. The UI shows "attach photo" even if it's not yet functional — preparing for future capability.

**Why this priority**: Establishes attachments as first-class citizens in the data model without requiring storage architecture decisions now.

**Independent Test**: Entry forms show attachment UI placeholder; data model supports attachment references.

**Acceptance Scenarios**:

1. **Given** I'm creating any entry, **When** I view the form, **Then** I see an "attach" option (may show "coming soon")
2. **Given** the entry schema, **When** I inspect it, **Then** attachment relationship is defined and ready
3. **Given** I save an entry, **When** attachments are eventually implemented, **Then** existing entries can have attachments added

---

### Edge Cases

- What happens when voice input is ambiguous? (e.g., "30 push ups or push-ups" — normalize exercise names)
- ~~How does the system handle entries with both duration AND count?~~ **Resolved**: Single type per entry; complex activities become two entries or use notes field
- ~~What if a past timer entry overlaps with an existing entry's time?~~ **Resolved**: Warn but allow; modular conflict detector with options (allow both, keep original, replace)
- ~~How are partially complete voice entries handled?~~ **Resolved**: Auto-save as draft; user sees indicator to resume

## Requirements _(mandatory)_

### Functional Requirements

**Entry Engine Core**

- **FR-001**: Implementation MUST begin with a code audit documenting all existing entry creation paths before building the unified engine
- **FR-002**: System MUST provide a unified entry creation service used by all input methods (timer, quick add, voice, import)
- **FR-003**: System MUST support entry types: `timed`, `reps`, `journal`, `tada` (extensible to future types)
- **FR-004**: System MUST auto-detect entry type from natural language input when using voice
- **FR-005**: System MUST validate entries consistently regardless of input source
- **FR-005a**: System MUST provide a modular time-overlap conflict detector with configurable resolution strategies: allow both, keep original, replace with new
- **FR-005b**: For manual entry, conflict detector MUST warn user of overlaps but allow saving (default: allow both)
- **FR-005c**: For bulk imports, conflict detector MUST support all resolution strategies via configuration

**Quick Past Timer Entry**

- **FR-006**: Users MUST be able to create timed entries for past sessions with: duration, date, time, category (optional), subcategory (optional)
- **FR-007**: System MUST default date to today and time to "just now" for fast entry
- **FR-008**: Past timer entries MUST integrate with rhythm calculations identically to live timer sessions

**Count/Reps Entry**

- **FR-009**: Users MUST be able to create count-based entries with: count (number), activity name, category (optional)
- **FR-010**: System MUST remember previously used activity names for auto-suggestion
- **FR-011**: Count entries MUST store the numeric value in a way rhythms can aggregate

**Voice Intelligence**

- **FR-012**: Voice input MUST extract entry type, values, and metadata from natural phrases
- **FR-013**: System MUST handle common variations: "20 min", "20 minutes", "twenty minutes"
- **FR-014**: System MUST parse time references: "this morning", "at 7am", "yesterday evening"
- **FR-015**: System MUST present parsed interpretation for user confirmation before saving
- **FR-015a**: Unconfirmed parsed entries MUST be auto-saved as drafts with visual indicator for user to resume
- **FR-015b**: Draft entries MUST persist across page navigation and app restart

**Moment Capture**

- **FR-016**: Users MUST be able to create journal entries with minimal friction (single text field + optional category)
- **FR-017**: System SHOULD infer category from keywords when not specified (e.g., "grateful for..." → gratitude)

**Rhythm Integration**

- **FR-018**: Rhythms MUST display appropriate units based on entry type (minutes for timed, reps for counts)
- **FR-019**: Bar charts MUST aggregate reps as totals, not duration
- **FR-020**: Summary statistics MUST show "X reps this month/year/all-time" for count-based rhythms

**Attachments (Foundation)**

- **FR-021**: Entry data model MUST support attachment references (existing schema ready)
- **FR-022**: Entry forms MUST show attachment placeholder UI (functional implementation deferred)

### Key Entities

- **Entry**: The unified data model (already exists) — extended with better support for `reps` type and count aggregation
- **EntryInput**: A normalized input structure that all input methods produce before validation/storage
- **ParsedVoiceEntry**: Intermediate representation from voice/NLP parsing, awaiting user confirmation
- **Attachment**: File reference linked to an entry (schema exists, storage deferred)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can log a past timed session in under 10 seconds (duration + save)
- **SC-002**: Users can log a count-based activity in under 5 seconds
- **SC-003**: Voice commands correctly parse entry type and values 90%+ of the time for common phrases
- **SC-004**: All entry creation paths (timer, quick add, voice, import) produce consistent entry structures
- **SC-005**: Rhythm charts display appropriate units (minutes vs reps) based on entry type
- **SC-006**: Moment capture (quick journal entry) completes in under 3 seconds
- **SC-007**: 100% of entry forms show attachment placeholder UI (ready for future implementation)

## Assumptions

- Users are familiar with Ta-da's existing entry types and categories from v0.2.0
- Voice capture infrastructure from v0.3.0 (003-voice-input-llm) is available and integrated
- The existing `reps` entry type in the ontology is implemented (may need schema/UI work)
- LLM parsing for voice entries can leverage existing voice-to-structure work
- Attachment storage architecture decisions are explicitly deferred — only the data model and UI placeholder are in scope

## Out of Scope

- Photo/video capture and storage (deferred to separate feature focused on storage architecture)
- GPS tracking for activities (future feature)
- Multi-entry batch creation (e.g., "I did 3 sets of 10 reps")
- Offline voice processing (relies on existing voice infrastructure)
- Entry templates/presets beyond auto-suggestion
