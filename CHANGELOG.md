# Changelog

All notable changes to Tada will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.0] - 2026-03-27

### Theme: Weekly Rhythms, Daily Timelines & Polish

Weekly review features that celebrate what you've done — never guilt what you haven't. Colourful daily timeline bars bring your day to life at a glance. Plus a round of UX polish across moments, help, and onboarding.

### Added

- **Daily Timeline Bar** ([Spec 010](specs/010-daily-timelines/spec.md)):
  - Per-card timeline indicator on each activity card in day view showing when the activity happened on a 24-hour line
  - Combined day strip above the card list showing all activities for the day overlaid on a single timeline
  - Category colour coding using the existing palette — consistent across cards, strip, and filter chips
  - Percentage-based positioning future-proofed for week/month/year zoom levels
  - Semi-transparent layering for overlapping timed entries, z-ordering for emoji markers
  - Responsive from 320px mobile to wide desktop — no charting library, pure CSS
  - Short entries (<5 min) and instant entries (ta-das, moments, tallies) display as dots

- **What's New popup**: first-time overlay for returning users when a new version is detected — highlights Weekly Celebrations and prompts opt-in with one tap

- **New-user defaults**: first-time users get sensible out-of-the-box settings so the app feels welcoming without configuration

- **Help page section subtitles**: each section now shows a visible one-line description beneath its heading (the "What is X?" answer), so users can scan the page without expanding accordions

- **Weekly Celebration Pipeline** ([Spec 009](specs/009-weekly-rhythms/spec.md)):
  - 4-tier celebration system: Stats Only, Private AI, Cloud AI Factual, Cloud AI Creative
  - Monday celebration generation (default 3:33am) with email delivery (default 8:08am)
  - Per-user timezone-aware scheduling for both generation and delivery
  - Weekly data aggregation: entry counts by type, session durations by category, week-over-week comparisons, personal records
  - Per-rhythm chain status (maintained, extended, bending, broken) and all-time milestone tracking
  - Celebrations adapt to users with 0 to N active rhythms

- **Thursday Mid-Week Encouragement**:
  - In-app dismissible banner with general progress encouragement and rhythm-specific stretch goals
  - Default delivery at Thursday 3:03pm in user's local timezone
  - Activity comparison against rolling 4-week averages
  - Optional push notification and email delivery
  - Positive, guilt-free messaging — quiet weeks acknowledged gently, never shamed

- **Email Delivery Infrastructure**:
  - HTML and plain text email rendering
  - Retry with exponential backoff on delivery failure
  - One-click unsubscribe link in every email
  - Bounce tracking with auto-disable after 3 consecutive failures
  - In-app-only delivery as alternative to email

- **Weekly Rhythms Settings UI**:
  - Settings panel with tier picker and plain-language privacy notices for cloud AI tiers
  - Independent toggles for Thursday encouragement and Monday celebration
  - Email address configuration with in-app-only option
  - All features off by default (opt-in only)

- **Components**:
  - `WeeklyRhythmsSettings.vue` — settings panel for weekly rhythm preferences
  - `WeeklyCelebrationCard.vue` — in-app celebration summary display
  - `WeeklyEncouragementBanner.vue` — dismissible Thursday encouragement banner
  - `WeeklyRhythmsCard.vue` — weekly rhythms overview card
  - `WeeklyTierPicker.vue` — tier selection with privacy descriptions
  - `useWeeklyRhythms` composable for client-side state management

- **API Endpoints**:
  - `GET /api/weekly-rhythms/current` — current week's celebration/encouragement
  - `GET /api/weekly-rhythms/history` — past celebrations
  - `POST /api/weekly-rhythms/messages/:id/dismiss` — dismiss in-app message
  - `POST /api/weekly-rhythms/preview` — preview celebration for current data
  - `GET /api/weekly-rhythms/settings` — get weekly rhythm preferences
  - `PUT /api/weekly-rhythms/settings` — update weekly rhythm preferences
  - `GET /api/weekly-rhythms/unsubscribe/:token` — one-click email unsubscribe

- **Database**: `weekly_rhythms` tables for settings, celebrations, encouragements, and email delivery tracking

- **80 new tests** covering celebration pipeline, encouragement generation, delivery service, cloud AI providers, stats aggregation, and message templates

### Fixed

