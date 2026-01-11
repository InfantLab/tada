# Tada - Design Decisions

**Status:** Living document  
**Updated:** January 9, 2026

Decisions made during design, with rationale. This complements the SDR.

---

## Architecture

### Platform: PWA (Not Native Mobile)

**Decision:** Build as a Progressive Web App, not a native iOS/Android app.

**Rationale:**

- No App Store overhead or approval process
- Single codebase for all platforms
- Self-hosters can deploy easily
- "Install to home screen" gives app-like experience
- Offline support via Service Worker

**Trade-offs accepted:**

- iOS background execution is limited (timers may pause when screen off)
- Push notifications require PWA to be installed
- No App Store discoverability

**Mitigation:** Save timer state frequently; resume gracefully on reopen.

---

## Technology Stack

### Language: TypeScript (Strict Mode)

**Decision:** TypeScript everywhere—frontend, backend, shared types.

**Rationale:**

- One language for entire stack
- Type safety catches bugs at compile time
- Excellent tooling and IDE support
- Huge ecosystem for web development

**Alternatives considered:**

- Rust: Great but steep learning curve, smaller web ecosystem
- Go: No frontend story
- Python: Weak typing, GIL issues for concurrency

---

### Framework: Nuxt 3 + Vue 3

**Decision:** Nuxt 3 as the full-stack framework.

**Rationale:**

- Excellent PWA support via `@vite-pwa/nuxt`
- Vue's reactivity model is cleaner than React hooks
- SSR/SSG flexibility
- Nuxt UI provides good component library
- One framework for both server and client

**Alternatives considered:**

- Next.js: More boilerplate, PWA requires extra setup
- SvelteKit: Smaller ecosystem
- Remix: Less PWA-focused

---

### Database: SQLite + PostgreSQL (via Drizzle ORM)

**Decision:** SQLite for self-hosted, PostgreSQL for cloud.

**Rationale:**

- SQLite: Zero config, single file backup, perfect for self-hosting
- PostgreSQL: Robust multi-tenant support for cloud
- Drizzle ORM: Same TypeScript code works with both

**Trade-off:** SQLite has concurrency limits, but single-user self-hosted doesn't need high concurrency.

---

### PWA: Vite PWA + Workbox

**Decision:** `@vite-pwa/nuxt` with Workbox for service worker.

**Caching strategy:**

- Cache-first for static assets (JS, CSS, images, audio)
- Network-first for API calls
- IndexedDB for offline data (via Dexie.js)

**iOS timer handling:**

- Web Worker for timing (survives tab backgrounding on Android/desktop)
- Save state to IndexedDB every second
- Resume gracefully if app was killed
- Push notification on completion (iOS 16.4+ with installed PWA)

---

### Auth: Lucia Auth

**Decision:** Lucia Auth for session management.

**MVP:** Password-only authentication (no email required).

**Future:**

- OAuth (Google, GitHub) for cloud service
- Passkeys/WebAuthn as modern alternative
- Magic links (requires SMTP)

**Password hashing:** Argon2id (not bcrypt—more resistant to GPU attacks).

---

## Security & Encryption

### Encryption Strategy

**Decision:** Encrypted at rest (MVP), optional end-to-end encryption (future).

**MVP approach:**

- All data encrypted at rest (SQLite encryption or volume-level)
- HTTPS enforced everywhere
- Server _could_ technically read data, but won't
- Password recovery is possible

**Future addition (opt-in "Zero-Knowledge Mode"):**

- All data encrypted client-side before transmission
- Derived key from password using Argon2id
- Server sees only encrypted blobs
- Clear warning: password loss = data loss
- Some features disabled (server-side search, email summaries)

**Rationale:**

- E2EE adds significant complexity
- Password recovery is important for most users
- Honest position: "Encrypted at rest. We won't look, but we could. For maximum privacy, enable Zero-Knowledge Mode."

---

### Security Measures

