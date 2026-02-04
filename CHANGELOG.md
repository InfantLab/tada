# Changelog

All notable changes to Tada will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No unreleased changes_

## [0.4.0] - 2026-02-04

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

## [Unreleased]

### Planned for v0.2.0

- Category and emoji customization UI
- Rhythm tracking implementation with streak calculations
- Calendar heatmap visualization
- Data import (Insight Timer CSV, Meditation Helper SQLite)
- CSV export
- Timer profiles (save/load configurations)
- Toast notification system
- Offline sync with IndexedDB
- Push notifications for rhythm reminders

See [design/roadmap.md](design/roadmap.md) for full roadmap.

---

**Note:** v0.1.0 is the MVP release. All core infrastructure and entry management features are complete and functional.
