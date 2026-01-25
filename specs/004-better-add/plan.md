# Implementation Plan: Unified Entry System ("Better Add")

**Branch**: `004-better-add` | **Date**: 2026-01-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-better-add/spec.md`

## Summary

Create a unified entry engine that consolidates all entry creation paths (timer, quick add, voice, CSV import) into a single, modular system. The engine will:

1. **P0**: Audit existing code → build unified `EntryEngine` service → migrate all paths
2. **P1**: Add quick past-timer entry, count/reps entry, and voice quick entry features
3. **P2**: Add moment capture and rhythm count aggregation
4. **P3**: Add attachment placeholder UI

The approach builds on the existing `useEntrySave` composable, refactoring it into a more modular architecture with clear separation between input parsing, validation, conflict detection, and persistence.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3.4+, Nuxt 3.x  
**Primary Dependencies**: Nuxt 3, Vue 3, Drizzle ORM, SQLite, Zod (validation)  
**Storage**: SQLite via Drizzle ORM (`app/server/db/schema.ts`)  
**Testing**: Vitest (unit), @nuxt/test-utils (integration)  
**Target Platform**: PWA (web), Docker deployment, Node 20 runtime  
**Project Type**: Web application (Nuxt full-stack)  
**Performance Goals**: Entry creation < 200ms, voice parsing < 500ms  
**Constraints**: Offline-capable (PWA), mobile-first responsive  
**Scale/Scope**: Single-user self-hosted, ~7 user stories, ~25 functional requirements

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                | Status  | Notes                                                                |
| ------------------------ | ------- | -------------------------------------------------------------------- |
| **Data Ownership**       | ✅ Pass | All entries stored locally in SQLite; no external dependencies       |
| **Unified Entry Model**  | ✅ Pass | Extends existing Entry schema; single source of truth                |
| **Simplicity First**     | ✅ Pass | One engine, modular design; avoids 10 separate input systems         |
| **No Bun in Production** | ✅ Pass | Server code uses Node 20 APIs only                                   |
| **TypeScript Strict**    | ✅ Pass | No `any` types; Zod for runtime validation                           |
| **Test Coverage**        | ⚠️ Gate | Must add unit tests for EntryEngine; integration tests for migration |

## Project Structure

### Documentation (this feature)

```text
specs/004-better-add/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0: Code audit findings
├── data-model.md        # Phase 1: EntryInput schema, draft entries
├── contracts/           # Phase 1: API contracts for new endpoints
│   └── entry-engine.ts  # TypeScript interface definitions
├── quickstart.md        # Phase 1: Developer onboarding guide
└── tasks.md             # Phase 2: Implementation tasks (via /speckit.tasks)
```

### Source Code (existing structure)

```text
app/
├── composables/
│   ├── useEntrySave.ts      # MIGRATE: Current entry creation logic
│   ├── useCSVImport.ts      # MIGRATE: CSV import entry creation
│   └── useLLMStructure.ts   # EXTEND: Voice parsing for counts/times
├── server/
│   ├── api/entries/         # EXTEND: Entry API endpoints
│   │   └── index.post.ts    # Current entry creation endpoint
│   ├── db/schema.ts         # EXTEND: Draft entries, reps data field
│   └── services/            # NEW: EntryEngine service
│       ├── entryEngine.ts   # Core unified entry engine
│       ├── conflictDetector.ts  # Modular overlap detection
│       └── entryParser.ts   # Natural language parsing
├── components/
│   ├── QuickEntryModal.vue  # NEW: Unified quick entry UI
│   ├── RhythmBarChart.vue   # EXTEND: Support count aggregation
│   └── AttachmentPlaceholder.vue  # NEW: Coming soon UI
├── pages/
│   ├── add.vue              # MIGRATE: Use new entry engine
│   ├── timer.vue            # MIGRATE: Use new entry engine
│   └── voice.vue            # MIGRATE: Use new entry engine
└── utils/
    └── naturalLanguageParser.ts  # NEW: Parse durations, times, counts
