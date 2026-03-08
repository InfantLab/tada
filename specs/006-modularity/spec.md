# Feature Specification: Modular Architecture

**Feature Branch**: `006-modularity`
**Created**: 2026-02-15
**Updated**: 2026-03-06
**Status**: Active
**Phase**: Implementation Planning
**Design**: [modularity.md](../../design/modularity.md) | [SDR Section 5](../../design/SDR.md#5-plugin-architecture)

## Overview

Transform Ta-da's architecture from page-based organization to module-based organization using an **internal module registry** (Option B from the design doc). Each entry type becomes a self-contained module. Importers and exporters become pluggable. New features can be added without touching core code.

This is NOT a full plugin system. There's no external plugin loading, no sandboxing, no lifecycle management. Modules are TypeScript files within the codebase that register themselves with central registries. This is the right level of complexity for a single-developer project.

## User Scenarios

### Scenario 1: Developer Adds a New Entry Type (Priority: P1)

A developer wants to add an "exercise" entry type. They create a single module directory with a manifest, input component, and timeline display component. They don't need to modify any core files.

**Acceptance Criteria:**
1. **Given** a new module directory `app/modules/entry-types/exercise/`, **When** it exports a valid `EntryTypeDefinition`, **Then** the type appears in the QuickAddMenu, settings, and timeline automatically
2. **Given** the exercise module defines an `inputComponent`, **When** a user navigates to `/create/exercise`, **Then** the module's input component renders
3. **Given** the exercise module defines a `timelineComponent`, **When** exercise entries appear in the timeline, **Then** the module's display component renders
4. **Given** the exercise module is removed from the directory, **When** the app starts, **Then** existing exercise entries render with a generic fallback (no errors)

### Scenario 2: Core Types Work Through Registry (Priority: P1)

The four existing entry types (timed, tada, moment, tally) are migrated to use the same registry as new types. They serve as reference implementations.

**Acceptance Criteria:**
1. **Given** the app starts, **When** the entry type registry initializes, **Then** all four core types are registered with their components
2. **Given** a user creates a tada entry, **When** the entry saves, **Then** the flow is identical to today (no user-visible changes)
3. **Given** the `EntryTypeSchema` uses the registry, **When** validating entry types server-side, **Then** it accepts all registered types and rejects unknown ones

### Scenario 3: Pluggable Import (Priority: P2)

The CSV import wizard delegates parsing to registered importer modules. The Insight Timer recipe becomes a standalone importer module.

**Acceptance Criteria:**
1. **Given** a user opens the import wizard, **When** they select a file, **Then** the wizard shows matching importers based on file type
2. **Given** the Insight Timer importer is registered, **When** a user uploads an Insight Timer CSV, **Then** the importer's `parse()` handles the format-specific logic
3. **Given** a new importer module exists, **When** it exports a valid `DataImporter`, **Then** it appears in the import wizard without any core changes

### Scenario 4: Pluggable Export (Priority: P2)

Export formats (JSON, CSV, Markdown, Obsidian) are registered as exporter modules.

**Acceptance Criteria:**
1. **Given** a user opens the export dialog, **When** they see format options, **Then** all registered exporters appear
2. **Given** the Obsidian exporter module is registered, **When** a user exports to Obsidian, **Then** the exporter's `export()` produces the correct format
3. **Given** a new exporter module exists, **When** it exports a valid `DataExporter`, **Then** it appears in the export dialog without any core changes

## Current State Analysis

### What exists today

- **Entry types** are defined as a hardcoded Zod enum in `app/utils/entrySchemas.ts`
- **Pages** are entry-type-specific: `/tada/`, `/moments.vue`, `/sessions.vue`, `/tally.vue`
- **Timeline** renders all types through `getEntryDisplayProps()` in `categoryDefaults.ts` — already type-agnostic
- **Import** is handled by `server/services/import.ts` with format-specific parsing inline
- **Export** is handled by `server/services/export.ts` with `toJSON()`, `toCSV()`, `toMarkdown()` inline
- **Components** are mostly generic (DurationPicker, CountPicker) but wired up in type-specific pages
- **Composables** use a unified `useEntryEngine.ts` with type-specific shortcut methods

### What's already modular (~70%)

- `useEntryEngine` is a single composable handling all entry types
- Timeline rendering is type-agnostic through display property resolution
- All types use the same API: `/api/entries?type=<type>`
- The QuickEntryModal already switches modes dynamically
- Page structure is already consistent: form at top, recent entries below

### What needs to change

1. **Entry type enum** — hardcoded → registry-driven
2. **Pages** — type-specific pages → generic `/create/[type]` + module-provided components
3. **Import service** — inline parsing → delegated to importer modules
4. **Export service** — inline formatting → delegated to exporter modules
5. **Navigation** — hardcoded menu items → registry-driven (optional, can defer)
6. **Server validation** — hardcoded type list → shared type list or relaxed validation

## Interfaces

### EntryTypeDefinition

```typescript
// types/entryType.ts
interface EntryTypeDefinition {
  type: string;                          // e.g., "timed", "tada", "exercise"
  label: string;                         // Human-readable name
  emoji: string;                         // Default emoji for display
  description: string;                   // Short description for settings/menus

  // Data validation
  dataSchema?: ZodSchema;               // Validates the `data` JSON field
  requiresDuration?: boolean;            // Must have durationSeconds > 0
  requiresCount?: boolean;              // Must have count > 0

  // Component references (resolved by Nuxt auto-imports)
  inputComponent: string;               // Component name for entry creation form
  timelineComponent?: string;           // Optional: custom timeline card (falls back to generic)
  detailComponent?: string;             // Optional: custom entry detail view

  // Quick add menu entry (optional — not all types need one)
  quickAdd?: {
    icon: string;
    color: string;                      // Tailwind class, e.g. "bg-amber-500"
    order: number;                      // Menu position
  };

  // Navigation entry (optional)
  navigation?: {
    href: string;
    icon: string;                       // Heroicons class
    order: number;
  };
}
```

### DataImporter

```typescript
// types/importer.ts
interface DataImporter {
  id: string;                            // e.g., "insight-timer", "csv-generic"
  name: string;                          // Human-readable name
  description: string;
  fileTypes: string[];                   // e.g., [".csv", ".json"]
  icon: string;

  // Parse file into candidate entries for review
  parse(file: File, options?: Record<string, unknown>): Promise<ImportCandidate[]>;

  // Optional: custom UI component for column mapping, preview, etc.
  configComponent?: string;
}
```

### DataExporter

```typescript
// types/exporter.ts
interface DataExporter {
  id: string;                            // e.g., "json", "csv", "obsidian"
  name: string;
  description: string;
  fileExtension: string;                 // e.g., ".json", ".csv", ".md"
  mimeType: string;
  icon: string;

  // Generate export from entries
  export(entries: Entry[], options?: Record<string, unknown>): Promise<Blob>;

  // Optional: custom UI component for export options
  configComponent?: string;
}
```

## File Structure

```
app/
  modules/
    entry-types/
      timed/
        index.ts              # EntryTypeDefinition export
        TimedInput.vue        # Input form (extracted from sessions.vue)
        TimedTimeline.vue     # Optional: custom timeline card
      tada/
        index.ts
        TadaInput.vue         # Input form (extracted from tada/index.vue)
        TadaCelebration.vue   # Celebration overlay
      moment/
        index.ts
        MomentInput.vue       # Input form (extracted from moments.vue)
      tally/
        index.ts
        TallyInput.vue        # Input form (extracted from tally.vue)
    importers/
      csv-generic/
        index.ts              # DataImporter export
      insight-timer/
        index.ts
    exporters/
      json/
        index.ts              # DataExporter export
      csv/
        index.ts
      markdown/
        index.ts
      obsidian/
        index.ts
  registry/
    entryTypes.ts             # Discovers and registers all entry types
    importers.ts              # Discovers and registers all importers
    exporters.ts              # Discovers and registers all exporters
  pages/
    create/
      [type].vue              # Generic entry creation page (delegates to inputComponent)
    tada/
      index.vue               # Kept as convenience route (delegates to TadaInput)
    sessions.vue              # Kept as convenience route (delegates to TimedInput)
    moments.vue               # Kept as convenience route (delegates to MomentInput)
    tally.vue                 # Kept as convenience route (delegates to TallyInput)
```

## Open Questions

1. **Component registration with Nuxt:** Module components need to be auto-imported. Options: keep them in `components/` (Nuxt convention), or configure Nuxt to scan `modules/` too. Simplest: use `components/` directories within modules and configure `nuxt.config.ts` to scan them.

2. **Server-side type validation:** The API validates entry types server-side with a hardcoded list. Options: (a) shared JSON type list imported by both client and server, (b) relax server to accept any string since the column is already `text`. Recommendation: (a) — a simple `registeredTypes.ts` file importable from both sides.

3. **Navigation:** Currently hardcoded in nav. Keep it hardcoded for now (4 items is fine). Defer dynamic nav until there are actually more types.

4. **Backwards compatibility:** Old entries with types not in the registry should render with a generic fallback, not throw errors.

## Out of Scope

- Runtime plugin loading / external plugins
- Plugin marketplace or registry
- User-installable plugins via UI
- Sandboxed code execution
- Plugin API versioning
- Dynamic navigation generation (defer to when we have >4 types)

## Success Criteria

- [ ] All four core entry types registered through the module system
- [ ] A new entry type can be added by creating a module directory — no core file changes
- [ ] Import wizard uses registered importers
- [ ] Export uses registered exporters
- [ ] No user-visible regressions (all existing flows work identically)
- [ ] One new type built as a pure module to validate the architecture
- [ ] Documentation for how to create a new module
