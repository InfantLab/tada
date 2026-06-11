# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL — Read Before Acting

- **❌ Never run `bun run dev`** — the user controls the dev server on `:3000`
- **❌ Never run `bun run test` alone** — it blocks the terminal. Use `bun run test:run` (non-interactive)
- **❌ Never run `sqlite3`** — CLI not installed. Use `bun run db:studio` for DB inspection
- **❌ Never auto-commit** — wait for an explicit "commit this" instruction
- **❌ No Bun APIs in server code** — production runtime is Node 20 (`app/server/**`)
- **❌ Never change `DATABASE_URL` in the Dockerfile** — production data lives at `/data/db.sqlite` mounted by CapRover. Changing this path causes permanent data loss
- **❌ Always explicit types on `$fetch`** — `$fetch<MyType>(...)` not `$fetch(...)`. Untyped calls cause CI failures from Nuxt's route type inference

## Commands

All commands run from `app/`:

```bash
bun run dev              # dev server on :3000 (user manages this)
bun run test:run         # non-interactive test run (CI-safe)
bun run test --run       # same, single run
bun run lint             # ESLint check
bun run lint:fix         # ESLint auto-fix
bun run lint:fix path/to/file.ts   # fix single file (faster)
bun run typecheck        # full TypeScript check (slow, ~30-60s — batch, don't run after every edit)
bun run db:generate      # generate Drizzle migrations after schema.ts changes
bun run db:migrate       # apply pending migrations
bun run db:studio        # DB browser UI on :4983
```

To run a single test file:

```bash
cd app
bunx vitest run path/to/file.test.ts
```

## Architecture

### Stack

- **Nuxt 4** (Nitro server + Vue 3 frontend in one app) + **TypeScript strict**
- **SQLite via Drizzle ORM** — schema at `app/server/db/schema.ts`
- **Lucia Auth v3** — session-based auth (`app/server/utils/auth.ts`)
- **Tailwind CSS 3** — colour palette anchored to `app/utils/categoryDefaults.ts`
- **Bun** for development; **Node 20** in production Docker image

### Unified Entry Model

Everything is an `Entry` — no separate tables per activity type. One `entries` table with `type` / `category` / `subcategory` open strings and a JSON `data` field for type-specific payload. Rhythms are aggregation queries over entries, not a separate data store.

```
Type (behaviour)  →  Category (domain)    →  Subcategory (specific)
    "timed"              "mindfulness"             "sitting"
    "tada"               "accomplishment"           "work"
    "tally"              "movement"                "push-ups"
    "moment"             "journal"                 "dream"
```

Adding a new entry type means using a new string — no schema migration, no enum change.

### Module System

Features self-register via a central registry rather than requiring core-code changes:

```
app/
  types/                    # Interfaces: EntryTypeDefinition, DataImporter, etc.
  registry/                 # Central registries
  modules/
    entry-types/            # One dir per type (tada, timed, tally, moment, ...)
    importers/              # CSV generic, Insight Timer, ...
    exporters/              # JSON, CSV, Markdown, Obsidian
    sync-providers/         # Obsidian vault sync
  plugins/modules.client.ts # Auto-imports all modules on app start
```

### Key Files

| File | Purpose |
|---|---|
| `app/server/db/schema.ts` | Database schema — edit here, then `db:generate` + `db:migrate` |
| `app/utils/categoryDefaults.ts` | Ontology: categories, subcategories, emojis, colours |
| `app/plugins/api-client.client.ts` | Global `$fetch` override: intercepts `/api/` calls to prepend `https://tada.living` and add `credentials:"include"`; drives IndexedDB offline cache. **See Capacitor fetch rules below before editing.** |
| `app/composables/useEntryEngine.ts` | Entry CRUD (create, read, update, delete) |
| `app/composables/useEntrySave.ts` | Voice/batch entry creation flow |
| `app/layouts/default.vue` | Main nav layout |
| `app/server/middleware/cors.ts` | CORS — always appends `https://app.tada.living` for the Android WebView |
| `app/server/utils/auth.ts` | Session cookie config (`SameSite=None; Secure` in production) |
| `app/utils/apiCache.ts` | IndexedDB offline read-cache for API GETs |

### Server API conventions

- Files at `app/server/api/**/*.{get,post,put,patch,delete}.ts` — Nitro auto-routes them
- Always import `createLogger` from `~/server/utils/logger`, never `console.log`
- Types come from `~/server/db/schema`

### Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `pages/index.vue` | Timeline — home screen |
| `/tada` | `pages/tada/` | Accomplish wins |
| `/moments` | `pages/moments.vue` | Dreams, reflections |
| `/sessions` | `pages/sessions.vue` | Timed activities |
| `/tally` | `pages/tally.vue` | Count-based activities |
| `/rhythms` | `pages/rhythms.vue` | Habit chains |

## Code Style

- Quotes: `"` not `'`; semicolons required
- Types: never `any` — use `unknown` + type guards
- Logging: `createLogger()` not `console.log`
- Always explicit type param on `$fetch`: `$fetch<ResponseType>("/api/...")`
- TypeScript strict mode — no `ts-ignore` (use `ts-expect-error` + explanation when unavoidable)