| Measure            | Implementation                         |
| ------------------ | -------------------------------------- |
| HTTPS everywhere   | Enforced by CapRover/Caddy             |
| Encrypted at rest  | SQLite encryption or volume encryption |
| Password hashing   | Argon2id                               |
| Session management | Secure, HttpOnly cookies               |
| Rate limiting      | Prevent brute force                    |
| Audit logging      | Log access, not content                |
| GDPR compliance    | Full export, full delete on request    |

---

## Hosting & Deployment

### Domain

**Decision:** `tada.living` (owned)

**Development:** `onemonkey.org` (existing server)

**Production:** Hetzner VPS with CapRover

---

### Name

**Decision:** Tada (pronounced "ta-da!")

**Fun facts:**

- Anagram of "data"
- Backronym: "Things Already Done, Always" or "Track Activities, Discover Achievements"
- Captures the celebration of accomplishment

---

### Multi-User From Start

**Decision:** Design for multiple users from the beginning, even for self-hosted.

**Rationale:**

- Avoids painful refactor later
- Family/household use case
- Cloud service needs it anyway

**MVP approach:** Single-user mode with optional password. Multi-user infrastructure present but not exposed in UI until needed.

---

### Authentication: Low Friction for Self-Hosters

**Decision:** Prioritize simple auth that doesn't require external services.

**Options (in order of preference for self-hosted):**

1. **Password only** - No email required, works offline
2. **Passkeys/WebAuthn** - Modern, secure, no email (browser support varies)
3. **Magic links** - Requires SMTP setup (higher barrier)

**MVP:** Optional password protection. No password = single-user open access.

**Cloud:** Will add OAuth (Google, GitHub) and magic links.

---

## Data Model

### Entry Ontology: Type vs Category vs Subcategory

**Decision:** Three-level classification system for entries.

| Field         | Purpose                   | Examples                        |
| ------------- | ------------------------- | ------------------------------- |
| `type`        | Data structure + behavior | `timed`, `tada`, `journal`      |
| `category`    | Life domain               | `mindfulness`, `accomplishment` |
| `subcategory` | Specific activity         | `sitting`, `work`, `piano`      |

**Rationale:**

- `type` was overloaded to mean both structure and domain
- Separating them enables: consistent behavior (type) + domain grouping (category) + specificity (subcategory)
- Inspired by Apple HealthKit (activity type + workout type) and Strava (type + sport_type)

**Trade-off:** More fields to populate, but clearer semantics and better queryability.

See [ontology.md](ontology.md) for full details.

---

### Tada as a First-Class Type

**Decision:** `tada` is a distinct entry type, not `type: "journal", category: "accomplishment"`.

**Rationale:**

- Tada is the app's namesake and philosophical foundation
- Distinct behavior: quick capture, voice input, significance levels, calendar view
- Distinct data schema: `TadaData` has `significance`, `voiceTranscription`
- Philosophical distinction: extrospective (what I did) vs introspective (what I felt)

---

### Emoji System

**Decision:** Every category and subcategory has a default emoji. Entries can override.

**Resolution order:**

1. Entry-level override (`entry.emoji`)
2. Subcategory default
3. Category default
4. Fallback (📌)

**Rationale:**

- Emojis provide instant visual recognition across timeline, timer, calendars
- Distinctive at small sizes, semantically clear, cross-platform
- User customization deferred to v0.2.0

---

### Category Colors

**Decision:** Each category has an assigned color for UI consistency.

