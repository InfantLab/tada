# Obsidian ↔ Dreams Sync — Home-Server Agent Setup

How to configure an external agent (running on your home server) to keep a
dreams folder in an Obsidian vault in sync with the Ta-Da! instance.

The sync is driven by a standalone Node script
([app/scripts/sync-obsidian.mjs](../../app/scripts/sync-obsidian.mjs)) that
talks to the Ta-Da! API over HTTPS with a Bearer token. No Obsidian plugin
is required — the script reads and writes `.md` files directly.

Production base URL: `https://tada.living`

Replace `https://tada.living` below if running against a different
deployment (e.g. `http://localhost:3000` for local dev).

---

## Prerequisites

1. **Node.js 20+** on the home server (the script uses `node:util`
   `parseArgs` and top-level `await`).
2. **A checkout of the repo**, or just the file
   `app/scripts/sync-obsidian.mjs` dropped onto the home server — it has
   no third-party dependencies.
3. **A writable Obsidian vault path** the agent can read and write.

---

## Step 1 — Mint an API key

The agent authenticates with a Bearer API key that has two permissions:

- `entries:read` — list and read entries
- `entries:write` — create and update entries

Open devtools on any `https://tada.living/*` page while signed in, and
run:

```js
await fetch("https://tada.living/api/v1/auth/keys", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "home-server obsidian sync",
    permissions: ["entries:read", "entries:write"],
  }),
}).then((r) => r.json());
```

The response includes a `key` of the form `tada_key_…`. **This is the
only time the plaintext key is shown.** Copy it to the home-server
agent's secret store immediately.

> Do not grant `admin:*` scopes for this agent. Scope the key to the
> minimum it needs.

---

## Step 2 — Lay out the vault

The script expects a subfolder inside the vault for its managed files
(default: `tada/`). For dreams specifically, a nested folder like
`tada/dreams/` keeps things tidy:

```
MyVault/
├── .tada-sync.json              ← optional config file
├── .tada-sync-state.json        ← auto-created by the script (do not edit)
└── tada/
    └── dreams/
        ├── 2026-04-21-waning-gibbous.md
        └── …
```

The script will create `tada/dreams/` on first run if it doesn't exist.
It also creates `tada/dreams/.trash/` for files whose underlying entries
have been deleted in Ta-Da!.

---

## Step 3 — Configure the agent

Two ways to supply config, which can be mixed. CLI flags always win over
config-file values, and env vars are the fallback.

### Option A — `.tada-sync.json` in the vault root (auto-loaded)

```json
{
  "apiUrl": "https://tada.living",
  "apiKey": "tada_key_…",
  "syncFolder": "tada/dreams",
  "categories": ["journal"],
  "subcategories": ["dream"],
  "fileNamePattern": "{{date}}-{{name}}.md",
  "pushDeletes": false
}
```

### Option B — environment variables + CLI flags

```bash
export TADA_API_KEY=tada_key_…
export TADA_API_URL=https://tada.living

node scripts/sync-obsidian.mjs \
  --vault /home/me/MyVault \
  --sync-folder tada/dreams \
  --subcategories dream
```

---

## Step 4 — Run the sync

### Normal bidirectional sync

```bash
node scripts/sync-obsidian.mjs --vault /home/me/MyVault
```

### Dry run (recommended for first invocation)

Prints what _would_ happen without writing anything to the vault or the
API:

```bash
node scripts/sync-obsidian.mjs --vault /home/me/MyVault --dry-run --verbose
```

### One-way only

- `--direction pull` — Ta-Da! → vault only (safe on a new vault).
- `--direction push` — vault → Ta-Da! only.
- `--direction both` (default) — pull first, then push.

### Scheduling

Drop it in cron on the home server, e.g. every 15 minutes:

```cron
*/15 * * * * /usr/bin/node /opt/tada/scripts/sync-obsidian.mjs \
  --config /home/me/MyVault/.tada-sync.json >> /var/log/tada-sync.log 2>&1
```

---

## CLI reference

