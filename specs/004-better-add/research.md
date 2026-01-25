# Research: Unified Entry System

**Feature**: 004-better-add  
**Date**: 2026-01-25  
**Status**: Complete

## Code Audit Summary

### Entry Creation Paths Identified

| #   | Path                | File                          | Method               | Status                   |
| --- | ------------------- | ----------------------------- | -------------------- | ------------------------ |
| 1   | Timer session save  | `pages/timer.vue:729`         | `createEntry()`      | Uses `useEntrySave` ✅   |
| 2   | Timer preset save   | `pages/timer.vue:766`         | `createEntry()`      | Uses `useEntrySave` ✅   |
| 3   | Quick add (journal) | `pages/add.vue:144`           | `createEntry()`      | Uses `useEntrySave` ✅   |
| 4   | Tada capture        | `pages/tada/index.vue:235`    | `createEntry()`      | Uses `useEntrySave` ✅   |
| 5   | Voice single entry  | `pages/voice.vue`             | `createVoiceEntry()` | Uses `useEntrySave` ✅   |
| 6   | Voice batch tadas   | `pages/voice.vue`             | `createBatchTadas()` | Uses `useEntrySave` ✅   |
| 7   | Entry duplicate     | `pages/entry/[id].vue:176`    | `createEntry()`      | Uses `useEntrySave` ✅   |
| 8   | CSV bulk import     | `composables/useCSVImport.ts` | Direct `$fetch`      | ❌ Bypasses useEntrySave |

### Current useEntrySave Analysis

**Location**: `app/composables/useEntrySave.ts` (491 lines)

**Capabilities**:

- `createEntry()` - Single entry creation
- `createVoiceEntry()` - Voice entry with transcription metadata
- `createBatchTadas()` - Multiple tadas from extraction
- `updateEntry()` - Entry modification
- `deleteEntry()` - Entry removal

**Features**:

- Emoji resolution from preferences/defaults
- Validation (type, name required)
- Toast notifications
- Loading states
- Error handling

**Gaps**:

- No `reps` type support
- No conflict detection
- No draft persistence
- No natural language parsing
- CSV import doesn't use it

### Entry Types in Use

| Type      | Used In         | Data Fields                               |
| --------- | --------------- | ----------------------------------------- |
| `timed`   | timer.vue       | `durationSeconds`, `startedAt`, `endedAt` |
| `tada`    | tada/index.vue  | `content`, `significance`                 |
| `journal` | add.vue         | `content`, `mood`, `themes`               |
| `reps`    | Not implemented | Planned: `count`, `exerciseName`          |

### Natural Language Patterns Needed

| Pattern        | Example                             | Extraction                                          |
| -------------- | ----------------------------------- | --------------------------------------------------- |
| Duration       | "20 min", "20 minutes", "1 hour 30" | `{ durationSeconds: 1200 }`                         |
| Count          | "30 burpees", "44 kettlebell"       | `{ type: 'reps', count: 30, name: 'burpees' }`      |
| Time reference | "this morning", "at 7am"            | `{ timestamp: '2026-01-25T07:00:00Z' }`             |
| Category hint  | "gratitude:", "meditation"          | `{ category: 'journal', subcategory: 'gratitude' }` |

### Conflict Detection Requirements

**Overlap Definition**: Entry A overlaps Entry B if:

- A.timestamp < B.timestamp + B.durationSeconds AND
- A.timestamp + A.durationSeconds > B.timestamp

**Resolution Strategies**:

1. `allow-both` - Save anyway (default for manual entry)
2. `keep-original` - Skip new entry
3. `replace` - Delete original, save new

### Draft Entry Requirements

**Persistence Needs**:

- Immediate: LocalStorage (survives refresh)
- Durable: Database (cross-device, survives clear)

**Lifecycle**:

1. Created when voice entry parsed but not confirmed
2. Shown via "1 unsaved entry" indicator
3. User can resume, edit, or discard
4. Auto-expire after 24 hours

## Decisions Made

