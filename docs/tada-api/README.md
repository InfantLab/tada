# Ta-Da! Integration Documentation

> Documentation for Ta-Da! API and OpenClaw integration.

## Overview

**Ta-Da!** is a personal lifelogging PWA for meditation, habits, dreams, and accomplishments. These docs describe the API for external integrations.

**Current Hosting:** `https://tada.onemonkey.org`
**Future:** `https://tada.living` (commercial cloud service)

## Documents

### [[API-SPECIFICATION]]
Complete REST API specification including all endpoints, authentication, and data models.

**Use for:** Implementing the API in Ta-Da!

### [[OPENCLAW-SKILL]]
OpenClaw skill design for consuming the Ta-Da! API.

**Use for:** Building the OpenClaw integration

### [[AGENTS-API]]
Development guide for coding agents implementing the API.

**Use for:** Passing to AI coding assistants (Claude, Cursor, etc.)

## Quick Links

### API Essentials
- Authentication: API keys (`tada_key_xxx`)
- Base URL: `/api/v1/`
- Content-Type: `application/json`

### Key Endpoints
- `GET /entries` - List activities
- `GET /rhythms` - Get streaks and stats
- `GET /insights/patterns` - Pattern detection
- `GET /export/obsidian` - Markdown export

### OpenClaw Commands
```bash
openclaw tada today      # Daily summary
openclaw tada week       # Weekly review
openclaw tada patterns   # Pattern analysis
openclaw tada encourage  # Motivation message
```

## Integration Architecture

```
Ta-Da! (hosted)
    ↓ REST API
OpenClaw Skill (Block server)
    ↓
Obsidian Notes / Email / Notifications
```

## Development Priority

### Phase 1 (MVP)
1. `GET /entries` (with date/range filtering)
2. `GET /rhythms/meditation` (streak calculation)
3. API key authentication
4. Basic rate limiting

### Phase 2 (Full API)
5. All CRUD operations
6. `GET /insights/summary`
7. `GET /export/obsidian`
8. Webhooks

### Phase 3 (Intelligence)
9. `GET /insights/patterns`
10. Correlation analysis
11. Trend detection

## Related Notes

- [[spring-clean]] - File organization (tea house metaphor)
- [[second-brain-vision]] - Block server integration vision

---

*Created: 2026-01-31*
*Status: API specification complete, implementation pending*
