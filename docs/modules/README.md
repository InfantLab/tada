# Ta-Da! Modules

Ta-Da! is built as a set of **self-contained modules** that register themselves with a central registry. Each entry type, importer, exporter, and sync provider is a module — making the system extensible without touching core code.

## Entry Type Modules

Entry types define **how** an activity is recorded. Each module provides its own input UI, metadata, and optional timeline/detail components. All entry types share the same unified `entries` table — types define behavior, not schema.

| Module | Type | Description |
|--------|------|-------------|
| [Timeline](./timeline.md) | — | Home screen: chronological view of all entries |
| [Ta-Da! Wins](./tada.md) | `tada` | Celebrate accomplishments as they happen |
| [Moments](./moments.md) | `moment` | Dreams, ideas, gratitude, and reflections |
| [Sessions](./sessions.md) | `timed` | Timer for meditation and focused practices |
| [Tally](./tally.md) | `tally` | Count-based tracking for discrete activities |
| [Rhythms](./rhythms.md) | — | Graceful chains that celebrate consistency |

## Data Flow Modules

| Module | Type | Description |
|--------|------|-------------|
| [Importers & Exporters](./data-flow.md) | Various | Bring data in and get it out in multiple formats |

## Module Architecture

Every module follows the same pattern: **define, register, use**.

```
app/
  types/           # Interfaces (EntryTypeDefinition, DataImporter, DataExporter, SyncProvider)
  registry/        # Central registries (entry types, importers, exporters, sync providers)
  modules/
    entry-types/   # One directory per type (tada, timed, tally, moment, ...)
    importers/     # CSV generic, Insight Timer, ...
    exporters/     # JSON, CSV, Markdown, Obsidian
    sync-providers/# Obsidian vault sync, ...
  plugins/
    modules.client.ts  # Auto-imports all modules
```

Each module defines its metadata and calls `registerEntryType()` / `registerImporter()` / etc. on import. Zero core code changes needed to add a new module.

See [MODULES.md](../../MODULES.md) for the step-by-step developer guide to creating new modules, and [design/modularity.md](../../design/modularity.md) for the architecture decision.

## Design Philosophy

Every module serves the core philosophy:

1. **Count up, never down** — Timers show elapsed time, not remaining time
2. **Identity over behavior** — "You're becoming a meditator" not "You meditated 5 times"
3. **Graceful chains** — Missing a day isn't failure; the system finds something to celebrate
4. **Minimize friction** — One tap to start, one tap to save
5. **Celebration over obligation** — The todo list becomes the ta-da list

Read the full philosophy: [design/philosophy.md](../../design/philosophy.md)
