# Implementation Plan: Modular Architecture

**Branch**: `006-modularity` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)

## Summary

Reorganize Ta-da from page-based to module-based architecture. Entry types, importers, and exporters become self-contained modules that register with central registries. Core types serve as reference implementations. No external plugin loading — just clean internal boundaries.

**Technical Approach**: Define TypeScript interfaces for entry types, importers, and exporters. Create registry modules that import from well-known directories. Extract existing type-specific logic from pages into module components. Refactor import/export services to delegate to registered modules.

## Technical Context

**Language/Version**: TypeScript 5.x via Nuxt 3 (Vue 3 + Nitro server)
**Primary Dependencies**: Nuxt 3, Vue 3, Drizzle ORM, Zod, Vitest
**Runtime**: Bun
**Testing**: Vitest with @nuxt/test-utils

**Constraints**:
- Nuxt file-based routing: pages must live in `app/pages/` — modules can't register routes dynamically
- Nuxt auto-imports: components must be in directories Nuxt scans (configurable in `nuxt.config.ts`)
- Server-side validation currently uses hardcoded type list — must be made registry-aware
- Existing pages (tada, sessions, moments, tally) must keep working at their current URLs

**Key files that will change**:
- `app/utils/entrySchemas.ts` — EntryTypeSchema from hardcoded enum to registry-driven
- `app/pages/tada/index.vue` (37KB) — extract input form to module component
- `app/pages/sessions.vue` (74KB) — extract input form to module component
- `app/pages/moments.vue` (25KB) — extract input form to module component
- `app/pages/tally.vue` (28KB) — extract input form to module component
- `app/server/services/import.ts` (17KB) — refactor to delegate to importer modules
- `app/server/services/export.ts` (10KB) — refactor to delegate to exporter modules
- `app/utils/categoryDefaults.ts` — integrate with entry type registry for display
- `app/components/QuickAddMenu.vue` — read entry types from registry
- `nuxt.config.ts` — add module directories to component scan paths

## Phase 1: Interfaces & Registry Foundation

**Goal**: Define the interfaces and create the registry system. No visible changes to users.

### 1.1 Define TypeScript interfaces

Create the three core interfaces in `app/types/`:
- `EntryTypeDefinition` — type metadata, component references, quick-add config
- `DataImporter` — file parsing interface with optional config component
- `DataExporter` — export generation interface with optional config component

### 1.2 Create registry modules

Create `app/registry/` with three files:
- `entryTypes.ts` — `registerEntryType()`, `getRegisteredTypes()`, `getEntryTypeDefinition(type)`
- `importers.ts` — `registerImporter()`, `getRegisteredImporters()`, `getImporterForFile(file)`
- `exporters.ts` — `registerExporter()`, `getRegisteredExporters()`, `getExporter(id)`

Each registry is a simple Map with registration and lookup functions. No class hierarchy, no DI container.

### 1.3 Replace hardcoded EntryTypeSchema

Change `entrySchemas.ts` from:
```typescript
export const EntryTypeSchema = z.enum(["timed", "tally", "moment", "tada"]);
```
To:
```typescript
export const EntryTypeSchema = z.string().refine(
  (t) => getRegisteredTypes().has(t),
  { message: "Unknown entry type" }
);
```

### 1.4 Create shared type list for server validation

Create `app/shared/registeredTypes.ts` that both client and server can import. This is a simple string array that the registry populates on the client side, and the server imports directly.

### 1.5 Configure Nuxt to scan module directories

Update `nuxt.config.ts` to include `app/modules/**/components/` in the component auto-import scan paths.

**Exit criteria**: Registry system exists, tests pass, no user-visible changes.

## Phase 2: Extract Entry Type Modules (Pilot: Tally)

**Goal**: Extract one entry type into a module to prove the pattern. Tally is the cleanest and most self-contained.

### 2.1 Create tally module structure

```
app/modules/entry-types/tally/
  index.ts              # EntryTypeDefinition
  TallyInput.vue        # Extracted from pages/tally.vue
```

### 2.2 Extract TallyInput component

Move the tally-specific input form logic from `pages/tally.vue` into `TallyInput.vue`. The page becomes a thin wrapper that renders the module's input component.

### 2.3 Register tally in the entry type registry

The tally module's `index.ts` exports its `EntryTypeDefinition`. The registry auto-discovers it.

### 2.4 Verify the page still works

`pages/tally.vue` now imports and renders `TallyInput` from the module. All existing behavior preserved.

### 2.5 Document the pattern

Write a brief `MODULES.md` showing how to create a new entry type module.

**Exit criteria**: Tally works exactly as before, but its input logic lives in a module.

## Phase 3: Extract Remaining Entry Type Modules

**Goal**: Migrate tada, timed, and moment to the same pattern.

### 3.1 Extract tada module

