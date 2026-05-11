# Database migrations

SQL migration files for the Drizzle ORM schema.

## How migrations run

Tada uses **one runner** for both dev and production: [`app/migrate.js`](../../../migrate.js).

| Context | Command |
| --- | --- |
| Local dev | `bun run db:migrate` (in `app/`) — points at `../data/db.sqlite` |
| Production (Docker) | `CMD` in [`Dockerfile`](../../../../Dockerfile) — `bun run migrate.js && bun run .output/server/index.mjs` |

The runner reads every `*.sql` file in this folder in **alphabetical order**, checks `__drizzle_migrations` for the **filename** (e.g. `0014_backronyms.sql`), and applies anything new. Already-applied migrations are skipped by name.

To keep migrations safe to re-run, the runner tolerates these errors as no-ops:

- `duplicate column name` — `ALTER TABLE ADD COLUMN` for a column that's already there.
- `already exists` — `CREATE TABLE` / `CREATE INDEX` without `IF NOT EXISTS` that's already there.
- `no such table` — legacy `RENAME` migrations where the source table never existed (e.g. fresh installs where `0022_system_messages_rename` has nothing to rename because the runtime plugin's `ensureTables` now creates the target table directly).

This means **migrations should be written defensively** — prefer `CREATE TABLE IF NOT EXISTS`, accept that bare `ALTER TABLE ADD COLUMN` will silently re-skip on re-runs.

## `meta/_journal.json`

Auto-managed by `drizzle-kit generate`. The runner does **not** read it. It exists so `drizzle-kit generate` knows which idx/timestamp to assign to the next migration, and for any developer who wants to use `drizzle-kit migrate` (not recommended — its semantics don't match production).

When adding a migration via `drizzle-kit generate`, the journal is updated automatically. If you create a SQL file by hand, also add a corresponding entry to `_journal.json`.

## Adding a new migration

Preferred:

```bash
cd app && bun run db:generate   # drizzle-kit generates 0025_*.sql + journal entry
# review the SQL, edit if needed (add IF NOT EXISTS, idempotency)
bun run db:migrate                # applies it locally
```

For hand-written migrations:

1. Create `00NN_descriptive_name.sql` here.
2. Add a matching entry to `meta/_journal.json` with the next `idx` and a sensible `when` (ms timestamp).
3. Run `bun run db:migrate` to apply.

## Testing a fresh install

```bash
rm -f /tmp/fresh.sqlite
DATABASE_URL=file:/tmp/fresh.sqlite bun /workspaces/tada/app/migrate.js
```

Should complete without errors, producing the canonical schema (28 migrations as of 2026-05).

## Known tech-debt

- **Duplicate-numbered files** (`0003`, `0011`, `0015` each have two). Both files in each pair are applied to the live DB by filename, so renaming/deleting them would orphan live's `__drizzle_migrations` entries. Left as-is.
- **`drizzle-kit migrate` semantics drift**. Drizzle's migrator decides what to apply by timestamp, not by file hash; this can leave it out of sync with `__drizzle_migrations` (which the runner populates by filename). That's why we don't use it. Don't run `drizzle-kit migrate` on a live DB.
- **Plugin-managed tables.** `system_messages`, `system_message_deliveries`, `weekly_rhythm_settings`, `weekly_stats_snapshots`, and `push_subscriptions` are created by the runtime plugin [`server/plugins/weekly-rhythms.ts`](../../plugins/weekly-rhythms.ts) (`ensureTables`), not by a migration. Schema drift between the plugin's DDL and the Drizzle schema is possible — keep them in sync.