| Decision           | Choice                           | Rationale                                        |
| ------------------ | -------------------------------- | ------------------------------------------------ |
| Engine location    | `server/services/entryEngine.ts` | Separates from Nuxt API layer; unit testable     |
| Composable name    | `useEntryEngine`                 | Clearer than refactoring `useEntrySave` in place |
| Validation library | Zod                              | Already in project; TypeScript inference         |
| Draft storage      | LocalStorage first               | Fast; DB sync is enhancement                     |
| Conflict detection | Warn-only default                | Respects user intent; non-blocking               |

---

## Duration Picker UX Research

**Date**: 2026-01-25  
**Status**: Complete  
**Context**: The current `DurationInput.vue` component is "too limited and too opinionated" for the Quick Past Timer Entry (P1) feature. Users need to enter durations quickly without the friction of the current design.

### Current Implementation Analysis

**Component**: `app/components/DurationInput.vue`

**Current Pattern**:

- Two numeric input fields (minutes + seconds)
- Fixed preset buttons: 5m, 10m, 15m, 20m, 30m, 45m, 1h
- Clear button

**Problems Identified**:

1. **Custom length is clunky**: Requires typing in two separate fields
2. **Presets too limited**: Only 7 options, none for short (1-4 min) or long (90+ min)
3. **No keyboard shortcuts**: Typing "20" doesn't auto-set 20 minutes
4. **Not context-aware**: Same presets for meditation (likely 5-45 min) vs exercise (likely 30-90 min)
5. **No recent/frequent durations**: User's actual patterns aren't reflected

### Research Sources

| Source                               | Key Insight                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Smashing Magazine (Date/Time Picker) | Mini-steppers for quick jumps; numerical input matters for wide ranges; presets/shortcuts better than scrolling     |
| Apple HIG (Pickers)                  | "Consider less granularity" (15-min intervals); countdown timer mode up to 23h 59m; keyboard input alongside picker |
| Material Design 3 (Time Pickers)     | Dial picker for visual selection; text input mode for precision; mobile-optimized touch targets                     |
| NN Group (Date Input)                | "Allow users to type even if other input methods available"; forgiving input parsing                                |

### Duration Input Patterns Evaluated

#### 1. Scroll Wheels (iOS Native / Insight Timer)

```
┌──────────────────────┐
│  ▲      ▲      ▲     │
│  0      1      5     │ ← Selected: 0h 15m
│  1      2      0     │
│  ▼      ▼      ▼     │
│ Hours  Mins  Secs    │
└──────────────────────┘
```

**Pros**: Visual, familiar from native pickers  
**Cons**: Tedious for precise values; small touch targets; doesn't work well on web (Insight Timer feedback)  
**Verdict**: ❌ Not recommended for web PWA

#### 2. Dial/Clock Face (Material Design)

```
     12
   /    \
  9  ●   3  ← Drag hand to select
   \    /
     6
```

**Pros**: Visual metaphor; good for time-of-day  
**Cons**: Awkward for duration (what does "15 minutes" look like on a clock?); requires modal  
**Verdict**: ❌ Wrong metaphor for duration

#### 3. Slider with Snapping (Envy.rent style)

```
[--●--------] 15 min
 5  15  30  60  90
```

**Pros**: Visual, quick for common ranges  
**Cons**: Imprecise for exact values; limited range; frustrating near snap points  
**Verdict**: ⚠️ Only for approximate input (not our case)

#### 4. Smart Text Input (Kremlin.ru style)

```
┌────────────────────────────┐
│ 20 min                     │ ← Natural language input
└────────────────────────────┘
Suggestions: [20 min] [20m] [0:20:00]
```

**Pros**: Fast for power users; handles many formats; minimal UI  
**Cons**: Requires robust parsing; discoverability  
**Verdict**: ✅ Recommended as primary input method

#### 5. Contextual Quick Picks + Input

```
┌─────────────────────────────────────┐
│ Duration: [        ] min            │
├─────────────────────────────────────┤
│ Recent:  [20m] [15m] [45m]          │ ← User's actual history
│ Common:  [5m] [10m] [15m] [30m] [1h]│ ← Context-aware defaults
└─────────────────────────────────────┘
```

**Pros**: One-tap for common values; typing for custom; learns from usage  
**Cons**: Needs more vertical space  
**Verdict**: ✅ Recommended as secondary/visual method

