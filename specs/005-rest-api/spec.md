# Feature Specification: Ta-Da! REST API

**Feature Branch**: `005-rest-api`
**Created**: 2026-02-01
**Status**: Draft
**Input**: User description: "REST API for external integrations to read and write Ta-Da! life activity data with authentication, rate limiting, and webhooks"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - OpenClaw Daily Summary (Priority: P1)

An OpenClaw skill needs to fetch daily meditation streaks and recent entries to generate morning summaries and encouragement messages for users who track their meditation practice.

**Why this priority**: This is the primary use case driving the API requirement. The OpenClaw integration delivers immediate value by enabling voice-based daily reviews and motivation.

**Independent Test**: Can be fully tested by making a GET request to `/api/v1/entries?date=2026-01-31&category=mindfulness` and `/api/v1/rhythms` with a valid API key, verifying the response contains today's meditation data and current streak information.

**Acceptance Scenarios**:

1. **Given** a user has an API key with `entries:read` permission, **When** they request entries for a specific date, **Then** they receive all entries for that date in JSON format with correct timezone handling
2. **Given** a user has a 4016-day meditation streak, **When** they request rhythm data, **Then** they receive current streak, longest streak, and statistics for today/week/month/all-time
3. **Given** a user requests entries with category filter, **When** they specify `category=mindfulness`, **Then** they receive only mindfulness-related entries
4. **Given** an API request without authentication, **When** the request reaches the server, **Then** they receive a 401 Unauthorized error with clear message

---

### User Story 2 - Voice Entry Creation (Priority: P2)

A user speaks "I meditated for 30 minutes" to their voice assistant, which creates a new meditation entry in Ta-Da! via the API without requiring manual app interaction.

**Why this priority**: This enables hands-free logging, which is essential for users who want to capture activities immediately without breaking flow. This completes the read-write cycle.

**Independent Test**: Can be fully tested by posting a new timed entry to `/api/v1/entries` with valid data structure and verifying it appears in the user's entry list and updates their streak.

**Acceptance Scenarios**:

1. **Given** a user has an API key with `entries:write` permission, **When** they POST a valid timed entry with type, category, startTime, and duration, **Then** the entry is created and assigned a unique ID
2. **Given** a user creates an entry via API, **When** they fetch entries for that date, **Then** the new entry appears with source marked as "api"
3. **Given** a user submits an entry with invalid data, **When** validation fails, **Then** they receive a 400 error with specific field-level error messages
4. **Given** a user creates a meditation entry that continues their streak, **When** they fetch rhythm data, **Then** the streak count increments appropriately
5. **Given** a user creates multiple entries in quick succession, **When** all are valid, **Then** all entries are created without data loss or conflicts

---

### User Story 3 - API Key Management (Priority: P3)

A developer wants to create API keys for different integrations (OpenClaw, mobile app, automation scripts) with specific permissions to follow the principle of least privilege.

**Why this priority**: Security foundation for the API. Required before wider adoption, but not needed for initial OpenClaw MVP if a development key is used.

**Independent Test**: Can be fully tested by creating an API key via the web interface, using it to access permitted endpoints successfully, and verifying it cannot access restricted endpoints.

**Acceptance Scenarios**:

1. **Given** a logged-in user views API settings, **When** they generate a new API key with name "OpenClaw Integration" and permissions `entries:read, rhythms:read`, **Then** they receive a key starting with `tada_key_` shown only once with a warning
2. **Given** a user has created multiple API keys, **When** they view their key list, **Then** they see masked keys with names, creation dates, last used timestamps, and permission scopes
3. **Given** a user revokes an API key, **When** they attempt to use that key, **Then** all requests fail with 401 Unauthorized
4. **Given** a user creates a key with expiration date, **When** the expiration passes, **Then** the key automatically becomes invalid
5. **Given** a user creates a key with only `entries:read` permission, **When** they attempt to POST a new entry, **Then** they receive a 403 Forbidden error

---

### User Story 4 - Real-time Webhooks (Priority: P4)

An OpenClaw server wants to receive instant notifications when a user logs a new entry or reaches a streak milestone, enabling timely encouragement messages without polling.

**Why this priority**: Enhances the integration experience with real-time capabilities, but can be deferred since polling works for MVP. Reduces API load once implemented.

**Independent Test**: Can be fully tested by registering a webhook URL, creating a test entry, and verifying the webhook receives a POST with the entry data and valid signature.