- **Moments list false empty state**: entries saved as `type="moment"` were excluded by the initial page-load filter, causing "No moments yet" even when moments existed; unified the filter across load and refresh paths and bumped the API fetch limit to 100 to reduce pagination-related misses
- **Celebration quality**: milestone labels, active-day highlighting, record labels, and card UX sharpened based on real-world feedback
- **Rate limit handling**: improved error responses to surface wait time clearly

## [0.5.0] - 2026-03-10

### Theme: Housekeeping — Security, Testing, Infrastructure

A comprehensive housekeeping release. No new user-facing features — instead, a full security audit, dependency modernization, test coverage expansion, and infrastructure hardening across 33 audit items.

### Added

- **Admin API** ([Spec 008](specs/008-admin-api/spec.md)):
  - `GET /api/v1/admin/users` — list and search users with pagination
  - `GET /api/v1/admin/users/:id` — user detail with entry counts and last activity
  - `PATCH /api/v1/admin/users/:id` — update user roles and status
  - `GET /api/v1/admin/stats` — instance-wide statistics (users, entries, storage)
  - `GET /api/v1/admin/health` — detailed health check (DB, memory, uptime)
  - `GET /api/v1/admin/activity` — recent activity feed across all users
  - `GET /api/v1/admin/feedback` — view and manage user-submitted feedback
  - Role-based access control with `admin` role requirement

- **Sync API & Provider Framework** ([Spec 007](specs/007-sync-api/spec.md)):
  - `SyncProvider` interface — fourth module type for extensible integrations
  - `sync_mappings` table for tracking per-provider external IDs and sync state
  - Sync provider registry (`registerSyncProvider` / `getSyncProvider`)
  - Sync engine with pull/push orchestration and last-write-wins conflict resolution
  - `updated_since` and `include_deleted` query parameters on `GET /api/v1/entries`
  - `contentHash` computed field on entry API responses for cheap change detection
  - `GET /api/v1/sync/status` endpoint — server time, entry counts, per-provider stats
  - `POST /api/v1/sync/trigger` endpoint — trigger sync for a specific provider
  - `GET /api/v1/sync/mappings` endpoint — list/manage sync mappings
  - `sync:manage` API permission for sync operations
  - **Obsidian sync provider** — bidirectional sync of entries with Obsidian vault markdown files
  - `scripts/sync-obsidian.ts` CLI script for cron-based or manual vault sync
  - `.tada-sync.json` config file support for Obsidian sync

- **Screenshot carousel** on landing page with visual module documentation
- **CONTRIBUTING.md** — setup, workflow, conventions, and testing guide
- **Admin API documentation** added to API-SPECIFICATION.md
- **Playwright E2E tests** — 4 smoke tests with Playwright setup
- **Component tests** — 47 tests for login, forgot-password, reset-password pages

### Security

- **Lucia auth removed** — deprecated library replaced with ~160 lines of direct session management (removed `lucia`, `@lucia-auth/adapter-drizzle`, `oslo`)
- Session cookie `sameSite` set to `lax` and `httpOnly: true` (CSRF + XSS mitigation)
- **Security headers middleware**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS
- **SSRF protection** in link-preview endpoint (private IPv4/IPv6 blocking, metadata endpoint blocking)
- **Error response sanitization** — generic messages in production, detailed logs server-side only
- Increased password minimum from 6 to 8 characters
- CSV import size limits (5 MB / 50,000 rows)
- **Persistent rate limiting** — SQLite-backed via `rateLimits` table (survives restarts)

### Changed (Dependencies)

- **Nuxt** 3.15.1 → 4.4.2 (full Nuxt 4 migration)
- **Stripe** 17.5.0 → 20.4.1
- **TypeScript** 5.7.2 → 5.9.3
- **@libsql/client** 0.14.0 → 0.17.0
- **Zod** 3.23.8 → 4.3.6
- **@nuxt/test-utils** upgraded to 4.0
- **@vite-pwa/nuxt** upgraded to 1.1.1
- **@nuxt/eslint** upgraded to 1.15.2
- Removed `@nuxt/devtools` (bundled in Nuxt 4)

### Improved

- **Unified error response format** — all 73+ API endpoints now return structured `{ error: { code, message, details? } }` responses via shared helpers (`apiError`, `unauthorized`, `notFound`, `validationError`, etc.)
- **Structured logging** — request IDs on every request, `console.error` migrated to logger in server code
- **Test coverage** — 209 new tests: auth (38), entries (33), admin (26), sync engine (25), billing/Stripe (40), components (47)
- Fixed 7 previously failing logger tests
- Fixed Zod v4 `z.record()` calls across 7 files (now requires key schema argument)
- Replaced `db: any` with proper `Database` type in entryEngine.ts
- Cleaned up debug `console.log` statements from `useTranscription.ts` and `VoiceRecorder.vue`
- Updated all version references to v0.5.0
- Marked specs 001–005 as Completed
- Documentation updates across AGENTS.md, DEVELOPER_GUIDE, and docs/README