| Category         | Color            |
| ---------------- | ---------------- |
| `mindfulness`    | Purple (#7C3AED) |
| `movement`       | Green (#059669)  |
| `creative`       | Amber (#D97706)  |
| `learning`       | Blue (#2563EB)   |
| `journal`        | Indigo (#6366F1) |
| `accomplishment` | Yellow (#F59E0B) |
| `events`         | Pink (#EC4899)   |

**Usage:** Timeline badges, chart segments, habit calendars.

---

## Development Workflow

### Monorepo Structure

**Decision:** Single repository containing app, plugins, and documentation.

```
tada/
├── app/                 # Nuxt 3 application
├── plugins/             # Official plugins
│   ├── insight-timer/
│   ├── strava/
│   └── ...
├── design/              # SDR, philosophy, decisions
├── .devcontainer/       # VS Code dev container config
├── .github/workflows/   # GitHub Actions
└── docker/              # Dockerfile, compose files
```

**Rationale:**

- Simpler dependency management
- Plugins can share types/utilities
- Single PR for coordinated changes
- Easier for contributors

---

### Dev Containers

**Decision:** Use VS Code Dev Containers for all development.

**Benefits:**

- Consistent environment for all contributors
- No "works on my machine" issues
- Pre-configured Node, Docker, extensions
- New contributors productive in minutes

**Setup:** `.devcontainer/devcontainer.json` with Node 20, Docker-in-Docker, recommended extensions.

---

### GitHub Actions CI/CD

**Decision:** Automate build and publish via GitHub Actions.

**Workflows:**

1. **On PR:** Lint, test, build (no publish)
2. **On push to main:** Build + push Docker image to `ghcr.io`
3. **On release tag:** Build + push with version tag

**Deployment:** CapRover pulls from `ghcr.io/yourname/tada:latest`

---

## Data & Storage

### Timezone Handling

**Decision:** Store UTC timestamps + original timezone.

```typescript
interface Entry {
  startedAt: string; // "2026-01-09T06:00:00Z" (always UTC)
  timezone: string; // "Europe/London" (where user was)
}
```

**Display rules:**

- Default: Show in user's _current_ timezone
- Option: Show in _original_ timezone ("as experienced")
- Date-only entries: No timezone complexity

**Streak calculation:** Based on calendar date in user's configured timezone.

**Rationale:**

- "I meditated at 6am in Tokyo" stays meaningful
- UTC storage avoids DST bugs
- Timezone field preserves context

---

### Attachments Storage

**Decision:** Filesystem storage with database references.

```
data/
├── db.sqlite
└── attachments/
    └── {entry-id}/
        ├── photo.jpg
        └── recording.m4a
```

**Rationale:**

- Simple for self-hosters (just back up the `data/` folder)
- SQLite doesn't bloat with binary data
- Easy to browse/debug

**Cloud:** Will use S3-compatible storage, same reference pattern.

---

## Audio

### Bell Sounds (CC0 Licensed)

**Decision:** Use Freesound.org CC0 recordings.

| Use        | Sound                           | Freesound ID                              | Duration |
| ---------- | ------------------------------- | ----------------------------------------- | -------- |
| Start bell | Bright Tibetan Bell Ding B Note | [346328](https://freesound.org/s/346328/) | 15s      |
| End bell   | Tibetan Singing Bowl            | [398285](https://freesound.org/s/398285/) | 72s      |
| Interval   | Singing Bowl Female Overtone    | [449952](https://freesound.org/s/449952/) | 12s      |
| Backup     | Tibetan bowl center hit         | [421829](https://freesound.org/s/421829/) | 19s      |

**License:** CC0 (no attribution required, commercial use OK)

**Format:** Download as WAV, convert to AAC for distribution (smaller files, good quality).

---

## Deferred Decisions

These will be revisited later:

| Topic                            | Notes                                                 |
| -------------------------------- | ----------------------------------------------------- |
| **Category/subcategory editing** | v0.2.0: Settings UI for customizing emojis and colors |
| **Subcategory auto-complete**    | v0.2.0: Remember user-added subcategories             |
| **Multi-category entries**       | v0.2.0+: Allow entries in multiple categories         |
| **Custom entry types**           | v0.3.0+: Modular type definitions                     |
| **Data model: Threads/Links**    | Revisit when building "connections" in Phase 4        |
| **Data model: Entities**         | Decide scope when building Books/People plugins       |
| **Sync conflict resolution**     | Decide when implementing multi-device sync            |
| **LLM provider**                 | Decide when adding voice transcription                |
| **E2EE implementation details**  | Decide when adding Zero-Knowledge Mode                |

---

## Import Strategy

**Decision:** Defer import implementation. User will provide sample data.

**Data location:** `./old_data/` folder for sample exports

**Importers to build (priority order):**

1. Insight Timer CSV
2. Meditation Helper SQLite
3. Strava GPX
4. Generic CSV

---

_Update this document as decisions are made._
