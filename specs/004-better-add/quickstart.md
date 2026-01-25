# Quickstart: Unified Entry System

**Feature**: 004-better-add  
**Date**: 2026-01-25

## Overview

This guide explains how to use the new unified entry system to create entries in Ta-da.

## Quick Reference

### Creating Entries

```typescript
// In a Vue component or composable
const { createEntry, createTimedEntry, createRepsEntry } = useEntryEngine();

// Create a timed entry (meditation, practice, etc.)
await createTimedEntry({
  name: "meditation",
  category: "mindfulness",
  subcategory: "sitting",
  durationSeconds: 1200, // 20 minutes
  timestamp: "2026-01-25T09:00:00Z",
});

// Create a reps entry (exercise, counts)
await createRepsEntry({
  name: "kettlebell swings",
  category: "movement",
  subcategory: "strength",
  count: 44,
});

// Create a journal entry
await createJournalEntry({
  name: "dream",
  category: "journal",
  subcategory: "dream",
  content: "I was flying over mountains...",
  mood: 4,
});

// Create a tada entry
await createTadaEntry({
  name: "Fixed the bug",
  category: "accomplishment",
  subcategory: "work",
  significance: "normal",
});
```

### Handling Conflicts

```typescript
const { checkConflicts, createEntry } = useEntryEngine();

// Check for overlaps before saving
const input: EntryInput = {
  type: "timed",
  name: "meditation",
  timestamp: "2026-01-25T09:00:00Z",
  durationSeconds: 1200,
};

const conflicts = await checkConflicts(input);

if (conflicts.hasConflict) {
  // Show warning to user
  console.log("Overlapping entries:", conflicts.overlappingEntries);

  // User chooses to save anyway
  await createEntry(input, { resolution: "allow-both" });
}
```

### Draft Entries

```typescript
const { saveDraft, drafts, commitDraft, discardDraft } = useEntryEngine();

// Save incomplete entry as draft
const draft = await saveDraft(
  { type: "timed", name: "meditation" },
  { parsedFrom: "meditation this morning", confidence: 0.8 },
);

// Later, show drafts indicator
if (drafts.value.length > 0) {
  console.log(`${drafts.value.length} unsaved entries`);
}

// User completes and saves
await commitDraft(draft.id, {
  type: "timed",
  name: "meditation",
  durationSeconds: 1200,
  timestamp: "2026-01-25T09:00:00Z",
});

// Or discard
await discardDraft(draft.id);
```

### Natural Language Parsing

```typescript
const { parseText } = useEntryEngine();

// Parse user input
const result = await parseText("30 burpees this morning");

console.log(result);
// {
//   input: { type: 'reps', name: 'burpees', count: 30, timestamp: '2026-01-25T07:00:00Z' },
//   confidence: 0.9,
//   extracted: { type: true, name: true, count: true, timestamp: true, ... },
//   originalText: '30 burpees this morning',
//   method: 'pattern'
// }

// Save if confident enough
if (result.confidence > 0.8) {
  await createEntry(result.input as EntryInput);
} else {
  // Save as draft for user review
  await saveDraft(result.input, {
    parsedFrom: result.originalText,
    confidence: result.confidence,
  });
}
```

### Activity Autocomplete

```typescript
const { getSuggestions } = useEntryEngine();

// Get suggestions as user types
const suggestions = await getSuggestions("kett", "reps");

// Returns:
// [
//   { name: 'kettlebell swings', category: 'movement', useCount: 15, ... },
//   { name: 'kettlebell clean', category: 'movement', useCount: 3, ... },
// ]
```

## Migration Guide

### From useEntrySave to useEntryEngine

**Before** (old):

```typescript
const { createEntry } = useEntrySave();

await createEntry({
  type: "timed",
  name: "meditation",
  category: "mindfulness",
  durationSeconds: 1200,
});
```

**After** (new):

```typescript
const { createEntry } = useEntryEngine();

await createEntry({
  type: "timed",
  name: "meditation",
  category: "mindfulness",
  durationSeconds: 1200,
});
```

The API is backward compatible - existing code works unchanged. New features (conflicts, drafts, parsing) are additive.

### New Entry Type: Reps

```typescript
// Reps entries store count in the data field
await createEntry({
  type: "reps",
  name: "push-ups",
  category: "movement",
  subcategory: "strength",
  count: 30, // NEW: count field for reps
});
```

## File Locations

| Purpose               | Location                                  |
| --------------------- | ----------------------------------------- |
| Entry engine service  | `app/server/services/entryEngine.ts`      |
| Conflict detector     | `app/server/services/conflictDetector.ts` |
| NLP parser            | `app/utils/naturalLanguageParser.ts`      |
| Duration parser       | `app/utils/durationParser.ts`             |
| Vue composable        | `app/composables/useEntryEngine.ts`       |
| Zod schemas           | `app/utils/entrySchemas.ts`               |
| Quick entry modal     | `app/components/QuickEntryModal.vue`      |
| Shared value picker   | `app/components/QuickValuePicker.vue`     |
| Duration picker       | `app/components/DurationPicker.vue`       |
| Count picker          | `app/components/CountPicker.vue`          |
| Activity autocomplete | `app/components/ActivityAutocomplete.vue` |

## DurationPicker Component

The new DurationPicker component replaces `DurationInput.vue` with a smarter, more flexible design.

### Basic Usage

```vue
<template>
  <DurationPicker v-model="durationSeconds" context="meditation" show-recent />
</template>

<script setup lang="ts">
const durationSeconds = ref<number | null>(null);
</script>
```