| Flag | Short | Default | Notes |
|------|-------|---------|-------|
| `--vault <path>` | `-v` | — | **Required.** Absolute path to the Obsidian vault |
| `--api-key <key>` | `-k` | `$TADA_API_KEY` | **Required** via flag, config, or env |
| `--api-url <url>` | `-u` | `http://localhost:3000` | Override with `$TADA_API_URL` or config |
| `--config <path>` | `-c` | — | Path to a config JSON file |
| `--direction <dir>` | `-d` | `both` | `pull`, `push`, or `both` |
| `--dry-run` | — | `false` | Preview without writing |
| `--categories <list>` | — | — | Comma-separated category filter (pull + push) |
| `--subcategories <list>` | — | — | Comma-separated subcategory filter (pull + push) |
| `--sync-folder <path>` | — | `tada` | Subfolder inside the vault the script owns |
| `--file-pattern <pat>` | — | `{{date}}-{{name}}.md` | Filename template — see below |
| `--verbose` | — | `false` | Per-file log lines |
| `--help` | `-h` | — | Show inline help |

**Filename template placeholders**: `{{date}}` (YYYY-MM-DD from
timestamp), `{{name}}` (slugified entry name), `{{category}}`,
`{{subcategory}}`, `{{id}}` (first 8 chars of entry id).

---

## Markdown format

Each synced entry is a `.md` file with YAML frontmatter followed by an
H1 title and body. For a dream:

```markdown
---
tada_id: abc123…
type: moment
category: journal
subcategory: dream
timestamp: 2026-04-21T08:00:00+01:00
tags: [lucid, flying]
source: obsidian
---

# Flying over the house

I was skimming the rooftops, palm-up against the sky…
```

- `tada_id` is the authoritative link back to the Ta-Da! entry. Leave it
  alone. If you author a new `.md` file in the sync folder and omit
  `tada_id`, the script will create a matching entry on the next push
  and stamp the id back into the frontmatter.
- The H1 title becomes the entry `name`. Body below the H1 becomes
  `notes`.
- Only frontmatter fields listed above round-trip. Extra keys are
  ignored on push and will be dropped on the next pull.

---

## What counts as a "dream"?

Dreams are ordinary Ta-Da! entries tagged with the category /
subcategory the agent is configured to sync. The current convention:

- `category: journal`
- `subcategory: dream`

Any entry matching that pair is pulled into the vault; any `.md` file
whose frontmatter matches is pushed back up. If you change the
convention on one side, update `categories` / `subcategories` in the
agent's config on the same day or the sync will start skipping files.

---

## Conflict resolution

- **Remote newer than local (pull phase):** remote overwrites local.
- **Local file modified since last sync, local `mtime` > remote
  `updatedAt`:** local wins — file is skipped this pull, will be pushed
  next run.
- **Same content hash on both sides:** skipped (no-op).

State is kept in `.tada-sync-state.json` inside the vault root. It maps
each `tada_id` to its filename plus content hashes. Do **not** edit or
delete this file unless you want to force a full resync.

---

## Error cases

| Message | Meaning | Fix |
|---------|---------|-----|
| `Cannot connect to Ta-Da! API at …` | API URL wrong or the instance is down | Check `--api-url` / `apiUrl` |
| `API 401: …` | Key missing, revoked, or typo'd | Rotate key (Step 1) |
| `API 403: …` | Key lacks `entries:read` or `entries:write` | Re-mint with correct permissions |
| `Vault path does not exist: …` | `--vault` points at a missing directory | Fix the path |
| `Failed to read config file: …` | Bad JSON or wrong path | Validate with `jq . < .tada-sync.json` |

Non-zero exit code means at least one entry or file errored — check the
log for `Error syncing entry …` or `Error pushing …` lines before the
summary.

---

## Rotating / revoking the key

List your keys (browser console, logged in):

```js
await fetch("https://tada.living/api/v1/auth/keys", {
  credentials: "include",
}).then((r) => r.json());
```

Revoke by id:

```js
await fetch("https://tada.living/api/v1/auth/keys/<KEY_ID>", {
  method: "DELETE",
  credentials: "include",
});
```

Then redo Step 1 to mint a replacement and swap it into the agent's
secret store (or `$TADA_API_KEY`).

---

## Reference: live API docs

- **Scalar UI:** https://tada.living/api-docs
- **OpenAPI JSON:** https://tada.living/api/openapi.json

Relevant endpoints this script uses: `GET /api/v1/sync/status`,
`GET /api/v1/entries`, `POST /api/v1/entries`,
`PATCH /api/v1/entries/{id}`.

---

[Back to Modules](./README.md)
