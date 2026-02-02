# Entries API Contract

**Base Path**: `/api/v1/entries`
**Priority**: P1 (GET operations), P2 (Write operations)

## GET /api/v1/entries

List entries with filtering, sorting, and pagination.

### Request

**Method**: `GET`
**Auth**: Required (`entries:read` permission)

**Query Parameters**:

| Parameter | Type | Required | Default | Description | Validation |
|-----------|------|----------|---------|-------------|------------|
| `date` | string | No | - | Single date filter (YYYY-MM-DD) | `/^\d{4}-\d{2}-\d{2}$/` |
| `start` | string | No | - | Range start date (inclusive) | `/^\d{4}-\d{2}-\d{2}$/` |
| `end` | string | No | - | Range end date (inclusive) | `/^\d{4}-\d{2}-\d{2}$/` |
| `type` | string | No | - | Entry type filter | `timed | tada | tally | moment` |
| `category` | string | No | - | Category filter | Any string |
| `subcategory` | string | No | - | Subcategory filter | Any string |
| `tags` | string | No | - | Comma-separated tags | `tag1,tag2,tag3` |
| `search` | string | No | - | Full-text search (name, notes) | Min length 2 |
| `sort` | string | No | `timestamp` | Sort field | `timestamp | createdAt | durationSeconds` |
| `order` | string | No | `desc` | Sort direction | `asc | desc` |
| `limit` | number | No | 100 | Max results per page | 1-1000 |
| `offset` | number | No | 0 | Pagination offset | >= 0 |

**Zod Schema**:

```typescript
import { z } from 'zod'

const getEntriesQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['timed', 'tada', 'tally', 'moment']).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.string().optional(),
  search: z.string().min(2).optional(),
  sort: z.enum(['timestamp', 'createdAt', 'durationSeconds']).default('timestamp'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
})
```

### Response 200 OK

```json
{
  "data": [
    {
      "id": "entry_abc123",
      "userId": "user_xyz789",
      "type": "timed",
      "name": "meditation",
      "category": "mindfulness",
      "subcategory": "sitting",
      "emoji": "🧘",
      "timestamp": "2026-01-31T07:00:00.000Z",
      "durationSeconds": 1800,
      "timezone": "Europe/London",
      "data": {},
      "tags": ["morning", "deep"],
      "notes": "Deep session. Thoughts settled quickly.",
      "source": "app",
      "externalId": null,
      "createdAt": "2026-01-31T07:30:15.000Z",
      "updatedAt": "2026-01-31T07:30:15.000Z",
      "deletedAt": null
    }
  ],
  "meta": {
    "total": 4016,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

### Error Responses

**400 Bad Request** - Invalid query parameters:
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

**401 Unauthorized** - Missing or invalid authentication:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing authorization header"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-31T12:00:00Z"
  }
}
```

**403 Forbidden** - Insufficient permissions:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Missing entries:read permission"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-31T12:00:00Z"
  }
}
```

**429 Too Many Requests** - Rate limit exceeded:
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "retryAfter": 3600
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-31T12:00:00Z"
  }
}
```

### Example Requests

**Get entries for specific date**:
```bash
curl "https://tada.onemonkey.org/api/v1/entries?date=2026-01-31" \
  -H "Authorization: Bearer tada_key_abc123..."
```

**Get meditation entries from last 30 days**:
```bash
curl "https://tada.onemonkey.org/api/v1/entries?start=2026-01-01&end=2026-01-31&category=mindfulness" \
  -H "Authorization: Bearer tada_key_abc123..."
```

**Search for "tandem" in notes**:
```bash
curl "https://tada.onemonkey.org/api/v1/entries?search=tandem" \
  -H "Authorization: Bearer tada_key_abc123..."
```

---

## GET /api/v1/entries/:id

Get a single entry by ID.

### Request

**Method**: `GET`
**Auth**: Required (`entries:read` permission)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Entry ID (UUID) |

### Response 200 OK

