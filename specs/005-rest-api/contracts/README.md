# API Contracts: Ta-Da! REST API v1

**Base URL**: `/api/v1`
**Authentication**: Bearer token (API key or session token)
**Content-Type**: `application/json`
**Date**: 2026-02-01

## Contract Overview

This directory contains detailed API endpoint contracts for all Ta-Da! API endpoints. Each contract defines:
- Request parameters (query, body, path, headers)
- Response format (success and error cases)
- HTTP status codes
- Zod validation schemas
- Example requests/responses

## Quick Reference

### Entries

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/entries` | GET | List entries with filters | P1 (MVP) |
| `/entries` | POST | Create new entry | P2 |
| `/entries/:id` | GET | Get single entry | P1 (MVP) |
| `/entries/:id` | PATCH | Update entry | P2 |
| `/entries/:id` | DELETE | Soft delete entry | P2 |
| `/entries/bulk` | POST | Bulk operations | P2 |

### Rhythms

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/rhythms` | GET | List all rhythms with stats | P1 (MVP) |
| `/rhythms/:id` | GET | Get single rhythm detail | P1 (MVP) |
| `/rhythms/:id/history` | GET | Historical rhythm data | P3 |

### Insights

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/insights/patterns` | GET | Pattern detection | P6 |
| `/insights/correlations` | GET | Correlation analysis | P6 |
| `/insights/summary` | GET | Period-based summary stats | P2 |

### Export

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/export/entries` | GET | JSON/CSV/Markdown export | P5 |
| `/export/obsidian` | GET | Obsidian-formatted export | P5 |

### Webhooks

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/webhooks` | GET | List webhooks | P4 |
| `/webhooks` | POST | Register webhook | P4 |
| `/webhooks/:id` | PATCH | Update webhook | P4 |
| `/webhooks/:id` | DELETE | Delete webhook | P4 |
| `/webhooks/:id/test` | POST | Test webhook delivery | P4 |

### Authentication

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/auth/keys` | GET | List API keys | P3 |
| `/auth/keys` | POST | Generate API key | P3 |
| `/auth/keys/:id` | DELETE | Revoke API key | P3 |

## Standard Response Format

### Success Response

```json
{
  "data": <T>, // Response data (object or array)
  "meta"?: {   // Optional metadata
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true,
    "requestId": "req_abc123",
    "apiVersion": "1.0"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date format",
    "details": {
      "field": "start",
      "expected": "YYYY-MM-DD",
      "received": "31-01-2026"
    }
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-31T12:00:00Z"
  }
}
```

## Common HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET/PATCH/DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation error, malformed JSON |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (duplicate) |
| 422 | Unprocessable | Valid JSON but semantic error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Maintenance or overload |

## Common Headers

### Request Headers

```http
Authorization: Bearer tada_key_abc123...  # Required
Content-Type: application/json            # For POST/PATCH
Accept: application/json                  # Optional (default)
```

### Response Headers

```http
Content-Type: application/json
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1706745600
Cache-Control: private, max-age=0         # For sensitive data
```

## Detailed Contracts

See individual contract files for complete specifications:

- **[entries.md](entries.md)** - Entry CRUD operations (P1/P2)
- **[rhythms.md](rhythms.md)** - Rhythm and streak endpoints (P1)
- **[insights.md](insights.md)** - Pattern detection and analytics (P6)
- **[export.md](export.md)** - Export formats (P5)
- **[webhooks.md](webhooks.md)** - Webhook management (P4)
- **[auth.md](auth.md)** - API key management (P3)

## Validation Schemas

All contracts include Zod validation schemas. Example:

```typescript
// GET /api/v1/entries query schema
const getEntriesQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['timed', 'tada', 'tally', 'moment']).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
  search: z.string().optional(),
  sort: z.enum(['timestamp', 'createdAt', 'durationSeconds']).default('timestamp'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
})
```

## Testing

Each contract includes example test cases using Vitest:

```typescript
// Example from entries.test.ts
describe('GET /api/v1/entries', () => {
  it('returns entries for specific date', async () => {
    const response = await $fetch('/api/v1/entries', {
      query: { date: '2026-01-31' },
      headers: { Authorization: `Bearer ${testApiKey}` }
    })

    expect(response.data).toBeInstanceOf(Array)
    expect(response.meta.total).toBeGreaterThan(0)
    response.data.forEach(entry => {
      expect(entry.timestamp).toContain('2026-01-31')
    })
  })

  it('rejects unauthenticated requests', async () => {
    await expect(
      $fetch('/api/v1/entries')
    ).rejects.toThrow('401')
  })

  it('enforces rate limits', async () => {
    // Make 1001 requests
    const requests = Array(1001).fill(0).map(() =>
      $fetch('/api/v1/entries', {
        headers: { Authorization: `Bearer ${testApiKey}` }
      })
    )

    await expect(
      Promise.all(requests)
    ).rejects.toThrow('429')
  })
})
```

## Implementation Priority

Focus implementation on contracts in this order:

1. **Phase 1 (MVP)**: entries.md (GET single, GET list), rhythms.md (GET)
2. **Phase 2 (Read/Write)**: entries.md (POST, PATCH, DELETE), insights.md (summary)
3. **Phase 3 (Security)**: auth.md (API key management)
4. **Phase 4 (Advanced)**: webhooks.md, insights.md (patterns), export.md

---

*Full contract specifications for each endpoint group are available in the individual markdown files in this directory.*