## [0.4.2] - 2026-03-05

### Added

- **Automated backup scripts** for CapRover (scheduled + on-demand)
- **Live-import script:** pull/push via `docker cp` (container-aware)
- **Fuzzy import deduplication** and API key management UI
- **Session recovery** for interrupted timed entries
- **Timeline search:** free-text date parsing ("march 2024", "march 4, 2024", "yesterday")
- **H3 event context type augmentation** (`types/h3.d.ts`) for typed `event.context.auth`

### Fixed

- **294 TypeScript and ESLint errors resolved** across 73 files while keeping `strict: true`:
  - Refactored API error helpers to return H3-compatible types (fixed 80 TS2345 errors)
  - Added proper type declarations for event context auth (fixed 45 TS4111 errors)
  - Fixed schema field mismatches in insight cache queries (actual bugs: `createdAt` → `computedAt`, `cacheKey` → `id`)
  - Fixed wrong `AuthEventType` value (`email_update` → `email_change`)
  - Removed reference to non-existent webhook `lastDeliveredAt` field
  - Replaced all `no-explicit-any` with proper types, removed unused vars
- **Voice journal mode:** Saving a journal entry from voice input now works (was calling a missing `createVoiceEntry` method)
- **Voice journal entries now set `category: "moments"`** with correct subcategory (dream/gratitude/journal/magic), fixing entries that previously had no category
- **Health endpoint:** `db.execute` → `db.run` fix
- **Ta-da save:** navigate to timeline after celebration (was staying on entry screen)
- **Rhythm chain cache:** invalidate on historical entry inserts (was only checking latest timestamp)
- **Production crash** from readonly runtimeConfig assignment
- **Server-side transcription** with hallucination filter and diagnostics
- **DevBanner** checks `window.location` instead of runtimeConfig

### Improved

- **Voice LLM extraction accuracy:**
  - Switched from single user-message to proper system + user message separation for all LLM providers
  - Added few-shot examples to guide the LLM on ambiguous input (including when to return empty tadas for non-accomplishment content)
  - LLM now extracts subcategories (e.g., "yoga" for movement, "cleaning" for life_admin)
  - Updated Anthropic provider to Claude Haiku 4.5 (from 3 Haiku)