### With Context-Aware Presets

```vue
<!-- Meditation: 5, 10, 15, 20, 25, 30, 45, 60 min -->
<DurationPicker v-model="duration" context="meditation" />

<!-- Exercise: 15, 20, 30, 45, 60, 90 min -->
<DurationPicker v-model="duration" context="exercise" />

<!-- Work/Pomodoro: 25, 30, 45, 60, 90, 120 min -->
<DurationPicker v-model="duration" context="work" />
```

### Custom Presets

```vue
<!-- Override with custom values (in seconds) -->
<DurationPicker v-model="duration" :quick-picks="[60, 120, 180, 300]" />
```

### Smart Text Parsing

The DurationPicker accepts natural language input:

| Input                    | Parsed     |
| ------------------------ | ---------- |
| `20`                     | 20 minutes |
| `20m`, `20min`, `20 min` | 20 minutes |
| `1h`, `1hr`, `1 hour`    | 60 minutes |
| `1h 30m`, `1:30`, `90m`  | 90 minutes |
| `45s`, `45 sec`          | 45 seconds |
| `1:30:45`                | 1h 30m 45s |

### Using the Duration Parser Utility

```typescript
import { parseDuration, formatDuration } from "~/utils/durationParser";

// Parse string to seconds
const result = parseDuration("1h 30m");
console.log(result);
// { seconds: 5400, input: "1h 30m", display: "1h 30m", confidence: 1.0 }

// Format seconds to display string
formatDuration(5400); // "1h 30m"
formatDuration(1200); // "20m"
formatDuration(45); // "45s"
```

### Getting Recent Durations

```typescript
// API: GET /api/durations/recent
const recent = await $fetch<number[]>("/api/durations/recent");
// Returns: [1200, 1800, 2700, 900, 3600] (seconds)
```

## CountPicker Component

The CountPicker component provides a rich input experience for rep/count-based entries, harmonized with DurationPicker's design.

### Basic Usage

```vue
<template>
  <CountPicker v-model="count" context="bodyweight" show-recent unit="reps" />
</template>

<script setup lang="ts">
const count = ref<number | null>(null);
</script>
```

### With Context-Aware Presets

```vue
<!-- Bodyweight exercises: 10, 15, 20, 25, 30, 40, 50 -->
<CountPicker v-model="count" context="bodyweight" />

<!-- Weighted exercises: 5, 8, 10, 12, 15, 20 (lower reps) -->
<CountPicker v-model="count" context="weighted" />

<!-- Cardio exercises: 10, 20, 30, 50, 100 -->
<CountPicker v-model="count" context="cardio" />
```

### Custom Presets

```vue
<!-- Override with custom values -->
<CountPicker v-model="count" :quick-picks="[5, 10, 15, 25, 44]" />
```

### With Mini-Stepper

```vue
<!-- Enable ±1 and ±5 stepper controls -->
<CountPicker v-model="count" show-stepper />
```

### Getting Recent Counts

```typescript
// API: GET /api/counts/recent
const recent = await $fetch<number[]>("/api/counts/recent");
// Returns: [44, 30, 25, 20, 15] (user's recent counts)
```

### Example: Reps Entry Form

```vue
<template>
  <div class="reps-form">
    <ActivityAutocomplete v-model="activity" entry-type="reps" />
    <CountPicker
      v-model="count"
      :context="inferContext(activity)"
      show-recent
      show-stepper
      unit="reps"
    />
    <button @click="save">Save</button>
  </div>
</template>

<script setup lang="ts">
const activity = ref("");
const count = ref<number | null>(null);

// Infer context based on activity type
function inferContext(activity: string) {
  const weighted = ["deadlift", "squat", "bench", "press", "curl"];
  const cardio = ["jumping jacks", "mountain climbers", "burpees"];

  if (weighted.some((w) => activity.toLowerCase().includes(w)))
    return "weighted";
  if (cardio.some((c) => activity.toLowerCase().includes(c))) return "cardio";
  return "bodyweight";
}
</script>
```

## Testing

```bash
# Run entry engine tests
cd app
bun run test --run server/services/entryEngine.test.ts

# Run parser tests
bun run test --run utils/naturalLanguageParser.test.ts
```

## Common Patterns

### Timed Entry from Timer Page

```typescript
// After timer session completes
const sessionData = {
  durationSeconds: elapsed,
  startedAt: startTime.toISOString(),
  endedAt: new Date().toISOString(),
};

await createTimedEntry({
  name: "meditation",
  category: selectedCategory,
  subcategory: selectedSubcategory,
  ...sessionData,
  data: {
    reflection: userReflection,
    mood: selectedMood,
  },
});
```

### Quick Past Entry

```typescript
// User forgot to use timer, entering retroactively
await createTimedEntry({
  name: "yoga",
  category: "movement",
  subcategory: "yoga",
  durationSeconds: 45 * 60, // 45 minutes
  timestamp: yesterdayAt9AM.toISOString(),
  source: "manual",
});
```

### Voice Entry with Confirmation

```typescript
// 1. User speaks: "20 minute meditation this morning"
const parsed = await parseText(transcription);

// 2. Show confirmation UI with parsed values
// 3. User confirms or edits

// 4. Save with voice metadata
await createEntry({
  ...parsed.input,
  source: "voice",
  data: {
    ...parsed.input.data,
    transcription: transcription,
    confidence: parsed.confidence,
  },
});
```