#### 6. Combined Approach (Recommended)

```
┌─────────────────────────────────────────┐
│ Duration                                │
├─────────────────────────────────────────┤
│ ┌──────────────────────────┐            │
│ │ 20 min                   │ ← Auto-parsed
│ └──────────────────────────┘            │
│                                         │
│ Quick: [5] [10] [15] [20] [30] [45] [60]│
│ Recent: [22m] [35m] [18m]               │ ← From history
│ +/- ◄ [      20      ] ► +/-           │ ← Mini-stepper
└─────────────────────────────────────────┘
```

### Recommended Design

#### Design Principles

1. **Typing is fastest**: Smart text input parses "20", "20m", "20 min", "1h 20m", "80 minutes"
2. **One-tap for 80%**: Most users repeat similar durations; surface their actual patterns
3. **Mini-stepper for tweaks**: ±1m and ±5m buttons for fine adjustment after initial selection
4. **Contextual presets**: Different defaults for meditation vs exercise vs work

#### Parsing Rules for Smart Input

| Input                                  | Parsed Duration                            |
| -------------------------------------- | ------------------------------------------ |
| `20`                                   | 20 minutes (assume minutes if bare number) |
| `20m`, `20min`, `20 min`, `20 minutes` | 20 minutes                                 |
| `1h`, `1hr`, `1 hour`                  | 60 minutes                                 |
| `1h 30m`, `1:30`, `90m`                | 90 minutes                                 |
| `45s`, `45 sec`, `45 seconds`          | 45 seconds                                 |
| `1h 30m 45s`, `1:30:45`                | 1 hour 30 min 45 sec                       |

#### Component Interface

```typescript
interface DurationPickerProps {
  modelValue: number | null; // seconds
  context?: "meditation" | "exercise" | "work" | "general";
  showRecent?: boolean; // Show user's recent durations
  quickPicks?: number[]; // Override default presets (in seconds)
  minDuration?: number; // Minimum allowed (seconds)
  maxDuration?: number; // Maximum allowed (seconds)
}
```

#### Quick Pick Defaults by Context

| Context      | Quick Picks (minutes)                       |
| ------------ | ------------------------------------------- |
| `meditation` | 5, 10, 15, 20, 25, 30, 45, 60               |
| `exercise`   | 15, 20, 30, 45, 60, 90                      |
| `work`       | 25, 30, 45, 60, 90, 120 (Pomodoro-friendly) |
| `general`    | 5, 10, 15, 20, 30, 45, 60                   |

### Implementation Plan

1. **Phase 1**: Create `DurationPicker.vue` with smart text input + quick picks
2. **Phase 2**: Add recent durations from user history (API: `GET /api/durations/recent`)
3. **Phase 3**: Add mini-stepper for ±1m/±5m adjustments
4. **Phase 4**: Context-aware presets based on category selection

### Decision

| Decision         | Choice             | Rationale                                             |
| ---------------- | ------------------ | ----------------------------------------------------- |
| Primary input    | Smart text field   | Fastest for power users; handles variety of formats   |
| Secondary input  | Quick pick buttons | One-tap for 80% case; visually scannable              |
| Tertiary input   | Mini-stepper       | Fine adjustment without retyping                      |
| Scroll wheels    | Not used           | Poor web experience; clunky for precise values        |
| Dial picker      | Not used           | Wrong metaphor for duration                           |
| Recent durations | Included           | Personalization; surfaces actual usage patterns       |
| Context presets  | Included           | Different activities have different typical durations |

---

## CountPicker UX Research

**Problem**: How should users input rep/count values that is harmonious with DurationPicker?

**Principle**: One engine, many faces. Share the same interaction pattern for consistency.

### Design: Shared Pattern with DurationPicker

The CountPicker uses the same UX pattern as DurationPicker to create a consistent experience:

```
┌─────────────────────────────────────────┐
│ Reps                                    │
├─────────────────────────────────────────┤
│ ┌──────────────────────────┐            │
│ │ 30                       │ ← Numeric input
│ └──────────────────────────┘            │
│                                         │
│ Quick: [10] [15] [20] [25] [30] [40] [50]│ ← Context presets
│ Recent: [44] [22] [35]                  │ ← From history
│ -5 ◄ [      30      ] ► +5              │ ← Mini-stepper
└─────────────────────────────────────────┘
```

