# Ta-Da! API Quickstart Guide

**Version**: 1.0
**Date**: 2026-02-01
**Base URL**: `https://tada.onemonkey.org/api/v1`

## Introduction

The Ta-Da! API enables external integrations to read and write life activity data. This guide will help you make your first API request in under 5 minutes.

## Prerequisites

- A Ta-Da! account at [https://tada.onemonkey.org](https://tada.onemonkey.org)
- `curl` or similar HTTP client
- A tool to make HTTP requests (curl, Postman, or your favorite programming language)

## Step 1: Generate an API Key

### Via Web Interface

1. Log in to Ta-Da! at [https://tada.onemonkey.org](https://tada.onemonkey.org)
2. Navigate to **Settings** → **API Keys**
3. Click **Generate New API Key**
4. Enter a name: `"My First Integration"`
5. Select permissions:
   - ✅ `entries:read` - Read your activity entries
   - ✅ `rhythms:read` - Read your habit streaks
6. Click **Generate Key**
7. **IMPORTANT**: Copy the key immediately - it won't be shown again!

Your API key will look like this:
```
tada_key_xJ8kPq2nR5vL9mTw3bYc4fGh7jKn
```

### Security Note

- Store your API key securely (environment variable, secret manager)
- Never commit API keys to version control
- Treat API keys like passwords
- Rotate keys periodically (90 days recommended)

## Step 2: Make Your First Request

### Fetch Today's Entries

```bash
curl "https://tada.onemonkey.org/api/v1/entries?date=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

**Response**:
```json
{
  "data": [
    {
      "id": "entry_abc123",
      "type": "timed",
      "name": "meditation",
      "category": "mindfulness",
      "timestamp": "2026-01-31T07:00:00.000Z",
      "durationSeconds": 1800,
      "tags": ["morning"],
      "notes": "Deep session"
    }
  ],
  "meta": {
    "total": 12,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

### Get Your Meditation Streak

```bash
curl "https://tada.onemonkey.org/api/v1/rhythms" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

**Response**:
```json
{
  "data": [
    {
      "id": "rhythm_meditation",
      "name": "Daily Meditation",
      "matchCategory": "mindfulness",
      "streak": {
        "current": 4016,
        "longest": 4016,
        "lastCompleted": "2026-01-31"
      },
      "stats": {
        "today": {
          "completed": true,
          "sessions": 1,
          "totalMinutes": 30
        },
        "thisWeek": {
          "days": 7,
          "sessions": 7,
          "totalMinutes": 225
        }
      }
    }
  ]
}
```

## Step 3: Create an Entry

### Log a New Meditation Session

```bash
curl "https://tada.onemonkey.org/api/v1/entries" \
  -X POST \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "timed",
    "name": "meditation",
    "category": "mindfulness",
    "subcategory": "sitting",
    "timestamp": "2026-01-31T19:00:00.000Z",
    "durationSeconds": 1200,
    "notes": "Evening session",
    "tags": ["evening", "calm"]
  }'
```

**Response**:
```json
{
  "data": {
    "id": "entry_new456",
    "type": "timed",
    "name": "meditation",
    "timestamp": "2026-01-31T19:00:00.000Z",
    "durationSeconds": 1200,
    "source": "api",
    "createdAt": "2026-01-31T19:05:12.000Z"
  },
  "meta": {
    "created": true
  }
}
```

## Common Use Cases

### 1. Daily Summary (OpenClaw Integration)

Fetch today's accomplishments and meditation stats for a morning summary:

```bash
curl "https://tada.onemonkey.org/api/v1/entries?date=2026-01-31&category=mindfulness" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"

curl "https://tada.onemonkey.org/api/v1/rhythms" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

### 2. Voice Entry Creation

Create entry from voice command "I meditated for 20 minutes":

```bash
curl "https://tada.onemonkey.org/api/v1/entries" \
  -X POST \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"timed\",
    \"name\": \"meditation\",
    \"category\": \"mindfulness\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
    \"durationSeconds\": 1200
  }"
```

### 3. Weekly Review

Get all entries from the past week:

```bash
START_DATE=$(date -d "7 days ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

curl "https://tada.onemonkey.org/api/v1/entries?start=$START_DATE&end=$END_DATE&sort=timestamp&order=desc" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

### 4. Export to Obsidian

Generate Obsidian-formatted daily note:

```bash
curl "https://tada.onemonkey.org/api/v1/export/obsidian?date=2026-01-31&template=daily" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

**Response** (Markdown):
```markdown
---
date: 2026-01-31
tags: [lifelogging, tada, daily-note]
meditation: 30m
---

## Ta-Da! Summary

🧘 **Meditation:** 30m (Day 4,016 streak!)

### Accomplishments

- ✅ Finished tandem report
- ✅ Updated research paper

...
```

## Rate Limits

API keys are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Standard GET | 1000 requests | 1 hour |
| POST/PATCH/DELETE | 200 requests | 1 hour |
| Export | 50 requests | 1 hour |
| Pattern Detection | 10 requests | 1 hour |

**Response Headers**:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1706745600
```

**429 Response** (rate limit exceeded):
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "retryAfter": 3600
  }
}
```

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Fix |
|------|-------------|-------------|-----|
| `UNAUTHORIZED` | 401 | Missing/invalid API key | Check Authorization header |
| `FORBIDDEN` | 403 | Insufficient permissions | Add required permission to key |
| `VALIDATION_ERROR` | 400 | Invalid request data | Check request format |
| `NOT_FOUND` | 404 | Resource doesn't exist | Verify ID or query |
| `RATE_LIMITED` | 429 | Too many requests | Wait `retryAfter` seconds |

### Example Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date format",
    "details": {
      "field": "start",
      "expected": "YYYY-MM-DD",
      "received": "01-31-2026"
    }
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-31T12:00:00Z"
  }
}
```

## Code Examples

### JavaScript (Node.js)

```javascript
const TADA_API_KEY = process.env.TADA_API_KEY

async function getTodaysEntries() {
  const today = new Date().toISOString().split('T')[0]

  const response = await fetch(
    `https://tada.onemonkey.org/api/v1/entries?date=${today}`,
    {
      headers: {
        'Authorization': `Bearer ${TADA_API_KEY}`
      }
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`API Error: ${error.error.message}`)
  }

  const data = await response.json()
  return data.data
}

async function createMeditationEntry(durationMinutes) {
  const response = await fetch(
    'https://tada.onemonkey.org/api/v1/entries',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TADA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'timed',
        name: 'meditation',
        category: 'mindfulness',
        timestamp: new Date().toISOString(),
        durationSeconds: durationMinutes * 60
      })
    }
  )

  const data = await response.json()
  return data.data
}