**Acceptance Scenarios**:

1. **Given** a user registers a webhook URL with events `entry.created, streak.milestone`, **When** they create a new entry, **Then** the webhook URL receives a POST with entry data and HMAC signature within 5 seconds
2. **Given** a webhook is registered, **When** a user reaches a milestone streak (100, 500, 1000 days), **Then** the webhook receives a milestone event with rhythm details
3. **Given** a webhook endpoint is unavailable, **When** delivery fails, **Then** the system retries with exponential backoff up to 3 times
4. **Given** a webhook has excessive failures, **When** failure rate exceeds threshold, **Then** the webhook is automatically disabled and user is notified
5. **Given** a user verifies webhook signature, **When** they hash the payload with their secret, **Then** it matches the X-Tada-Signature header

---

### User Story 5 - Obsidian Export (Priority: P5)

A user wants to export their daily Ta-Da! summary to Obsidian daily notes format, showing accomplishments, meditation stats, and mood in a markdown format compatible with their second brain workflow.

**Why this priority**: Enables integration with popular note-taking systems. Important for power users but not critical for basic API functionality.

**Independent Test**: Can be fully tested by requesting `/api/v1/export/obsidian?date=2026-01-31` and verifying the returned markdown contains properly formatted sections for summary, accomplishments, and rhythms.

**Acceptance Scenarios**:

1. **Given** a user requests Obsidian export for a specific date, **When** they specify `template=daily`, **Then** they receive markdown with sections for summary, accomplishments, journal entries, and rhythms
2. **Given** a user requests weekly export, **When** they specify `template=weekly` with date range, **Then** they receive a weekly review format with highlights, patterns, category breakdown, and mood trends
3. **Given** a user has no entries for a date, **When** they request export, **Then** they receive a valid markdown document with empty sections and appropriate messaging
4. **Given** a user requests export with sections filter, **When** they specify `sections=summary,rhythms`, **Then** only those sections appear in the output

---

### User Story 6 - Pattern Discovery (Priority: P6)

A user wants to discover correlations between their habits, such as "morning meditation correlates with afternoon productivity" or "running days have higher mood ratings" through automated pattern detection.

**Why this priority**: Advanced AI-powered feature that requires substantial computation and is valuable but not essential for API MVP. Adds significant differentiation.

**Independent Test**: Can be fully tested by requesting `/api/v1/insights/patterns` with sufficient historical data and verifying detected patterns have correlation scores, confidence levels, and evidence supporting claims.

**Acceptance Scenarios**:

1. **Given** a user has 90+ days of varied activity data, **When** they request pattern detection, **Then** they receive identified correlations with confidence levels (high/medium/low) and statistical evidence
2. **Given** a pattern shows meditation before 10 AM correlates with accomplishments after 2 PM, **When** the pattern is returned, **Then** it includes sample sizes, average comparison, ratio, and p-value
3. **Given** a user requests patterns for specific category, **When** they filter by category=mindfulness, **Then** only patterns involving that category are returned
4. **Given** pattern computation is expensive, **When** results are cached, **Then** subsequent requests within cache window return instantly with cache metadata
5. **Given** a user has insufficient data, **When** they request patterns, **Then** they receive a helpful message explaining minimum data requirements

---

### User Story 7 - Historical Data Import (Priority: P7)

A user switching from Insight Timer or another meditation app wants to import years of historical meditation data via CSV to maintain their long-running streak in Ta-Da!.

**Why this priority**: Migration enabler that broadens adoption but not needed for users already on Ta-Da!. Can be handled manually for early adopters.

**Independent Test**: Can be fully tested by uploading a valid CSV file to `/api/v1/import/csv` with dry-run mode, verifying it shows preview of parsed entries and validation errors without creating any data.

**Acceptance Scenarios**:

1. **Given** a user uploads an Insight Timer CSV export, **When** they use the pre-configured import endpoint, **Then** the system parses entries with correct field mappings and timezone handling
2. **Given** a user uploads a CSV with invalid rows, **When** dry-run completes, **Then** they receive a report showing total parsed, valid count, invalid count with specific row errors, and duplicate detection
3. **Given** a user confirms import after dry-run, **When** they set dryRun=false, **Then** valid entries are created with source="import" and they receive a summary of created entries
4. **Given** a user imports entries that overlap existing dates, **When** duplicate detection runs, **Then** they see which entries would be duplicates and can choose handling strategy
5. **Given** a user imports a large dataset, **When** processing completes, **Then** their rhythm streaks are recalculated correctly based on the full historical timeline

