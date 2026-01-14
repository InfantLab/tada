# Changelog

All notable changes to Tada will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Timeline Scaling & Multi-Zoom Views (v0.2.1):**
  - Zoom toggle with Day/Week/Month/Year views
  - YearView: Shows yearly summary cards with tap-to-zoom into months
  - MonthView: Shows monthly summaries for selected year
  - WeekView: Shows weekly summaries
  - VirtualTimeline: Infinite-scrolling paginated entry list (100 entries/page)
  - JourneyBadge: Zoom-aware stats celebration (this week/month/year)
  - PeriodSummaryCard: Reusable component for period displays
  - TimelineHeader: Search, category filter, time range controls
  - Stats API (`/api/entries/stats`): Period-based statistics
  - Summary API (`/api/entries/summary`): Aggregated period data
  - Sticky zoom toggle that floats at top when scrolling
  - Text selection preserved on entry cards (click navigates only if no text selected)

- **Schema Simplification:**
  - Single `timestamp` field (NOT NULL) as canonical timeline position
  - Removed redundant `startedAt`, `endedAt`, `date` columns
  - Migration preserves existing data (COALESCE fallback)

- **Import Optimizations:**
  - Batch inserts (1000 rows at a time) instead of individual inserts
  - Batch duplicate checking with `inArray()` query
  - Import time reduced from ~115s to ~5-10s for 4800+ entries
  - Honest indeterminate progress bar while waiting for server
  - Recipe dropdown syncs when selecting from recipe cards
  - Download error log button for failed imports
  - Added `mindfulness` color tokens to Tailwind config

- **Timer Improvements (v0.2.0):**
  - Unified interval system with configurable duration, repeats (including "forever"), and bell sounds per interval
  - Collapsible accordion UI for interval configuration
  - Warm-up countdown display with negative numbers (-20, -19...) and "settling in" text
  - "No bells" toggle for unlimited silent sessions
  - Post-session modal for mood (1-5 scale) and reflection capture
  - Celebratory messaging on save: "You did 47m of Sitting!" instead of generic duration
  - Fixed vs Unlimited timer modes with overtime tracking
  - Gray out intervals after a "forever" repeating interval
  - Toggle-style switches for ending reflection/mood options
  - Bell rings counter display during session
- Test suite with working utility tests
  - Unit tests for categoryDefaults (13 tests, 100% coverage)
  - Unit tests for client & server logging (21 tests combined)
  - Test infrastructure with Vitest
  - CI integration - tests run automatically
  - Test stubs for v0.2.0 features (rhythms, auth, E2E)
  - Test documentation and guides

### Changed

- Timer now defaults to "Unlimited" count-up mode instead of countdown
- Timer settings panel redesigned with accordion-style collapsible sections
- Ending reflection and mood capture now use toggle switches instead of checkboxes
- GitHub CI now runs test suite (utils passing, API tests skipped)
- AGENTS.md updated to reflect testing setup

### Removed

- Timer countdown mode (replaced with Fixed/Unlimited count-up modes)
- Deprecated timer defaults (duration, bell sound) from Settings page
- Loop count selector (replaced with per-interval repeat configuration)

### Known Issues

- API endpoint tests temporarily skipped (need proper @nuxt/test-utils setup)
- See `app/tests/KNOWN_ISSUES.md` for details

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
