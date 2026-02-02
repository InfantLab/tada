# Ta-Da! - Changelog

All notable changes to Ta-Da! will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-02-02

### Added - REST API v1 Release

Complete REST API v1 implementation with 24 endpoints across 7 user stories (220 tasks completed).

**See REST API v1.0.0 details below for full feature list.**

### Changed

- Health check endpoint now returns both app version (`0.3.1`) and API version (`1.0.0`)
- Updated deployment documentation to prioritize CapRover deployment
- Added comprehensive REST API deployment guide

### Documentation

- Created `/docs/DEPLOYMENT.md` - Comprehensive deployment guide (CapRover-focused)
- Created `/docs/tada-api/CHANGELOG.md` - This file
- Updated `/docs/DEPLOY_CAPROVER.md` - Original CapRover guide (now references main guide)

---

## REST API [1.0.0] - 2026-02-02

### Added - REST API Initial Release

#### Phase 1-2: Foundation (15 tasks)
- Database schema with entries, rhythms, users, api_keys, webhooks, insight_cache tables
- API key authentication with bcrypt hashing (cost factor 12)
- Session-based authentication support
- Rate limiting with in-memory LRU cache (100/min standard, 10/min export, 5/min patterns)
- Permission system (entries:read, entries:write, rhythms:read, etc.)
- Standard response formatting utilities
- Comprehensive error handling

#### User Story 1: Data Retrieval - OpenClaw MVP (25 tasks)
- `GET /api/v1/entries` - List entries with filtering, pagination, sorting
  - Filter by: date, start/end, type, category, subcategory, tags, search
  - Pagination: limit (1-1000, default 100), offset
  - Sort by: timestamp, createdAt, durationSeconds (asc/desc)
- `GET /api/v1/entries/{id}` - Get single entry
- `GET /api/v1/rhythms` - List rhythms with streak calculations
  - Streak tracking: current, longest, lastCompleted, startedAt
  - Period stats: today, thisWeek, thisMonth, allTime
  - Session counts, total minutes, average duration

#### User Story 2: Voice Entry Creation (25 tasks)
- `POST /api/v1/entries` - Create new entry
  - Type-specific validation (timed, tada, tally, moment)
  - Auto-sets source: "api"
  - Supports: durationSeconds, tags, notes, custom data
- `PATCH /api/v1/entries/{id}` - Update entry
  - Partial updates supported
  - Protected fields: id, userId, createdAt
- `DELETE /api/v1/entries/{id}` - Soft delete entry
  - Sets deletedAt timestamp (not hard delete)
- `POST /api/v1/entries/bulk` - Bulk operations
  - Max 100 operations per request
  - Atomic success/failure reporting
  - Operations: create, update, delete

#### User Story 3: API Key Management (23 tasks)
- `GET /api/v1/auth/keys` - List user's API keys (session auth required)
  - Returns masked keys (prefix only)
  - Shows: name, created, lastUsed, permissions, expiresAt
- `POST /api/v1/auth/keys` - Generate new API key (session auth required)
  - Format: `tada_key_[32 random chars]`
  - Returns plaintext key ONCE with warning
  - Granular permissions
  - Optional expiration date
- `DELETE /api/v1/auth/keys/{id}` - Revoke API key (session auth required)
  - Soft delete (sets revokedAt)
  - Immediate invalidation

#### User Story 4: Real-time Webhooks (28 tasks)
- `GET /api/v1/webhooks` - List webhooks (session auth required)
  - Shows delivery stats: totalDeliveries, failedDeliveries, lastDeliveredAt
  - Calculates failure rate
- `POST /api/v1/webhooks` - Register webhook (session auth required)
  - HTTPS only (HTTP rejected)
  - Private IP validation (127.0.0.1, 192.168.*, 10.*, 172.16-31.* blocked)
  - HMAC-SHA256 payload signing
  - Event subscriptions: entry.created, entry.updated, entry.deleted, streak.milestone, etc.
- `PATCH /api/v1/webhooks/{id}` - Update webhook
  - Can update: url, events, active status
- `DELETE /api/v1/webhooks/{id}` - Delete webhook
- `POST /api/v1/webhooks/{id}/test` - Test webhook delivery
  - Returns delivery result with status code
- Webhook delivery features:
  - Exponential backoff retry: 1s, 5s, 25s (3 attempts max)
  - Auto-disable on sustained failures (>50% over 20 attempts)
  - 30-second timeout
  - Fire-and-forget (non-blocking)
  - Headers: X-Webhook-Signature, X-Webhook-Event, X-Webhook-ID

#### User Story 5: Obsidian Export (26 tasks)
- `GET /api/v1/export/entries` - Multi-format export
  - Formats: json, csv, markdown
  - Filters: date, start/end, type, category
  - Content-Type headers set appropriately
  - CSV with proper escaping
- `GET /api/v1/export/obsidian` - Obsidian-specific export
  - Templates: daily, weekly, monthly
  - YAML frontmatter with metadata
  - Organized sections: accomplishments, rhythms, breakdown
  - Content-Type: text/markdown