---

### Edge Cases

- What happens when a user exceeds rate limits during bulk operations?
- How does the system handle concurrent entry creation that might affect streak calculations?
- What happens when a webhook endpoint is malicious or attempts to attack the system?
- How does pattern detection handle data gaps or sparse categories?
- What happens when a user requests export for a date range spanning years?
- How does the system handle timezone conversions for users traveling across time zones?
- What happens when an API key is used simultaneously from multiple IP addresses?
- How does pagination handle entries being created/deleted during iteration?
- What happens when a user deletes an entry that was part of their active streak?
- How does the system handle special characters, emojis, and unicode in notes and titles?

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization

- **FR-001**: System MUST authenticate requests using API keys with format `tada_key_` followed by 32 alphanumeric characters
- **FR-002**: System MUST hash API keys with bcrypt (cost factor 12+) and never store plaintext keys
- **FR-003**: System MUST support granular permissions: `entries:read`, `entries:write`, `rhythms:read`, `insights:read`, `export:read`, `webhooks:manage`, `user:read`
- **FR-004**: System MUST validate API key permissions before allowing access to endpoints
- **FR-005**: System MUST support API key expiration with automatic invalidation after expiry date
- **FR-006**: System MUST track last used timestamp for each API key
- **FR-007**: System MUST allow users to revoke API keys immediately with effect on next request

#### Entry Management

- **FR-008**: System MUST support GET /api/v1/entries with query filters: date, start, end, type, category, subcategory, tags, search, sort, order
- **FR-009**: System MUST paginate entry results with configurable limit (1-1000, default 100) and offset
- **FR-010**: System MUST return entry metadata including total count, hasMore flag, and pagination details
- **FR-011**: System MUST support POST /api/v1/entries with validation based on entry type (timed requires duration, tada requires title, etc.)
- **FR-012**: System MUST assign unique IDs to created entries and set source field to track creation method
- **FR-013**: System MUST support PATCH /api/v1/entries/:id for partial updates with field-level validation
- **FR-014**: System MUST support DELETE /api/v1/entries/:id with soft delete (set deletedAt timestamp)
- **FR-015**: System MUST support bulk operations via POST /api/v1/entries/bulk with atomic success/failure reporting per operation

#### Rhythm & Streak Calculation

- **FR-016**: System MUST calculate current streak based on consecutive days with at least one entry matching rhythm criteria
- **FR-017**: System MUST track longest streak historically even if current streak is broken
- **FR-018**: System MUST provide statistics for today, this week, this month, and all-time periods
- **FR-019**: System MUST consider a streak active if user has completed today OR yesterday
- **FR-020**: System MUST recalculate streaks when entries are created, updated, or deleted
- **FR-021**: System MUST support GET /api/v1/rhythms/:id/history for day/week/month-level historical rhythm data

#### Pattern Detection & Insights

- **FR-022**: System MUST detect correlation patterns between activity types and outcomes (e.g., meditation vs productivity)
- **FR-023**: System MUST detect temporal patterns showing activity distribution by day of week
- **FR-024**: System MUST detect trend patterns showing metric changes over time
- **FR-025**: System MUST detect sequence patterns showing antecedent-consequent relationships
- **FR-026**: System MUST assign confidence levels (low/medium/high) based on statistical significance
- **FR-027**: System MUST include statistical evidence (sample sizes, p-values, correlation coefficients) in pattern results
- **FR-028**: System MUST cache expensive pattern computation results with configurable TTL
- **FR-029**: System MUST support GET /api/v1/insights/summary with period-based aggregations

#### Export & Import

- **FR-030**: System MUST support export to JSON, CSV, and Markdown formats
- **FR-031**: System MUST support Obsidian-specific markdown formatting with daily, weekly, and monthly templates
- **FR-032**: System MUST include configurable sections in exports (summary, entries, rhythms, insights)
- **FR-033**: System MUST support CSV import with custom field mapping and dry-run mode
- **FR-034**: System MUST provide import preview showing parsed entries, validation errors, and duplicate detection
- **FR-035**: System MUST support pre-configured Insight Timer CSV import format

#### Webhooks