```
app/modules/entry-types/tada/
  index.ts
  TadaInput.vue         # From pages/tada/index.vue
  TadaCelebration.vue   # Celebration overlay (already a logical component)
```

### 3.2 Extract timed module

```
app/modules/entry-types/timed/
  index.ts
  TimedInput.vue        # From pages/sessions.vue (the big one — 74KB page)
```

Note: `sessions.vue` is the largest page. The extraction here is the most complex. Timer state management, session recovery, and voice support all need to move cleanly.

### 3.3 Extract moment module

```
app/modules/entry-types/moment/
  index.ts
  MomentInput.vue       # From pages/moments.vue
```

Moment has subcategories (journal, dream, gratitude, magic) — these stay within the moment module.

### 3.4 Create generic /create/[type] page

A catch-all page that looks up the type in the registry and renders its `inputComponent`. Existing convenience routes (`/tada`, `/sessions`, etc.) remain as thin wrappers.

### 3.5 Wire up QuickAddMenu to registry

`QuickAddMenu.vue` currently hardcodes four entry types. Change it to read from the entry type registry's `quickAdd` config.

**Exit criteria**: All four types work through modules. Existing URLs still work. QuickAddMenu is registry-driven.

## Phase 4: Extract Importers & Exporters

**Goal**: Make import/export pluggable through the registry.

### 4.1 Create importer modules

```
app/modules/importers/
  csv-generic/index.ts    # Generic CSV with column mapping
  insight-timer/index.ts  # Insight Timer specific format
```

Extract parsing logic from `server/services/import.ts` into these modules. The import service becomes a dispatcher that finds the right importer and calls `parse()`.

### 4.2 Create exporter modules

```
app/modules/exporters/
  json/index.ts
  csv/index.ts
  markdown/index.ts
  obsidian/index.ts
```

Extract formatting logic from `server/services/export.ts`. The export service becomes a dispatcher that finds the right exporter and calls `export()`.

### 4.3 Refactor ImportWizard to use registry

`ImportWizard.vue` reads available importers from the registry. When a file is selected, it finds matching importers by file type and lets the user choose.

### 4.4 Refactor export UI to use registry

Export format selection reads from the exporter registry instead of hardcoded options.

**Exit criteria**: Import/export work exactly as before, but logic lives in modules. Adding a new importer/exporter requires no core changes.

## Phase 5: Validate with a New Type

**Goal**: Prove the architecture by building one new entry type as a pure module.

### 5.1 Choose and build a new type

Candidate: `exercise` (workout, run, yoga) — simple enough to validate the pattern, useful enough to keep.

Create the full module:
```
app/modules/entry-types/exercise/
  index.ts              # EntryTypeDefinition with dataSchema for workout data
  ExerciseInput.vue     # Input form with activity picker, duration, intensity
  ExerciseTimeline.vue  # Optional: show workout summary in timeline
```

### 5.2 Verify zero core changes needed

The exercise type should work end-to-end without modifying any file outside its module directory. If core changes are needed, that reveals gaps in the registry system to fix.

**Exit criteria**: Exercise type works fully. Zero files modified outside the module directory.

## Phase 6: Test Coverage

**Goal**: Add tests for the new registry system and expand coverage for critical services.

### 6.1 Registry tests

- Entry type registration and lookup
- Importer matching by file type
- Exporter lookup by ID
- Unknown type fallback behavior
- EntryTypeSchema validation with registry

### 6.2 Priority service tests

Based on current coverage gaps:
- `server/services/entries.ts` — CRUD operations
- `server/services/import.ts` — dispatch to importers
- `server/services/export.ts` — dispatch to exporters
- `composables/useEntryEngine.ts` — entry creation flow

### 6.3 Module tests

Each entry type module should have at least:
- Manifest exports correct shape
- Input component renders without errors

**Exit criteria**: Registry fully tested. Service test coverage improved.

## Dependencies & Risks

### Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| sessions.vue extraction too complex (74KB) | High | Extract incrementally — timer core first, then voice, then recovery |
| Component auto-import breaks | Medium | Test with `nuxt.config.ts` scan config early in Phase 1 |
| Server-side validation mismatch | Medium | Shared type list imported by both client and server |
| Registry adds overhead to startup | Low | Static imports, no dynamic discovery — negligible cost |

### What we're NOT doing

- Dynamic navigation generation (keep hardcoded for 4 types)
- External plugin loading
- Runtime module discovery
- Full page routing through registry (keep file-based pages)
- Breaking existing URLs

## Phase Order & Dependencies

```
Phase 1 (Foundation)
  └── Phase 2 (Pilot: Tally)
       └── Phase 3 (Remaining types)  ──┐
       └── Phase 4 (Import/Export)     ──┤
                                         └── Phase 5 (Validation)
                                              └── Phase 6 (Tests)
```

Phases 3 and 4 can run in parallel once Phase 2 validates the pattern.