```

**Structure Decision**: Nuxt 3 full-stack web app. New services go in `server/services/`. Composables provide Vue reactivity wrapper around services.

## Complexity Tracking

> No constitution violations. Design follows existing patterns.

| Aspect            | Decision               | Rationale                                                        |
| ----------------- | ---------------------- | ---------------------------------------------------------------- |
| Service layer     | New `server/services/` | Separates business logic from API handlers; enables unit testing |
| EntryInput type   | Single interface       | All input methods produce same structure; simplifies validation  |
| Conflict detector | Modular function       | Reusable for imports; configurable resolution strategies         |

---

## Phase 0: Research & Audit

### Code Audit: Entry Creation Paths

**Objective**: Document all existing entry creation paths before building unified engine (FR-001).

#### Identified Entry Paths

| Path                   | File                          | Method                                  | Notes                                  |
| ---------------------- | ----------------------------- | --------------------------------------- | -------------------------------------- |
| Timer save             | `pages/timer.vue`             | `createEntry()` via `useEntrySave`      | Post-session save with mood/reflection |
| Quick add (journal)    | `pages/add.vue`               | `createEntry()` via `useEntrySave`      | Dream, note, gratitude entries         |
| Tada capture           | `pages/tada/index.vue`        | `createEntry()` via `useEntrySave`      | Accomplishment entries                 |
| Voice entry            | `pages/voice.vue`             | `createVoiceEntry()` via `useEntrySave` | Transcription + LLM extraction         |
| Batch tadas            | `pages/voice.vue`             | `createBatchTadas()` via `useEntrySave` | Multi-tada from voice                  |
| Entry edit (duplicate) | `pages/entry/[id].vue`        | `createEntry()` via `useEntrySave`      | "Save as new" functionality            |
| CSV import             | `composables/useCSVImport.ts` | Direct `$fetch('/api/import/entries')`  | Bulk import with deduplication         |

#### Current Architecture Analysis

**Strengths (keep):**

- `useEntrySave` already centralizes most entry creation
- Consistent emoji resolution
- Toast notifications and error handling
- Loading states

**Gaps (address):**

- CSV import bypasses `useEntrySave` entirely
- No support for `reps` entry type
- No conflict/overlap detection
- No draft entry persistence
- No natural language parsing for quick entry

#### Migration Strategy

1. Extract core logic from `useEntrySave` into `server/services/entryEngine.ts`
2. Create `EntryInput` interface as canonical input format
3. Add conflict detector as separate module
4. Refactor `useEntrySave` to use new engine
5. Update CSV import to use same engine
6. Add reps support throughout

### Technology Decisions

| Decision           | Choice              | Rationale                                                                  |
| ------------------ | ------------------- | -------------------------------------------------------------------------- |
| Validation         | Zod schemas         | Already used in project; runtime type safety                               |
| NLP parsing        | Custom + LLM        | Simple patterns (duration, time) custom; complex (intent) via existing LLM |
| Draft storage      | LocalStorage + DB   | LocalStorage for immediate persistence; DB for cross-device sync           |
| Conflict detection | Time-window overlap | Check if new entry's timestamp falls within existing entry's duration      |

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](data-model.md) for full schema definitions.

#### Core Types

```typescript
// Canonical input format for all entry creation
interface EntryInput {
  type: "timed" | "reps" | "journal" | "tada";
  name: string;
  category?: string;
  subcategory?: string;
  timestamp?: string; // ISO 8601, defaults to now

  // Type-specific
  durationSeconds?: number; // For timed
  count?: number; // For reps
  content?: string; // For journal/tada

  // Metadata
  tags?: string[];
  notes?: string;
  source?: "manual" | "voice" | "import";
}

// Conflict detection result
interface ConflictResult {
  hasConflict: boolean;
  overlappingEntries: Entry[];
  suggestedResolution: "allow" | "warn" | "block";
}

// Draft entry for voice/partial saves
interface DraftEntry {
  id: string;
  input: Partial<EntryInput>;
  parsedFrom?: string; // Original voice text
  confidence?: number;
  createdAt: string;
  expiresAt: string; // Auto-cleanup after 24h
}
```

#### Schema Changes

```sql
-- Add count field to entries.data for reps type
-- No schema migration needed - data is JSON

