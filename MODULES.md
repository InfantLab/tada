# Creating Entry Type Modules

Ta-da uses an internal module registry for entry types. Each entry type is a self-contained module that registers itself with the central registry.

## Quick Start

To add a new entry type (e.g., "exercise"):

### 1. Create the module directory

```
app/modules/entry-types/exercise/
  index.ts              # Module definition (EntryTypeDefinition)
  ExerciseInput.vue     # Input form component
```

### 2. Define the module (`index.ts`)

```typescript
import { registerEntryType } from "~/registry/entryTypes";
import type { EntryTypeDefinition } from "~/types/entryType";

export const exerciseDefinition: EntryTypeDefinition = {
  type: "exercise",
  label: "Exercise",
  emoji: "🏋️",
  description: "Track workouts and physical activities",

  requiresDuration: true, // or requiresCount: true

  inputComponent: "ExerciseInput", // Must match the .vue filename

  quickAdd: {
    icon: "fire",
    color: "bg-orange-500",
    order: 5,
  },
};

// Self-register when imported
registerEntryType(exerciseDefinition);
```

### 3. Create the input component (`ExerciseInput.vue`)

The input component handles the full entry creation UI for your type. See `TallyInput.vue` for a reference implementation.

### 4. Register the module

Add an import in `app/plugins/modules.client.ts`:

```typescript
import "~/modules/entry-types/exercise";
```

### 5. Add the type string

Add your type to `app/shared/registeredTypes.ts`:

```typescript
export const REGISTERED_ENTRY_TYPES = [
  "timed", "tally", "moment", "tada",
  "exercise",  // <-- add here
] as const;
```

### 6. Verify

- Navigate to `/create/exercise` (once the generic page exists) or add a convenience route
- The type appears in the entry type registry
- Entries save and display correctly

## Architecture

```
app/
  types/
    entryType.ts          # EntryTypeDefinition interface
    importer.ts           # DataImporter interface
    exporter.ts           # DataExporter interface
  registry/
    entryTypes.ts         # Entry type registry (register/lookup)
    importers.ts          # Importer registry
    exporters.ts          # Exporter registry
  shared/
    registeredTypes.ts    # Type string list (shared client/server)
  modules/
    entry-types/
      tally/              # Reference implementation
        index.ts
        TallyInput.vue
  plugins/
    modules.client.ts     # Auto-imports all modules
```

## Key Interfaces

### EntryTypeDefinition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | Yes | Unique type identifier |
| `label` | `string` | Yes | Human-readable name |
| `emoji` | `string` | Yes | Default emoji |
| `description` | `string` | Yes | Short description |
| `inputComponent` | `string` | Yes | Vue component name for entry creation |
| `timelineComponent` | `string` | No | Custom timeline card component |
| `detailComponent` | `string` | No | Custom entry detail view |
| `requiresDuration` | `boolean` | No | Entry needs durationSeconds > 0 |
| `requiresCount` | `boolean` | No | Entry needs count > 0 |
| `quickAdd` | `object` | No | Quick-add menu config |
| `navigation` | `object` | No | Nav menu config |