- **FR-036**: System MUST support webhook registration with URL, secret, and event subscriptions
- **FR-037**: System MUST deliver webhook payloads via POST with event type header and HMAC signature
- **FR-038**: System MUST support events: `entry.created`, `entry.updated`, `entry.deleted`, `streak.milestone`, `rhythm.broken`, `rhythm.completed`, `pattern.detected`, `import.completed`
- **FR-039**: System MUST retry failed webhook deliveries with exponential backoff (max 3 attempts)
- **FR-040**: System MUST disable webhooks automatically after sustained failure and notify user
- **FR-041**: System MUST allow webhook testing via POST /api/v1/webhooks/:id/test

#### Rate Limiting

- **FR-042**: System MUST enforce rate limits per endpoint type: GET (1000/hour), POST/PATCH/DELETE (200/hour), export (50/hour), patterns (10/hour)
- **FR-043**: System MUST include rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- **FR-044**: System MUST return 429 error with retry-after when rate limit exceeded

#### Error Handling

- **FR-045**: System MUST return consistent error format with code, message, details, requestId, and timestamp
- **FR-046**: System MUST use appropriate HTTP status codes: 400 (validation), 401 (auth), 403 (permission), 404 (not found), 429 (rate limit), 500 (server error)
- **FR-047**: System MUST provide detailed validation errors with field names and expected formats
- **FR-048**: System MUST log all API errors with request context for debugging

### Key Entities

- **API Key**: Represents programmatic access credentials with name, hashed key, permissions array, creation/expiry/lastUsed timestamps, and user association
- **Entry**: Core activity record with type (timed/tada/tally/moment), category, subcategory, timing fields, content (note, mood, energy), metadata (source, tags), and soft delete support
- **Rhythm**: Habit tracking entity with target frequency, current/longest streak, period-based statistics, and configuration for what constitutes completion
- **Pattern**: Discovered insight with type (correlation/temporal/trend/sequence), confidence level, statistical evidence, and human-readable description
- **Webhook**: Event subscription with URL, secret, event types, active status, delivery statistics, and failure tracking
- **Insight Cache**: Stored computation results with user, type, parameters, data payload, and expiration timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: External integrations can retrieve daily meditation data and streaks in under 500ms for typical user datasets (90th percentile)
- **SC-002**: Voice-created entries via API appear in user's timeline within 2 seconds of creation
- **SC-003**: API handles 100 concurrent authenticated requests without errors or response time degradation
- **SC-004**: Pattern detection analyzes 90 days of data and returns results within 5 seconds (cached requests under 100ms)
- **SC-005**: Webhook delivery succeeds 99.5% of the time for responsive endpoints (excluding recipient failures)
- **SC-006**: Users can import 365 days of historical Insight Timer data with 95%+ parse success rate
- **SC-007**: API documentation enables developers to create a working integration in under 30 minutes
- **SC-008**: Rate limiting prevents abuse while allowing 99% of legitimate use cases to proceed unthrottled
- **SC-009**: Authentication errors provide clear guidance enabling developers to fix issues in under 5 minutes
- **SC-010**: Exported Obsidian markdown renders correctly without manual formatting in 100% of common cases

## Assumptions

- Users have stable internet connectivity for API access (no offline-first requirements)
- External integrations will respect rate limits and implement appropriate backoff strategies
- API consumers will securely store API keys and rotate them periodically
- Webhook endpoints will respond within 10 seconds to avoid timeouts
- Pattern detection will be limited to lookback periods of 365 days maximum to control computation cost
- CSV imports will be limited to files under 10MB to prevent resource exhaustion
- The existing Ta-Da! database schema supports the unified Entry model described in API-SPECIFICATION.md
- Users understand that API keys grant significant access and should be treated like passwords
- Statistical correlations in pattern detection indicate association, not causation (users will interpret responsibly)

## Out of Scope

The following are explicitly NOT included in this specification:

- GraphQL API endpoint (REST only for v1)
- Real-time streaming API using WebSockets or Server-Sent Events
- OAuth2 provider capability (Ta-Da! as identity provider for third parties)
- API gateway features like request transformation or protocol translation
- Multi-user or team features via API (single-user access only)
- Automated pattern-based recommendations or coaching advice
- Mobile push notifications (webhooks only)
- Bi-directional sync protocol for offline-first mobile apps
- Machine learning model training on user data
- Third-party integrations beyond OpenClaw (no Zapier, IFTTT connectors in v1)
- Admin or moderation API endpoints
- Billing or usage-based pricing API
- Multi-tenancy or white-label API support