#### User Story 6: Pattern Discovery (34 tasks)
- `GET /api/v1/insights/patterns` - Automated pattern detection
  - Types: correlation, temporal, trend, sequence
  - Pearson correlation coefficient for habit correlations
  - Weekday pattern analysis
  - Linear regression for duration trends
  - Antecedent-consequent sequence detection
  - Confidence levels: high/medium/low
  - Statistical evidence: sample sizes, r-values, occurrences
  - 1-hour cache TTL for performance
  - Lookback: 7-365 days (default 90)
- `GET /api/v1/insights/correlations` - Specific correlation analysis
  - Compare any two variables
  - Returns: coefficient, interpretation, visualization suggestions
- `GET /api/v1/insights/summary` - Period-based summaries
  - Periods: today, week, month, year, custom
  - Aggregates: total entries, unique categories, total duration
  - Breakdown by type and category
  - Daily averages

#### User Story 7: Historical Data Import (27 tasks)
- `POST /api/v1/import/csv` - Generic CSV import
  - Custom field mapping
  - Dry-run mode (preview without creating)
  - Row-by-row validation with error reporting
  - Duplicate detection by timestamp + category
  - Skip or update duplicates
  - Sets source: "import"
- `POST /api/v1/import/insight-timer` - Insight Timer preset
  - Pre-configured field mapping
  - Converts duration minutes to seconds
  - Preserves meditation history and streaks
- `POST /api/v1/import/json` - JSON import
  - Validates array of entries
  - Same validation and duplicate detection as CSV

#### Phase 10: Polish & Production Readiness (17 tasks)
- `GET /api/v1/health` - Health check endpoint
  - Returns: status, version, timestamp, database, cache stats
  - Used by monitoring and load balancers
- API versioning headers
  - All responses include: `X-API-Version: 1.0`
- Rate limit headers
  - All responses include: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
  - 429 responses include: Retry-After
- CORS configuration
  - Configurable via CORS_ALLOWED_ORIGINS env var
  - Supports credentials
  - Preflight OPTIONS handling
- Cache cleanup utility
  - Removes expired insight cache entries (1+ hour old)
  - Can clean entries older than N days
  - Cache statistics endpoint
- Comprehensive deployment documentation
  - Environment variables
  - Database setup and migrations
  - Deployment options (Node/Bun, Docker, Serverless)
  - Security checklist
  - Maintenance procedures
  - Troubleshooting guide

### Security Features
- bcrypt API key hashing (cost 12)
- HMAC-SHA256 webhook signatures
- Private IP blocking for webhooks
- HTTPS enforcement for webhooks
- Granular permission system
- Rate limiting per endpoint type
- SQL injection prevention (parameterized queries)
- Soft deletes (preserves data)

### Performance Features
- Database indexes on critical queries
- Pattern detection caching (1-hour TTL)
- Rate limiting with LRU cache
- Paginated responses (max 1000 items)
- Async webhook delivery (non-blocking)

### API Endpoints Summary
Total: 24 endpoints across 7 user stories

**Authentication** (3):
- GET /api/v1/auth/keys
- POST /api/v1/auth/keys
- DELETE /api/v1/auth/keys/{id}

**Entries** (5):
- GET /api/v1/entries
- GET /api/v1/entries/{id}
- POST /api/v1/entries
- PATCH /api/v1/entries/{id}
- DELETE /api/v1/entries/{id}
- POST /api/v1/entries/bulk

**Rhythms** (1):
- GET /api/v1/rhythms

**Webhooks** (5):
- GET /api/v1/webhooks
- POST /api/v1/webhooks
- PATCH /api/v1/webhooks/{id}
- DELETE /api/v1/webhooks/{id}
- POST /api/v1/webhooks/{id}/test

**Export** (2):
- GET /api/v1/export/entries
- GET /api/v1/export/obsidian

**Insights** (3):
- GET /api/v1/insights/patterns
- GET /api/v1/insights/correlations
- GET /api/v1/insights/summary

**Import** (3):
- POST /api/v1/import/csv
- POST /api/v1/import/insight-timer
- POST /api/v1/import/json

**System** (1):
- GET /api/v1/health

### Development Stats
- **Total Tasks**: 220 (100% complete)
- **Implementation Time**: ~1 session
- **Test Coverage**: Comprehensive unit and integration tests for all features
- **Documentation**: Complete API reference, deployment guide, changelog

## Future (v2.0) - Planned

### Potential Enhancements
- GraphQL API support
- WebSocket support for real-time updates
- Bulk export to multiple formats simultaneously
- Advanced pattern detection (machine learning)
- Custom webhook retry policies
- API key scopes (more granular than permissions)
- OAuth2 support for third-party apps
- Webhook signature verification helpers
- Rate limit customization per API key
- API usage analytics dashboard

### Breaking Changes (for v2.0)
None planned - v1.0 is stable API contract

## Migration Guides

### From Beta/Alpha to v1.0
No migration needed - this is the first stable release.

### Upgrading to Future Versions
Will be documented when v2.0 is released.

## Support

- API Documentation: https://docs.tada.app/api
- GitHub Issues: https://github.com/yourusername/tada/issues
- Deployment Guide: See DEPLOYMENT.md
- Changelog: This file

---

**Note**: Version numbers follow Semantic Versioning (MAJOR.MINOR.PATCH)
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes (backwards compatible)
