# Importers, Exporters & Sync Providers

Your data is always yours. These modules handle getting data in and out of Ta-Da! in multiple formats.

## Importer Modules

Importers bring data in from external sources. Each importer handles a specific file format or service.

| Module | ID | Accepts | Description |
|--------|----|---------|-------------|
| **Custom CSV** | `csv-generic` | `.csv` | Field mapping wizard for any CSV format |
| **Insight Timer** | `insight-timer` | `.csv` | Pre-configured for Insight Timer exports |

**Code:** `app/modules/importers/`

### Creating an importer

Implement the `DataImporter` interface and call `registerImporter()`. See [MODULES.md](../../MODULES.md) and `app/types/importer.ts` for the interface.

---

## Exporter Modules

Exporters get your data out in useful formats — export anytime.

| Module | ID | Format | Description |
|--------|----|--------|-------------|
| **JSON** | `json` | `.json` | Full data with version metadata |
| **CSV** | `csv` | `.csv` | Spreadsheet-compatible flat export |
| **Markdown** | `markdown` | `.md` | Human-readable grouped by category |
| **Obsidian** | `obsidian` | `.md` | Daily/weekly/monthly notes with YAML frontmatter |

**Code:** `app/modules/exporters/`

### Creating an exporter

Implement the `DataExporter` interface and call `registerExporter()`. See `app/types/exporter.ts` for the interface.

---

## Sync Provider Modules

Sync providers enable bidirectional data flow with external services.

| Module | ID | Direction | Description |
|--------|----|-----------|-------------|
| **Obsidian** | `obsidian` | Bidirectional | Sync entries as markdown files in an Obsidian vault |

**Code:** `app/modules/sync-providers/`

The Obsidian sync provider supports:
- Atomic file writes (write to `.tmp`, then rename)
- SHA-256 content hashing for change detection
- Soft delete via `.trash` subfolder
- YAML frontmatter with full entry metadata

### Creating a sync provider

Implement the `SyncProvider` interface and call `registerSyncProvider()`. See `app/types/syncProvider.ts` for the interface.

---

[Back to modules](./README.md)