```json
{
  "data": {
    "id": "entry_abc123",
    "userId": "user_xyz789",
    "type": "timed",
    "name": "meditation",
    "category": "mindfulness",
    "subcategory": "sitting",
    "emoji": "🧘",
    "timestamp": "2026-01-31T07:00:00.000Z",
    "durationSeconds": 1800,
    "timezone": "Europe/London",
    "data": {},
    "tags": ["morning", "deep"],
    "notes": "Deep session",
    "source": "app",
    "createdAt": "2026-01-31T07:30:15.000Z",
    "updatedAt": "2026-01-31T07:30:15.000Z",
    "deletedAt": null
  }
}
```

### Error Responses

**404 Not Found** - Entry doesn't exist or is deleted:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Entry not found",
    "details": { "id": "entry_abc123" }
  }
}
```

---

## POST /api/v1/entries

Create a new entry.

### Request

**Method**: `POST`
**Auth**: Required (`entries:write` permission)
**Content-Type**: `application/json`

**Request Body**:

```typescript
// Zod schema
const createEntrySchema = z.object({
  type: z.enum(['timed', 'tada', 'tally', 'moment']),
  name: z.string().min(1).max(255),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  emoji: z.string().optional(),
  timestamp: z.string().datetime(),
  durationSeconds: z.number().int().positive().optional(),
  timezone: z.string().default('UTC'),
  data: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
})
```

**Example Request Body** (timed entry):
```json
{
  "type": "timed",
  "name": "meditation",
  "category": "mindfulness",
  "subcategory": "sitting",
  "timestamp": "2026-01-31T07:00:00.000Z",
  "durationSeconds": 1800,
  "notes": "Morning meditation",
  "tags": ["morning"]
}
```

**Example Request Body** (tada entry):
```json
{
  "type": "tada",
  "name": "Finished tandem report",
  "category": "accomplishment",
  "subcategory": "work",
  "timestamp": "2026-01-31T15:30:00.000Z"
}
```

**Example Request Body** (tally entry):
```json
{
  "type": "tally",
  "name": "push-ups",
  "category": "movement",
  "data": { "count": 50 },
  "timestamp": "2026-01-31T08:00:00.000Z"
}
```

### Response 201 Created

```json
{
  "data": {
    "id": "entry_new123",
    "userId": "user_xyz789",
    "type": "timed",
    "name": "meditation",
    "category": "mindfulness",
    "subcategory": "sitting",
    "emoji": "🧘",
    "timestamp": "2026-01-31T07:00:00.000Z",
    "durationSeconds": 1800,
    "timezone": "Europe/London",
    "data": {},
    "tags": ["morning"],
    "notes": "Morning meditation",
    "source": "api",
    "externalId": null,
    "createdAt": "2026-01-31T12:45:30.000Z",
    "updatedAt": "2026-01-31T12:45:30.000Z",
    "deletedAt": null
  },
  "meta": {
    "created": true
  }
}
```

### Validation Rules by Type

**timed entries**:
- MUST have `durationSeconds` > 0

**tada entries**:
- MUST have `name` (accomplishment title)

**tally entries**:
- MUST have `data.count` > 0

**moment entries**:
- No special requirements (timestamp + name sufficient)

---

## PATCH /api/v1/entries/:id

Update an existing entry (partial update).

### Request

**Method**: `PATCH`
**Auth**: Required (`entries:write` permission)
**Content-Type**: `application/json`

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Entry ID |

**Request Body** (all fields optional):

```json
{
  "notes": "Updated note",
  "tags": ["morning", "deep", "focused"],
  "data": { "mood": 9 }
}
```

### Response 200 OK

```json
{
  "data": {
    "id": "entry_abc123",
    // ... full updated entry ...
    "updatedAt": "2026-01-31T13:00:00.000Z"
  }
}
```

---

## DELETE /api/v1/entries/:id

Soft delete an entry (sets `deletedAt` timestamp).

### Request

**Method**: `DELETE`
**Auth**: Required (`entries:write` permission)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Entry ID |

### Response 200 OK

```json
{
  "data": null,
  "meta": {
    "deleted": true,
    "id": "entry_abc123"
  }
}
```

---

## POST /api/v1/entries/bulk

Perform bulk operations (create, update, delete multiple entries).

### Request

**Method**: `POST`
**Auth**: Required (`entries:write` permission)
**Content-Type**: `application/json`

**Request Body**:

```json
{
  "operations": [
    {
      "action": "create",
      "data": {
        "type": "timed",
        "name": "meditation",
        "timestamp": "2026-01-31T07:00:00.000Z",
        "durationSeconds": 1800
      }
    },
    {
      "action": "update",
      "id": "entry_abc123",
      "data": {
        "notes": "Updated note"
      }
    },
    {
      "action": "delete",
      "id": "entry_xyz789"
    }
  ]
}
```

### Response 200 OK

```json
{
  "data": {
    "results": [
      {
        "action": "create",
        "success": true,
        "id": "entry_new1",
        "data": { /* created entry */ }
      },
      {
        "action": "update",
        "success": true,
        "id": "entry_abc123",
        "data": { /* updated entry */ }
      },
      {
        "action": "delete",
        "success": true,
        "id": "entry_xyz789"
      }
    ],
    "summary": {
      "total": 3,
      "succeeded": 3,
      "failed": 0
    }
  }
}
```

**Partial Failure**:
```json
{
  "data": {
    "results": [
      { "action": "create", "success": true, "id": "entry_new1" },
      {
        "action": "update",
        "success": false,
        "id": "entry_abc123",
        "error": { "code": "NOT_FOUND", "message": "Entry not found" }
      }
    ],
    "summary": {
      "total": 2,
      "succeeded": 1,
      "failed": 1
    }
  }
}
```

---

## Test Cases

```typescript
// tests/api/v1/entries.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { $fetch } from '@nuxt/test-utils'