-- New table for draft entries
CREATE TABLE entry_drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  input TEXT NOT NULL,      -- JSON: Partial<EntryInput>
  parsed_from TEXT,         -- Original voice text
  confidence REAL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

### API Contracts

See [contracts/](contracts/) for OpenAPI specs.

#### New Endpoints

| Method | Path                             | Purpose                                  |
| ------ | -------------------------------- | ---------------------------------------- |
| POST   | `/api/entries`                   | Create entry (existing, enhanced)        |
| POST   | `/api/entries/validate`          | Validate without saving, check conflicts |
| GET    | `/api/entries/drafts`            | List user's draft entries                |
| POST   | `/api/entries/drafts`            | Save draft entry                         |
| DELETE | `/api/entries/drafts/:id`        | Discard draft                            |
| POST   | `/api/entries/drafts/:id/commit` | Convert draft to entry                   |
| GET    | `/api/entries/suggestions`       | Activity name autocomplete               |
| POST   | `/api/entries/parse`             | Parse natural language to EntryInput     |
| GET    | `/api/durations/recent`          | User's recently used durations           |
| GET    | `/api/counts/recent`             | User's recently used rep counts          |

#### Enhanced Existing Endpoints

| Endpoint                     | Enhancement                                |
| ---------------------------- | ------------------------------------------ |
| `POST /api/entries`          | Accept `count` in data for reps type       |
| `GET /api/rhythms/:id/stats` | Return `totalCount` for reps-based rhythms |

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Input Sources                         │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ Timer Save  │ Quick Add   │ Voice Entry │ CSV Import       │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       ▼             ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                   useEntryEngine (composable)               │
│  - parseInput()      - Normalize all sources to EntryInput  │
│  - validate()        - Zod schema + business rules          │
│  - checkConflicts()  - Modular overlap detection            │
│  - saveDraft()       - Persist incomplete entries           │
│  - createEntry()     - Final save to database               │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                   EntryEngine (server service)              │
│  - Validation logic                                          │
│  - Conflict detection                                        │
│  - Database operations                                       │
└─────────────────────────────────────────────────────────────┘
```

### UI Components

| Component                   | Purpose                                                            | Priority |
| --------------------------- | ------------------------------------------------------------------ | -------- |
| `QuickValuePicker.vue`      | Shared base: quick picks + recent + stepper (see research.md)      | P1       |
| `QuickEntryModal.vue`       | Unified modal for past timer + count + moment                      | P1       |
| `EntryTypeToggle.vue`       | Switch between timed/count/moment modes                            | P1       |
| `DurationPicker.vue`        | Smart text input + quick picks + mini-stepper (see research.md)    | P1       |
| `CountPicker.vue`           | Numeric input + quick picks + mini-stepper (uses QuickValuePicker) | P1       |
| `DateTimePicker.vue`        | Combined date + time selector                                      | P1       |
| `ActivityAutocomplete.vue`  | Suggest previously used activity names                             | P1       |
| `ConflictWarning.vue`       | Show overlap warning with resolution options                       | P1       |
| `DraftIndicator.vue`        | Show "1 unsaved entry" badge                                       | P1       |
| `AttachmentPlaceholder.vue` | "Attach photo (coming soon)"                                       | P3       |

#### DurationPicker Design (from research.md)

The new `DurationPicker.vue` replaces the current `DurationInput.vue` with a more flexible design:

```
┌─────────────────────────────────────────┐
│ Duration                                │
├─────────────────────────────────────────┤
│ ┌──────────────────────────┐            │
│ │ 20 min                   │ ← Smart text input
│ └──────────────────────────┘            │
│                                         │
│ Quick: [5] [10] [15] [20] [30] [45] [60]│
│ Recent: [22m] [35m] [18m]               │
│ [-5] [-1] [      20      ] [+1] [+5]    │ ← Mini-stepper
└─────────────────────────────────────────┘
```

**Key Features**:

- **Smart text input**: Parses "20", "20m", "1h 30m", "90 minutes"
- **Quick picks**: Context-aware defaults (meditation vs exercise)
- **Recent durations**: User's actual history surfaced
- **Mini-stepper**: ±1m/±5m fine adjustment buttons

#### CountPicker Design (from research.md)

The `CountPicker.vue` uses the same pattern as DurationPicker for a harmonious UX:

```
┌─────────────────────────────────────────┐
│ Reps                                    │
├─────────────────────────────────────────┤
│ ┌──────────────────────────┐            │
│ │ 30                       │ ← Numeric input
│ └──────────────────────────┘            │
│                                         │
│ Quick: [10] [15] [20] [25] [30] [40] [50]│ ← Context presets
│ Recent: [44] [22] [35]                  │
│ [-5] [-1] [      30      ] [+1] [+5]    │ ← Mini-stepper
└─────────────────────────────────────────┘
```

**Key Features**:

- **Numeric input**: Direct typing for fast entry
- **Context presets**: Bodyweight (10-50), weighted (5-20), cardio (10-100)
- **Recent counts**: User's actual history surfaced
- **Mini-stepper**: ±1/±5 fine adjustment buttons
- **Shared base**: Uses `QuickValuePicker.vue` with DurationPicker

#### Shared Component: QuickValuePicker.vue

Both pickers extend a shared base component:

| Component            | Base             | Specialization                    |
| -------------------- | ---------------- | --------------------------------- |
| `DurationPicker.vue` | QuickValuePicker | Duration parsing, context presets |
| `CountPicker.vue`    | QuickValuePicker | Simple numeric, exercise contexts |

---

## Implementation Phases

### Phase A: Foundation (P0 - Unified Engine)

**Goal**: Build the entry engine and migrate all existing paths

1. Create `EntryInput` Zod schema
2. Create `EntryEngine` service with validation
3. Create `ConflictDetector` module
4. Refactor `useEntrySave` → `useEntryEngine`
5. Migrate timer.vue to new engine
6. Migrate add.vue to new engine
7. Migrate tada/index.vue to new engine
8. Migrate voice.vue to new engine
9. Migrate CSV import to new engine
10. Add unit tests for engine
11. Integration tests for migration (no behavior change)

### Phase B: Quick Entry Features (P1)

**Goal**: Add new quick entry capabilities

1. Create `QuickEntryModal.vue` component
2. Add past-timer entry mode (duration + datetime)
3. Add count/reps entry mode
4. Implement activity name autocomplete
5. Add conflict detection UI
6. Enhance voice parsing for counts ("30 burpees")
7. Enhance voice parsing for past times ("this morning")
8. Add draft entry persistence
9. Add draft indicator UI

### Phase C: Enhancements (P2)

**Goal**: Moment capture and rhythm count support

1. Add moment capture mode to QuickEntryModal
2. Add category inference from keywords
3. Enhance rhythm bar charts for count aggregation
4. Add "total reps" to rhythm summary stats
5. Handle mixed entry types in rhythms

### Phase D: Polish (P3)

**Goal**: Attachment placeholder and refinements

1. Create AttachmentPlaceholder.vue
2. Add to all entry forms
3. Final QA and edge case handling

---

## Risk Assessment

| Risk                                  | Impact | Mitigation                                             |
| ------------------------------------- | ------ | ------------------------------------------------------ |
| Migration breaks existing entry paths | High   | Extensive integration tests; feature flag for rollback |
| Voice parsing accuracy for counts     | Medium | Confirmation step; manual correction easy              |
| Conflict detection false positives    | Low    | Default to "warn" not "block"; user can override       |
| Draft entries accumulate              | Low    | 24h expiry; manual discard option                      |

---

## Next Steps

1. Run `/speckit.tasks` to generate implementation task list
2. Create [data-model.md](data-model.md) with full Zod schemas
3. Create [contracts/entry-engine.ts](contracts/entry-engine.ts) with TypeScript interfaces
4. Create [quickstart.md](quickstart.md) for developer onboarding