// Usage
const entries = await getTodaysEntries()
console.log(`You have ${entries.length} entries today`)

const newEntry = await createMeditationEntry(20)
console.log(`Created entry: ${newEntry.id}`)
```

### Python

```python
import os
import requests
from datetime import datetime

TADA_API_KEY = os.environ['TADA_API_KEY']
BASE_URL = 'https://tada.onemonkey.org/api/v1'

def get_todays_entries():
    today = datetime.now().strftime('%Y-%m-%d')
    response = requests.get(
        f'{BASE_URL}/entries',
        params={'date': today},
        headers={'Authorization': f'Bearer {TADA_API_KEY}'}
    )
    response.raise_for_status()
    return response.json()['data']

def create_meditation_entry(duration_minutes):
    response = requests.post(
        f'{BASE_URL}/entries',
        headers={
            'Authorization': f'Bearer {TADA_API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'type': 'timed',
            'name': 'meditation',
            'category': 'mindfulness',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'durationSeconds': duration_minutes * 60
        }
    )
    response.raise_for_status()
    return response.json()['data']

# Usage
entries = get_todays_entries()
print(f"You have {len(entries)} entries today")

new_entry = create_meditation_entry(20)
print(f"Created entry: {new_entry['id']}")
```

### Bash

```bash
#!/bin/bash
TADA_API_KEY="your_api_key_here"
BASE_URL="https://tada.onemonkey.org/api/v1"

# Get today's entries
get_todays_entries() {
  local today=$(date +%Y-%m-%d)
  curl -s "$BASE_URL/entries?date=$today" \
    -H "Authorization: Bearer $TADA_API_KEY" | jq .
}

# Create meditation entry
create_meditation() {
  local duration_minutes=$1
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)

  curl -s "$BASE_URL/entries" \
    -X POST \
    -H "Authorization: Bearer $TADA_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"timed\",
      \"name\": \"meditation\",
      \"category\": \"mindfulness\",
      \"timestamp\": \"$timestamp\",
      \"durationSeconds\": $((duration_minutes * 60))
    }" | jq .
}

# Usage
get_todays_entries
create_meditation 20
```

## Best Practices

### 1. Store API Keys Securely

```bash
# Environment variable (recommended)
export TADA_API_KEY="tada_key_..."

# .env file (add to .gitignore!)
TADA_API_KEY=tada_key_...

# Secret manager (production)
aws secretsmanager get-secret-value --secret-id tada-api-key
```

### 2. Handle Rate Limits Gracefully

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options)

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60
      await sleep(retryAfter * 1000)
      continue
    }

    return response
  }
  throw new Error('Max retries exceeded')
}
```

### 3. Use Pagination for Large Datasets

```javascript
async function getAllEntries(startDate, endDate) {
  const allEntries = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await fetch(
      `${BASE_URL}/entries?start=${startDate}&end=${endDate}&limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    )

    const data = await response.json()
    allEntries.push(...data.data)

    if (!data.meta.hasMore) break
    offset += limit
  }

  return allEntries
}
```

### 4. Validate Input Before Sending

```javascript
function validateEntryData(entry) {
  if (!entry.type || !['timed', 'tada', 'tally', 'moment'].includes(entry.type)) {
    throw new Error('Invalid entry type')
  }

  if (!entry.name || entry.name.length === 0) {
    throw new Error('Entry name is required')
  }

  if (entry.type === 'timed' && !entry.durationSeconds) {
    throw new Error('Timed entries require durationSeconds')
  }

  return true
}
```

## Next Steps

- **Full API Reference**: See [contracts/](contracts/) for complete endpoint documentation
- **Pattern Detection**: Explore `/api/v1/insights/patterns` for habit correlations
- **Webhooks**: Set up real-time notifications for new entries
- **OpenClaw Integration**: Build voice-controlled lifelogging

## Support

- **API Documentation**: [docs/tada-api/API-SPECIFICATION.md](../../docs/tada-api/API-SPECIFICATION.md)
- **Issues**: Report bugs at GitHub (link TBD)
- **Community**: Discord server (link TBD)

---

**Happy Coding!** 🎉

Build amazing integrations with your Ta-Da! data.
