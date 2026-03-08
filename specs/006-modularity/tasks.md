# Tasks: Modular Architecture

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Phase 1: Interfaces & Registry Foundation

- [x] **1.1** Create `app/types/entryType.ts` with `EntryTypeDefinition` interface
- [x] **1.2** Create `app/types/importer.ts` with `DataImporter` interface
- [x] **1.3** Create `app/types/exporter.ts` with `DataExporter` interface
- [x] **1.4** Create `app/registry/entryTypes.ts` — register/lookup functions, Map-based store
- [x] **1.5** Create `app/registry/importers.ts` — register/lookup functions
- [x] **1.6** Create `app/registry/exporters.ts` — register/lookup functions
- [x] **1.7** Create `app/shared/registeredTypes.ts` — type list shared between client and server
- [x] **1.8** Update `app/utils/entrySchemas.ts` — `EntryTypeSchema` reads from registry
- [x] **1.9** Update `nuxt.config.ts` — add `app/modules/**/` to component scan paths
- [x] **1.10** Write unit tests for all three registries
- [x] **1.11** Verify existing tests still pass, no regressions

## Phase 2: Pilot Module — Tally

- [x] **2.1** Create `app/modules/entry-types/tally/index.ts` with `EntryTypeDefinition`
- [x] **2.2** Extract `TallyInput.vue` from `app/pages/tally.vue` into `app/modules/entry-types/tally/`
- [x] **2.3** Refactor `app/pages/tally.vue` to render `TallyInput` from module
- [x] **2.4** Register tally module in entry type registry
- [x] **2.5** Verify tally page works identically (manual test)
- [x] **2.6** Write `MODULES.md` documenting how to create a new entry type module

## Phase 3: Remaining Entry Type Modules

### Tada
- [x] **3.1** Create `app/modules/entry-types/tada/index.ts`
- [x] **3.2** Extract `TadaInput.vue` from `app/pages/tada/index.vue`
- [x] **3.3** Extract `TadaCelebration.vue` (celebration overlay logic) — uses existing shared `CelebrationOverlay` component
- [x] **3.4** Refactor `app/pages/tada/index.vue` to use module components

### Timed (Sessions)
- [x] **3.5** Create `app/modules/entry-types/timed/index.ts`
- [x] **3.6** Extract `TimedInput.vue` from `app/pages/sessions.vue`
- [x] **3.7** Refactor `app/pages/sessions.vue` to use module component
- [x] **3.8** Verify timer state, session recovery, and voice entry still work

### Moment
- [x] **3.9** Create `app/modules/entry-types/moment/index.ts`
- [x] **3.10** Extract `MomentInput.vue` from `app/pages/moments.vue` (with subcategory support)
- [x] **3.11** Refactor `app/pages/moments.vue` to use module component

### Generic Page & Menu
- [x] **3.12** Create `app/pages/create/[type].vue` — generic entry creation page
- [ ] **3.13** Refactor `QuickAddMenu.vue` to read entry types from registry — deferred (QuickEntryModal works fine with current approach; revisit when >4 types)
- [x] **3.14** Verify all four entry types work through existing routes AND `/create/[type]`

## Phase 4: Importers & Exporters

### Importers
- [x] **4.1** Create `app/modules/importers/csv-generic/index.ts` — extract from `server/services/import.ts`
- [x] **4.2** Create `app/modules/importers/insight-timer/index.ts` — extract Insight Timer recipe
- [ ] **4.3** Refactor `server/services/import.ts` to dispatch to registered importers — deferred (server uses Node APIs; modules use client-side File/Blob APIs)
- [ ] **4.4** Refactor `ImportWizard.vue` to read importers from registry — deferred (depends on 4.3)

### Exporters
- [x] **4.5** Create `app/modules/exporters/json/index.ts` — extract `toJSON()` from `server/services/export.ts`
- [x] **4.6** Create `app/modules/exporters/csv/index.ts` — extract `toCSV()`
- [x] **4.7** Create `app/modules/exporters/markdown/index.ts` — extract `toMarkdown()`
- [x] **4.8** Create `app/modules/exporters/obsidian/index.ts` — extract Obsidian format
- [ ] **4.9** Refactor `server/services/export.ts` to dispatch to registered exporters — deferred (server uses Node APIs; modules use client-side Blob APIs)
- [ ] **4.10** Refactor export UI to read formats from registry — deferred (depends on 4.9)

## Phase 5: Validate with New Type

- [x] **5.1** Create `app/modules/entry-types/exercise/index.ts` with full definition
- [x] **5.2** Create `ExerciseInput.vue` — activity picker, duration, intensity
- [x] **5.3** Create `ExerciseTimeline.vue` — custom timeline display (optional) — skipped, not needed for validation
- [x] **5.4** Verify exercise type works end-to-end with zero core file changes
- [x] **5.5** If core changes were needed, document and fix the registry gaps — only `shared/registeredTypes.ts` needs updating, as designed

## Phase 6: Test Coverage

- [x] **6.1** Unit tests for entry type registry (register, lookup, unknown fallback)
- [x] **6.2** Unit tests for importer registry (register, match by file type)
- [x] **6.3** Unit tests for exporter registry (register, lookup by ID)
- [x] **6.4** Tests for `EntryTypeSchema` validation with registry
- [ ] **6.5** Tests for `server/services/entries.ts` CRUD operations — deferred (depends on 4.3/4.9 service refactoring)
- [ ] **6.6** Tests for `server/services/import.ts` dispatcher — deferred (depends on 4.3)
- [ ] **6.7** Tests for `server/services/export.ts` dispatcher — deferred (depends on 4.9)
- [ ] **6.8** Tests for `composables/useEntryEngine.ts` entry creation flow — deferred (requires full Nuxt test environment)
- [x] **6.9** Module manifest shape tests (each module exports correct interface)
- [ ] **6.10** Integration test: create entry via `/create/[type]` generic page — deferred (requires e2e test setup)