### Shared Base Component: QuickValuePicker.vue

Both DurationPicker and CountPicker share a common base component:

```typescript
// QuickValuePicker.vue - shared base for both pickers
interface QuickValuePickerProps {
  modelValue: number | null;
  quickPicks: number[];
  recentValues?: number[];
  formatValue: (n: number) => string; // "30" or "20m"
  parseValue: (s: string) => number; // Parse input
  stepSmall: number; // ±1 or ±1m
  stepLarge: number; // ±5 or ±5m
  min?: number;
  max?: number;
  placeholder?: string;
}
```

### Context-Aware Presets by Exercise Type

| Context      | Quick Picks                | Rationale                           |
| ------------ | -------------------------- | ----------------------------------- |
| `bodyweight` | 10, 15, 20, 25, 30, 40, 50 | Push-ups, burpees, squats           |
| `weighted`   | 5, 8, 10, 12, 15, 20       | Deadlifts, bench press (lower reps) |
| `cardio`     | 10, 20, 30, 50, 100        | Jumping jacks, mountain climbers    |
| `general`    | 5, 10, 15, 20, 25, 30      | Default fallback                    |

### Component Interface

```typescript
export type CountContext = "bodyweight" | "weighted" | "cardio" | "general";

/**
 * Quick pick preset for counts
 */
export interface CountPreset {
  /** Count value */
  value: number;

  /** Display label */
  label: string;
}

/**
 * Context-aware preset configurations for counts
 */
export const COUNT_PRESETS: Record<CountContext, CountPreset[]> = {
  bodyweight: [
    { value: 10, label: "10" },
    { value: 15, label: "15" },
    { value: 20, label: "20" },
    { value: 25, label: "25" },
    { value: 30, label: "30" },
    { value: 40, label: "40" },
    { value: 50, label: "50" },
  ],
  weighted: [
    { value: 5, label: "5" },
    { value: 8, label: "8" },
    { value: 10, label: "10" },
    { value: 12, label: "12" },
    { value: 15, label: "15" },
    { value: 20, label: "20" },
  ],
  cardio: [
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 30, label: "30" },
    { value: 50, label: "50" },
    { value: 100, label: "100" },
  ],
  general: [
    { value: 5, label: "5" },
    { value: 10, label: "10" },
    { value: 15, label: "15" },
    { value: 20, label: "20" },
    { value: 25, label: "25" },
    { value: 30, label: "30" },
  ],
};

/**
 * CountPicker component props
 */
export interface CountPickerProps {
  /** Current value */
  modelValue: number | null;

  /** Context for preset selection */
  context?: CountContext;

  /** Show user's recent counts */
  showRecent?: boolean;

  /** Override default presets */
  quickPicks?: number[];

  /** Minimum allowed count */
  min?: number;

  /** Maximum allowed count */
  max?: number;

  /** Enable mini-stepper controls */
  showStepper?: boolean;

  /** Unit label ("reps", "sets", etc.) */
  unit?: string;
}
```

### Implementation Plan

1. **Phase 1**: Create `QuickValuePicker.vue` as shared base component
2. **Phase 2**: Refactor `DurationPicker.vue` to use `QuickValuePicker`
3. **Phase 3**: Create `CountPicker.vue` using `QuickValuePicker`
4. **Phase 4**: Add recent counts API: `GET /api/counts/recent`
5. **Phase 5**: Wire CountPicker into reps mode in QuickEntryModal

### Decision

| Decision         | Choice              | Rationale                                    |
| ---------------- | ------------------- | -------------------------------------------- |
| Primary input    | Numeric input field | Fastest for direct entry                     |
| Secondary input  | Quick pick buttons  | One-tap for 80% case; context-aware presets  |
| Tertiary input   | Mini-stepper        | ±1 and ±5 for fine adjustment                |
| Shared component | QuickValuePicker    | DRY principle; consistent UX patterns        |
| Recent counts    | Included            | Personalization; surfaces actual usage       |
| Context presets  | Included            | Different exercise types have typical ranges |
