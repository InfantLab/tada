# Modularity Design

How to make Ta-Da! modular so that new entry types, importers, exporters, and features can be added without changing core code.

**Status:** Design (v0.5.0 target)
**Related:** [SDR.md Section 5](SDR.md#5-plugin-architecture) | [roadmap.md](roadmap.md) | [decisions.md](decisions.md)

---

## Problem

After four releases the codebase has grown organically. Every entry type (timed, tada, moment, tally) has its own dedicated page, its own save logic, and its own timeline rendering. Importers and exporters are inline code. Adding a new entry type today means touching:

1. `entrySchemas.ts` — add to the Zod enum
2. A new page under `app/pages/` — build the full input UI
3. `useEntrySave.ts` or `useEntryEngine.ts` — add save logic
4. Timeline components — add rendering for the new type
5. Settings page — add visibility toggle
6. Navigation — add to the bottom bar or menu

This coupling means every future feature (celestial calendar, routines, AI insights, external integrations) will tangle deeper into the core. Before building more features, we should create clean extension points.

## Goals

1. **New entry types without core changes** — a plugin should be able to define a type, its input UI, its timeline display, and its data schema.
2. **Pluggable import/export** — importers (CSV recipes, API syncs) and exporters (JSON, Markdown, Obsidian) should be interchangeable modules.
3. **Core types as plugins** — timed, tada, moment, tally should use the same extension points as third-party types, proving the interface works.
4. **No runtime cost for unused plugins** — lazy loading, tree-shaking where possible.
5. **Self-hosted extensibility** — users can drop plugins into a directory without rebuilding the app.

## Non-Goals

- Full SPA decoupling (that's a separate, larger effort — see [decisions.md](decisions.md#native-mobile-not-yet-but-know-the-path))
- Plugin marketplace or registry (future, if ever)
- Multi-tenant plugin isolation (we're single-user per instance)

---

## Options Considered

### Option A: Full Plugin System (SDR Design)

The SDR defines a `TadaPlugin` interface with lifecycle hooks, multiple `register*()` methods, a `/plugins` directory, and plugin discovery.

**Pros:**
- Maximum extensibility — covers entry types, entities, importers, exporters, views, commands, insights
- Community plugins become possible
- Clean separation of concerns

**Cons:**
- Large upfront investment — plugin loader, lifecycle management, settings UI, error isolation
- Nuxt's SSR architecture complicates dynamic page registration (pages are file-based, resolved at build time)
- Risk of over-engineering for a single-developer project with few users
- Plugin API becomes a contract we must maintain

### Option B: Internal Module Registry (No External Plugins)

Instead of a full plugin system, create internal registries that the app uses to discover entry types, importers, and exporters. Modules live in well-known directories within the codebase. No external plugin loading.

**Pros:**
- Much simpler — no plugin lifecycle, no sandboxing, no external loading
- Still achieves the core goal: new types/importers/exporters without touching core code
- Modules are just TypeScript files — full type safety, tree-shaking, IDE support
- Easy to refactor toward Option A later if needed

**Cons:**
- No community extensibility (must fork to add types)
- Self-hosted users can't drop in plugins without rebuilding
- Less exciting on paper

### Option C: Configuration-Driven Types

Define entry types purely through configuration (JSON/YAML) — data schema, field definitions, display options. The core renders any type generically.

**Pros:**
- No code needed for simple types
- Users could create types through a UI

**Cons:**
- Very limited — can't express custom input interactions (e.g., timer, voice recording)
- Generic UI is always worse than purpose-built UI
- Configuration language inevitably grows into a bad programming language

---

## Decision: Option B (Internal Module Registry)

**Option B** is the right fit for where we are. It solves the actual problem (decoupling entry types and importers from core code) without the complexity of a full plugin runtime. It also preserves a clean migration path to Option A if we ever need external plugins.

**Key reasoning:**
- We have 1 developer and a handful of users. External plugin loading is premature.
- Nuxt's file-based routing makes dynamic page registration awkward. Internal modules with known file paths work naturally.
- The hardest part of modularity is designing the interfaces. Option B forces us to design the same interfaces as Option A, just without the loader. Upgrading later is straightforward.
- "Make it work with internal modules first, then add external loading" is a well-trodden path (VS Code extensions started this way).

---

## Architecture

### Entry Type Registry

A central registry that maps type strings to their definitions:

```typescript
// types/entryType.ts
interface EntryTypeDefinition {
  type: string;                          // e.g., "timed", "tada", "ritual"
  label: string;                         // Human-readable name
  emoji: string;                         // Default emoji
  description: string;                   // Short description for settings
  dataSchema?: ZodSchema;               // Validates the `data` JSON field
  requiresDuration?: boolean;
  requiresCount?: boolean;

  // Component references (resolved by Nuxt auto-imports)
  inputComponent: string;               // Component name for entry creation
  timelineComponent?: string;           // Component name for timeline display
  detailComponent?: string;             // Component name for entry detail view
}
```

**Registration:** Each module exports its definition from a known directory:

```
app/
  modules/
    entry-types/
      timed.ts        # exports EntryTypeDefinition + components
      tada.ts
      moment.ts
      tally.ts
    importers/
      insight-timer.ts
      csv-generic.ts
    exporters/
      json.ts
      csv.ts
      markdown.ts
      obsidian.ts
  registry/
    entryTypes.ts     # auto-discovers and registers all entry types
    importers.ts      # auto-discovers and registers all importers
    exporters.ts      # auto-discovers and registers all exporters
```

The registry files use static imports (for tree-shaking) but could later be replaced with dynamic `import()` for external plugins.

### Replacing the Hardcoded Enum

Currently `entrySchemas.ts` has:

```typescript
export const EntryTypeSchema = z.enum(["timed", "tally", "moment", "tada"]);
```

This becomes:

```typescript
import { getRegisteredTypes } from "~/registry/entryTypes";

export const EntryTypeSchema = z.string().refine(
  (t) => getRegisteredTypes().has(t),
  { message: "Unknown entry type" }
);
```

### Importer Interface

```typescript
interface DataImporter {
  id: string;
  name: string;
  description: string;
  fileTypes: string[];                   // e.g., [".csv", ".json", ".sqlite"]
  icon: string;

  // Parse the file and return candidate entries
  parse(file: File, options?: Record<string, unknown>): Promise<ImportCandidate[]>;

  // Optional: UI component for mapper/preview (column mapping, etc.)
  configComponent?: string;
}
```

The existing CSV import wizard becomes a generic shell that delegates to the matched importer's `parse()` and optional `configComponent`.

### Exporter Interface

```typescript
interface DataExporter {
  id: string;
  name: string;
  description: string;
  fileExtension: string;
  mimeType: string;
  icon: string;

  export(entries: Entry[], options?: Record<string, unknown>): Promise<Blob>;

  // Optional: UI component for export options
  configComponent?: string;
}
```

### Dynamic Page Routing

Nuxt pages are file-based, but we don't need dynamic routes for entry type input pages. Instead:

- A single catch-all page `/app/pages/create/[type].vue` renders the `inputComponent` from the type's registry entry.
- Existing dedicated pages (`/tada`, `/sessions`, `/moments`, `/tally`) can remain as convenience routes that internally delegate to the same components.
- Over time, dedicated pages can be retired in favour of `/create/[type]`.

---

## Migration Plan

### Phase 1: Define Interfaces & Registry

1. Create the `EntryTypeDefinition`, `DataImporter`, and `DataExporter` interfaces
2. Create the registry modules (`registry/entryTypes.ts`, etc.)
3. Register the four existing types with their current components

No visible change to users. Core code starts reading from the registry instead of hardcoded values.

### Phase 2: Extract Entry Type Modules

4. Extract each type's input logic into standalone components (from full pages to composable components)
5. Extract timeline rendering per type into standalone components
6. Wire up `/create/[type]` generic page
7. Update settings page to read entry types from registry

### Phase 3: Extract Importers & Exporters

8. Define importer interface, refactor CSV import wizard to use it
9. Move Insight Timer recipe into an importer module
10. Define exporter interface, refactor existing exports
11. Add Obsidian exporter as a module

### Phase 4: Validate with a New Type

12. Build one new entry type (e.g., `exercise` or `sleep`) as a pure module — no core changes
13. If it works cleanly, the architecture is validated
14. Document how to create a new module

---

## Future: Upgrading to External Plugins (Option A)

If we ever need external plugins, the path from Option B is clear:

1. Add a plugin loader that scans `/plugins` for manifest files
2. Use dynamic `import()` instead of static imports in the registry
3. Add plugin lifecycle hooks (`onLoad`, `onUnload`)
4. Add plugin settings persistence
5. Consider sandboxing / error isolation

The interfaces don't change — only the loading mechanism does.

---

## Open Questions

1. **Component registration:** Nuxt auto-imports components from `components/`. Module components would need to either live there or be explicitly registered. Simplest: keep them in `components/entry-types/` etc.

2. **Server-side type validation:** The API currently validates entry types server-side with a hardcoded list. The registry runs client-side. Options: shared type list in a JSON file, or relax server validation to accept any string (it's already stored as `text`).

3. **Navigation:** Currently entry types have dedicated nav items. With a registry, the nav could be dynamic. But 4 items is fine — defer dynamic nav until there are actually more types.

4. **Backwards compatibility:** Old entries with types not in the registry should render gracefully (generic fallback display, not errors).

---

_Last updated: March 2026_