## Database Table Names (decisions)

- `system_messages` — system-generated user-facing messages (celebrations, encouragements). Previously `weekly_messages`
- `system_message_deliveries` — channel-level delivery audit. Previously `weekly_delivery_attempts`
- Drizzle exports: `systemMessages`, `systemMessageDeliveries`
- TS types: `SystemMessage`, `NewSystemMessage`, `SystemMessageDelivery`, `NewSystemMessageDelivery`

## Weekly Rhythms — Celebration UX

- Celebrations and encouragements are dismissed (soft delete via `dismissedAt`), never hard-deleted — history preserved in `system_messages`
- Dismissed messages accessible via `GET /api/weekly-rhythms/history`
- Celebrations do NOT appear in the main entry timeline — they live in `system_messages` only
- `tierApplied` is surfaced on the in-app card with a subtle "Richer celebrations available →" nudge for `stats_only` users

## Android (Capacitor)

The Android shell (`app/android/`) wraps the static Nuxt bundle. The devcontainer has **no Android SDK** — Gradle runs on the Windows host.

### Debug iteration loop (login / CORS / native WebView behaviour)

Use this when changes need to hit the real `https://tada.living` server.

**Step 1 — devcontainer:**
```bash
cd app
bun run android:sync    # nuxt generate (bakes API URL) + cap sync android
```

**Step 2 — Windows PowerShell:**
```powershell
cd path\to\tada\app
.\scripts\android-reinstall.ps1   # gradlew installDebug + adb launch
# or manually:
cd android && .\gradlew installDebug
```

Total round-trip per code change: ~1 minute. No GitHub Actions needed.

### Live Reload (day-to-day feature dev)

```bash
# devcontainer terminal 1
bun run dev

# devcontainer terminal 2
bun run android:dev    # prints the LAN URL + Windows commands to paste
```

Windows pastes the printed commands (`$env:CAP_SERVER_URL=...` + `cap sync` + `installDebug`). Subsequent JS/CSS changes push to the phone via HMR — no reinstall.

> Live Reload routes API calls through the local dev server, not `tada.living`. Use it for UI work; use the self-contained build for auth/cookie/CORS debugging.

### WebView details

- Origin: `https://app.tada.living` (hostname in `capacitor.config.ts`)
- API base: `https://tada.living` — baked in at `nuxt generate` time via `NUXT_PUBLIC_API_BASE_URL`
- Cross-origin credential flow: `SameSite=None; Secure` cookies + `credentials:"include"` fetch + `Access-Control-Allow-Credentials: true`
- `setAcceptThirdPartyCookies(true)` set in `MainActivity.java`

### Capacitor fetch architecture — critical rules

**Never set a global `baseURL` on `$fetch.create()`.**

The WebView origin is `app.tada.living` and the API server is `tada.living`. The temptation is to do `$fetch.create({ baseURL: "https://tada.living" })` globally, but this routes **all** `$fetch` calls — including Nuxt-internal `/_nuxt/builds/meta/` manifest checks — to `tada.living` instead of the local bundle. Once CORS is fixed for those paths the manifest fetch succeeds, but its build ID differs from the baked bundle, and **Nuxt enters a reload loop that freezes the UI** (buttons respond to touch but navigation never fires).

The correct pattern, enforced in `api-client.client.ts`:
```ts
$fetch.create({
  onRequest({ request, options }) {
    const url = typeof request === "string" ? request : String(request);
    if (apiBase && url.startsWith("/api/")) {
      options.baseURL = apiBase;       // only API calls go to tada.living
      options.credentials = "include"; // cross-origin session cookie
    }
    // /_nuxt/* stays same-origin → app.tada.living (the local bundle)
  },
})
```

**`experimental.appManifest: false` is set in `nuxt.config.ts`** — the app manifest check is meaningless for a baked Capacitor bundle and was the trigger for the reload loop. Do not re-enable it.

**IndexedDB writes must be fire-and-forget** — `IDBTransaction.oncomplete` can silently hang on some Android WebView versions. Always use `void cachePut(...).catch(() => {})`, never `await cachePut(...)`. If `cachePut` is awaited inside `onResponse`, the entire `$fetch` call hangs and any page that waits on the result shows a spinner forever.

## CI Pipeline (`.github/workflows/ci.yml`)

1. `bun install --frozen-lockfile`
2. `bunx nuxt prepare` — generates `.nuxt/` types (required before typecheck)
3. `bun run lint`
4. `bun run typecheck`
5. `mkdir -p data` — SQLite needs this directory to exist
6. `bun run test:run`
7. `bun run build`

**Why CI fails when local passes:** local dev server runs `nuxt prepare` automatically; CI starts cold. Always run `bunx nuxt prepare` if doing a clean local CI simulation.

## Design Documents

Read before making major changes:

- `design/SDR.md` — Software requirements (source of truth)
- `design/philosophy.md` — Vision and principles
- `design/ontology.md` — Entry types, categories, emojis
- `design/roadmap.md` — Feature roadmap
- `docs/dev/android-build-handover.md` — Full Android toolchain docs