describe('GET /api/v1/entries', () => {
  const testApiKey = 'tada_key_test...'

  it('returns entries for specific date', async () => {
    const response = await $fetch('/api/v1/entries', {
      query: { date: '2026-01-31' },
      headers: { Authorization: `Bearer ${testApiKey}` }
    })

    expect(response.data).toBeInstanceOf(Array)
    expect(response.meta.total).toBeGreaterThan(0)
    expect(response.meta.hasMore).toBeDefined()
  })

  it('filters by category', async () => {
    const response = await $fetch('/api/v1/entries', {
      query: { category: 'mindfulness' },
      headers: { Authorization: `Bearer ${testApiKey}` }
    })

    response.data.forEach(entry => {
      expect(entry.category).toBe('mindfulness')
    })
  })

  it('paginates correctly', async () => {
    const page1 = await $fetch('/api/v1/entries', {
      query: { limit: 10, offset: 0 },
      headers: { Authorization: `Bearer ${testApiKey}` }
    })

    const page2 = await $fetch('/api/v1/entries', {
      query: { limit: 10, offset: 10 },
      headers: { Authorization: `Bearer ${testApiKey}` }
    })

    expect(page1.data.length).toBe(10)
    expect(page2.data.length).toBeGreaterThan(0)
    expect(page1.data[0].id).not.toBe(page2.data[0].id)
  })

  it('rejects unauthenticated requests', async () => {
    await expect(
      $fetch('/api/v1/entries')
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects requests without entries:read permission', async () => {
    const writeOnlyKey = 'tada_key_writeonly...'
    await expect(
      $fetch('/api/v1/entries', {
        headers: { Authorization: `Bearer ${writeOnlyKey}` }
      })
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('POST /api/v1/entries', () => {
  it('creates timed entry', async () => {
    const response = await $fetch('/api/v1/entries', {
      method: 'POST',
      headers: { Authorization: `Bearer ${testApiKey}` },
      body: {
        type: 'timed',
        name: 'meditation',
        category: 'mindfulness',
        timestamp: new Date().toISOString(),
        durationSeconds: 1800
      }
    })

    expect(response.data.id).toBeTruthy()
    expect(response.data.source).toBe('api')
    expect(response.meta.created).toBe(true)
  })

  it('validates required fields', async () => {
    await expect(
      $fetch('/api/v1/entries', {
        method: 'POST',
        headers: { Authorization: `Bearer ${testApiKey}` },
        body: { type: 'timed' } // Missing required fields
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      data: {
        error: { code: 'VALIDATION_ERROR' }
      }
    })
  })
})
```

---

*For complete contracts of other endpoint groups, see:*
- **[rhythms.md](rhythms.md)** - Rhythm and streak calculations
- **[insights.md](insights.md)** - Pattern detection and analytics
- **[export.md](export.md)** - Export functionality
- **[webhooks.md](webhooks.md)** - Webhook management
- **[auth.md](auth.md)** - API key authentication