- **Category alignment:** Rule-based fallback extractor now uses the correct 10-category ontology (was using legacy categories like "home", "fitness", "errands" that don't exist in the app)
- **Rhythm heatmap day popover:**
  - Clicking a day with entries now shows a list of all matching entries with emoji, name, duration, and links to edit each one (previously just showed "Activity logged")
  - "Add entry" button now opens the QuickEntryModal with the correct entry type for the rhythm (timed/tally/moment/tada) and date pre-filled (previously linked to generic /sessions page)
  - "Add entry" is now available on both empty and active days
- **BYOK settings UI** clarified — clearer what keys are needed and where to get them
- **Rhythm gap discovery:** tappable heatmap cells + gap hint text

### Removed

- Unused `EXTRACTION_PROMPT` constant from tadaExtractor (dead code; actual prompt lives in server endpoint)

## [0.4.0] - 2026-02-18

### Added

- **Cloud Platform (tada.living):**
  - Cloud mode detection (`TADA_CLOUD_MODE` env var or Stripe keys presence)
  - Stripe integration with checkout, webhooks, and customer portal
  - Subscription management with pay-what-you-want tiers (£12/year suggested)
  - Usage limits with 1-year rolling window for free tier
  - Email verification flow for cloud users
  - Account page (`/account`) for subscription and data management
  - Graceful archive notices for free tier users approaching limits

- **Expanded Ontology (10 categories):**
  - Added **Health** (💚): sleep, nutrition, hydration, medical, mental, recovery, self care
  - Added **Work** (💼): project, meeting, deadline, win, growth
  - Added **Social** (👥): family, friends, community, connection
  - Added **Life Admin** (🏠): cleaning, laundry, cooking, errands, finances, maintenance, admin
  - Renamed "Journal" → **Moments** (💭) with magic subcategory
  - Removed "Accomplishment" category (ta-das are entries, not a category)

- **Gentle Onboarding:**
  - Welcome overlay for first-time visitors
  - Getting Started card on home page for new users (first week)
  - Settings tour when visiting Settings page for the first time
  - Feature hints that appear contextually as users explore
  - First-time celebration messages (timer completion, dream logged, etc.)

- **Help & Support System:**
  - Help page (`/help`) with searchable FAQ across 6 categories
  - Contextual help panels (slide-in from `?` icon in header)
  - Page-specific help content for all major features
  - Bug report tool (`/feedback`) with optional system info
  - Feedback storage in database with status tracking
  - HelpLink component for direct links from relevant pages

- **Legal & Compliance (GDPR):**
  - Privacy policy page (`/privacy`)
  - Terms of service page (`/terms`)
  - Data Processing Agreement page (`/dpa`)
  - Cookie consent banner (cloud mode only)
  - Account deletion workflow with Stripe subscription cancellation
  - "Danger Zone" in account settings with confirmation dialog

- **Marketing & Content:**
  - Philosophy-driven landing page with value proposition
  - Blog foundation (`/blog`) with category filtering
  - Three philosophy articles: "Counting Up", "Identity Over Streaks", "Graceful Rhythms"
  - Newsletter signup with database storage
  - SEO optimization (OG tags, Twitter cards, canonical URLs)
  - Dedicated registration page (`/register`)

- **Developer Experience:**
  - Dev environment banner (prevents production data confusion)
  - Account management section in Settings page
  - Health check endpoint at `/api/health`

### Changed

- Updated app version to 0.4.0
- Updated Creative category emoji: 🎵 → 🎨
- Contact emails updated to infantologist@gmail.com
- Auth middleware updated for new public pages (blog, help, legal)

### Fixed

- Stripe billing checkout (correct price ID env var mapping for pay-what-you-want tiers)
- Stripe webhook processing (use `constructEventAsync` for Bun runtime compatibility)
- Stripe API 2026-01-28 compatibility (`current_period_end` field relocation)
- Newsletter subscribe endpoint (correct database import)
- Supporter welcome email now personal and warm, signed by Caspar
- All subscription lifecycle emails have personal sign-offs
- Email reply-to set to Caspar's address for direct replies
- Health endpoint version updated to 0.4.0
- Dockerfile COPY command no longer includes .git directory
- Various TypeScript strict mode improvements

### Removed

- Deprecated `/add` page (replaced by inline capture on each entry type page)
- Unused composables and components from v0.2.0 refactoring

## [0.3.0] - 2026-01-27

### Added

- **Voice Input Across All Entry Pages:**
  - Voice recording with automatic transcription (Web Speech API + Whisper fallback)
  - Voice input on Ta-Da!, Moments, Tally, and Sessions pages
  - Server-side Whisper transcription via Groq API
  - LLM structure extraction for ta-das (Groq/OpenAI/Anthropic)
  - Rate limiting (1 request/10 seconds) with helpful wait time messages
  - VoiceRecorder component with autostart capability
  - VoiceTallyRecorder for count-based voice input
  - Pending review panel for voice-extracted entries

- **Magic Moments:**
  - New "magic" subcategory for moments
  - Smart text splitting (title/notes) from voice transcription
  - LLM-based journal type detection
  - Celebration overlay with sound and confetti
  - Per-item subcategory selectors

- **Sessions Improvements:**
  - Voice reflection capture post-session (green mic button with autostart)
  - Bell sound preview when selecting chimes
  - Last-used preset remembered (saved to localStorage)
  - Preset repeats now saved and loaded correctly
  - Save options modal for overtime sessions (fixed vs total time)
  - Skip button now properly discards sessions without saving
  - Clockwise circle animation (finally fixed!)

- **Tally Voice Input:**
  - Voice-to-tally extraction ("10 push-ups, 12 squats")
  - Pending review panel with per-item category selectors
  - Rule-based extraction with LLM fallback

- **Database Stability:**
  - Database moved outside watched directory (dev: `/workspaces/tada/data/`)
  - Fixed EINVAL errors and server crashes from SQLite journal file watcher conflicts
  - Enhanced Vite/Nitro watcher configuration
  - Database retry logic for transient errors
  - Graceful error handling utilities

- **Reusable Components:**
  - `CelebrationOverlay.vue` - Celebration UI with sound and confetti
  - `VoiceRecorder.vue` - Voice recording with progress and transcription
  - `VoiceTallyRecorder.vue` - Tally-specific voice input

### Changed

- Timer circle animation now fills/empties clockwise (used Vue :key for proper resets)
- Voice recorder UX simplified (green button + autostart, no toggle)
- Rate limit messages now show seconds remaining
- All pages updated with consistent error handling
- Improved subcategory guessing from voice input

### Fixed

- Timer circle no longer animates backwards between intervals
- Skip button on sessions no longer saves the session
- Save duration now uses actual elapsed time instead of preset target
- Preset API endpoint corrected (`/api/presets` not `/api/timer-presets`)
- Voice transcription handles network errors gracefully
- Database watcher conflicts resolved (moved outside app/ directory)

### Developer Experience

- Added comprehensive error handling utilities (`utils/errorHandling.ts`)
- Added database management layer (`server/db/manager.ts`, `operations.ts`)
- Migration script for database location change
- Dev container improvements (zsh, starship, fzf, ripgrep)
- 18+ new unit tests for error handling
- Documentation: DATABASE_LOCATION_MIGRATION.md, ERROR_HANDLING.md

## [0.2.0] - 2026-01-22

### Added

- **Graceful Rhythms System:**
  - New `/rhythms` page for tracking natural patterns and chains
  - Multiple chain types: Daily, Weekly High (5+ days), Weekly Low (3+ days), Weekly Target, Monthly Target
  - `RhythmChainTabs` component for viewing all chain types with tab navigation
  - `RhythmBarChart` with 28-day histogram and historical navigation
  - `RhythmYearTracker` GitHub-style heatmap with year navigation
  - `RhythmMonthCalendar` for monthly view
  - `RhythmEncouragement` with journey stages and motivational messages
  - Journey stages based on total hours: Starting (<10h) → Building (10-100h) → Becoming (100-1000h) → Being (1000h+)
  - Tier system: Starting → Steady (3 days) → Strong (5 days) → Daily (7 days)
  - Chain caching for efficient progress calculations
  - Encouragement messages table with context-aware selection

- **Timer Presets:**
  - Save and load timer configurations (category, subcategory, duration, bells)
  - Interval info displayed in preset summaries (e.g., "6m bells")
  - Low-friction duplicate handling: replace existing preset with confirmation
  - Settings page preset management with rename and delete

- **Timer Improvements:**
  - Unified interval system with configurable duration, repeats (including "forever"), and bell sounds
  - Mode auto-derived from intervals (Forever = unlimited, otherwise = fixed)
  - Removed Mode selector UI (simplified)
  - Shows "Unlimited" instead of "Open-ended" for forever presets
  - Collapsible accordion UI for interval configuration
  - Warm-up countdown with "settling in" text
  - Post-session modal for mood and reflection capture
  - Bell rings counter during session

- **Ta-Da! Celebration**: Post-save celebration page with confetti, sound effects, streaks
- **Universal Entry Editing**: Edit any entry type from entry detail page
- **Custom Emojis**: Personalize category and subcategory icons in Settings
- **Entry Type Visibility**: Show/hide entry types from journal
- **Hide Categories**: Toggle visibility of timer categories
- **Undo Support**: "Undo" action in deletion toast with 5-15 second window
- **Delete Category Data**: Bulk delete all entries in a category
- **Toast Notifications**: App-wide toast system with action buttons

- **Timeline Scaling & Multi-Zoom Views:**
  - Zoom toggle with Day/Week/Month/Year views
  - YearView, MonthView, WeekView summary components
  - VirtualTimeline: Infinite-scrolling paginated entry list
  - JourneyBadge: Zoom-aware stats celebration
  - Stats API and Summary API for period-based data

- **CSV Import System:**
  - Import wizard with column mapping and preview
  - Built-in Insight Timer recipe
  - Custom recipe saving with version history
  - Batch imports (1000 rows at a time)
  - Auto-deduplication with external IDs

- **Schema Simplification:**
  - Single `timestamp` field as canonical timeline position
  - Removed redundant date columns

- **Test Suite:**
  - 133+ unit tests passing
  - Tests for categoryDefaults, logging, error tracking
  - Vitest infrastructure with CI integration

### Changed

- Timer defaults to "Unlimited" count-up mode
- Timer Mode is now auto-derived from interval configuration
- Journey stage calculation now based on total practice hours (not weeks)
- Chain statistics cached and invalidated on new entries
- GitHub CI runs full test suite

### Fixed

- Timer preset 600 minutes bug (was using raw targetMinutes instead of calculating from intervals)
- TypeScript strict mode issues with ChainUnit import and array guards
- Duplicate preset names now handled gracefully with replace confirmation

### Removed

- Mode selector from timer settings (auto-derived from intervals)
- Deprecated timer defaults from Settings page

## [0.1.0] - 2026-01-11

### Added

**Core Infrastructure:**

- Nuxt 3 + Vue 3 + TypeScript project scaffolding
- SQLite database with Drizzle ORM
- Lucia Auth authentication system with password-based login
- Database migrations system
- PWA configuration with offline support
- Docker setup with production and development profiles
- Structured logging system (`createLogger`)
- Error handling middleware

**Entry Ontology System:**

- Three-level entry classification (type → category → subcategory)
- Seven default categories with emojis and colors:
  - 🧘 Mindfulness (purple)
  - 🏃 Movement (green)
  - 🎵 Creative (amber)
  - 📚 Learning (blue)
  - 📝 Journal (indigo)
  - ⚡ Accomplishment (yellow)
  - 🎭 Events (pink)
- Category defaults configuration (`app/utils/categoryDefaults.ts`)
- Entry emoji customization with full system emoji picker
- Reusable `EmojiPicker` component using emoji-picker-element

**API Endpoints:**

- `GET /api/entries` - List all entries
- `POST /api/entries` - Create entry with category/subcategory/emoji
- `GET /api/entries/[id]` - Get single entry
- `PATCH /api/entries/[id]` - Update entry (including emoji)
- `DELETE /api/entries/[id]` - Delete entry
- `GET /api/health` - Health check
- Authentication endpoints (login, register, logout, session)

**User Interface:**

- **Timeline** (`/`) - Chronological entry feed with emoji badges and category colors
- **Timer** (`/timer`) - Meditation/activity timer with:
  - Category and subcategory selection
  - Countdown and unlimited modes
  - Configurable start and end bells (5 sound options)
  - Wake Lock API support (keeps screen on)
  - Settings persistence in localStorage
  - Loop/repeat functionality
  - Large emoji display during session
- **Add Entry** (`/add`) - Quick capture for:
  - ⚡ Tada accomplishments (with subcategory picker)
  - 🌙 Dreams
  - 📝 Notes
  - 🙏 Gratitude
- **Journal** (`/journal`) - Filtered view of journal-type entries with emoji editing
- **Rhythms** (`/rhythms`) - Placeholder page for v0.2.0
- **Settings** (`/settings`) - JSON data export, bell configuration, authentication
- **Login/Register** (`/login`) - User authentication

**Data Export:**

- JSON export of all user entries
- Downloadable via Settings page

### Technical Details

**Stack:**

- Nuxt 3.15.1
- Vue 3
- TypeScript (strict mode)
- Bun 1.3.5
- SQLite + Drizzle ORM
- Tailwind CSS
- Lucia Auth v3

**Database Schema:**

- `users` - User accounts
- `sessions` - Authentication sessions
- `entries` - Unified entry model with type/category/subcategory/emoji
- `rhythms` - Rhythm definitions (placeholder for v0.2.0)
- `timer_presets` - Saved timer configurations
- `category_settings` - User category customization (schema ready, UI in v0.2.0)
- `attachments` - Entry attachments (placeholder for v0.2.0)

**Development Features:**

- ESLint with strict TypeScript rules
- Automated code formatting
- Drizzle Studio for database inspection
- Dev container support
- Hot module reloading
- Git SSH agent forwarding in dev container

### Design & Documentation

- Complete software design requirements (SDR.md)
- Design philosophy document
- Technical decision records
- Detailed ontology documentation
- Visual design guidelines
- Comprehensive roadmap (v0.1.0 - v0.3.0+)
- Developer guide with troubleshooting
- Agent instructions for AI-assisted development
- Project structure documentation

### Known Limitations

- Rhythm tracking UI is placeholder only (coming in v0.2.0)
- No offline sync (PWA works but doesn't cache data locally)
- Single-user per instance (no multi-tenant support)
- Error messages use `alert()` dialogs (toast system in v0.2.0)
- No automatic backfill of category/subcategory for pre-v0.1.0 entries
- Subcategory collision in flat lookup (e.g., "walking" appears in multiple categories)

### Security

- Password-based authentication with Lucia Auth
- Session-based authorization
- SQLite database with per-user data isolation
- CSRF protection via session tokens

---

See [design/roadmap.md](design/roadmap.md) for full roadmap.
