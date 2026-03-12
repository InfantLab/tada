# Ta-Da! API Specification

> Complete REST API specification for Ta-Da! lifelogging application.
> This document is the source of truth for API development.

## Overview

Ta-Da! exposes a REST API for external integrations, enabling:
- **Read access** to entries, rhythms, insights, and exports
- **Write access** for creating entries via external tools (voice assistants, CLI, automations)
- **Webhooks** for real-time event notifications
- **Analytics** for pattern detection and correlations

**Base URLs:**
- Development: `http://localhost:3000/api`
- Production: `https://tada.onemonkey.org/api`
- Commercial: `https://tada.living/api`

**API Version:** v1 (prefix: `/api/v1/`)

---

## Authentication

### API Keys

Personal API keys for programmatic access.

**Generate Key:** Settings → API Keys → Generate New Key

**Request Header:**
```http
Authorization: Bearer tada_key_abc123xyz...
```

**Key Format:** `tada_key_` prefix + 32 random alphanumeric characters

**Key Properties:**
```typescript
interface ApiKey {
  id: string
  name: string           // User-provided label: "OpenClaw Integration"
  keyHash: string        // bcrypt hash (never store plaintext)
  prefix: string         // First 8 chars for identification: "tada_key"
  permissions: Permission[]
  createdAt: Date
  lastUsedAt: Date | null
  expiresAt: Date | null // Optional expiry
  userId: string
}

type Permission = 
  | 'entries:read'
  | 'entries:write'
  | 'rhythms:read'
  | 'insights:read'
  | 'export:read'
  | 'webhooks:manage'
  | 'user:read'
```

**Key Management Endpoints:**

```http
GET /api/v1/auth/keys
Authorization: Bearer SESSION_TOKEN
→ List all API keys for current user (masked)

POST /api/v1/auth/keys
Authorization: Bearer SESSION_TOKEN
{
  "name": "OpenClaw Integration",
  "permissions": ["entries:read", "rhythms:read", "insights:read"],
  "expiresAt": "2027-01-01T00:00:00Z"  // Optional
}
→ { "key": "tada_key_abc123...", "id": "key_xxx" }
   ⚠️ Key shown only once!

DELETE /api/v1/auth/keys/:keyId
Authorization: Bearer SESSION_TOKEN
→ Revoke key
```

### Session Tokens (Internal)

For web app authentication. Not for external API use.

```http
POST /api/v1/auth/login
{ "email": "...", "password": "..." }
→ { "token": "session_xxx", "expiresIn": 86400 }

POST /api/v1/auth/logout
Authorization: Bearer SESSION_TOKEN
→ { "success": true }

POST /api/v1/auth/refresh
Authorization: Bearer SESSION_TOKEN
→ { "token": "session_new_xxx", "expiresIn": 86400 }
```

---

## Core Resources

### Entry Model

The unified data model for all life activities.

```typescript
interface Entry {
  // Identity
  id: string              // UUID or nanoid
  userId: string          // Owner
  
  // Classification
  type: EntryType         // How it's recorded
  category: string        // Life domain (open string)
  subcategory: string     // Specific activity (open string)
  
  // Display
  emoji: string           // Custom or default based on category
  title: string | null    // For tada/moment types
  
  // Timing
  startTime: Date         // When it started/occurred
  endTime: Date | null    // When it ended (timed entries)
  duration: number | null // Seconds (calculated or manual)
  timezone: string        // IANA timezone: "Europe/London"
  
  // Content
  note: string | null     // Free-form text
  mood: number | null     // 1-10 scale
  energy: number | null   // 1-10 scale
  tags: string[]          // User-defined tags
  
  // Type-specific
  count: number | null    // For tally type
  targetCount: number | null // For tally targets
  
  // Media
  attachments: Attachment[]
  
  // Metadata
  source: EntrySource     // How it was created
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null  // Soft delete
}

type EntryType = 
  | 'timed'    // Duration-based: meditation, running, focused work
  | 'tada'     // Accomplishment: one-off wins
  | 'tally'    // Count-based: push-ups, glasses of water
  | 'moment'   // Timestamped note: dream, thought, gratitude

type EntrySource =
  | 'app'           // Created in Ta-Da! app
  | 'voice'         // Voice input
  | 'api'           // External API
  | 'import'        // CSV/JSON import
  | 'webhook'       // Incoming webhook
  | 'integration'   // Third-party integration (Strava, etc.)

interface Attachment {
  id: string
  type: 'image' | 'audio' | 'file'
  url: string
  filename: string
  mimeType: string
  sizeBytes: number
}
```

### Built-in Categories

Sensible defaults (users can add custom):

| Category | Default Subcategories | Default Emoji |
|----------|----------------------|---------------|
| `mindfulness` | sitting, walking, breathing, body-scan | 🧘 |
| `movement` | running, yoga, strength, cycling, swimming | 🏃 |
| `creative` | writing, music, art, coding, crafts | ✨ |
| `learning` | reading, course, practice, language | 📚 |
| `journal` | dream, gratitude, reflection, morning-pages | 📝 |
| `accomplishment` | work, personal, health, social | ✅ |
| `event` | appointment, social, travel, milestone | 📅 |

---

## Endpoints

### Entries

#### List Entries

```http
GET /api/v1/entries
Authorization: Bearer API_KEY
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `date` | YYYY-MM-DD | Single date | `2026-01-31` |
| `start` | YYYY-MM-DD | Range start (inclusive) | `2026-01-01` |
| `end` | YYYY-MM-DD | Range end (inclusive) | `2026-01-31` |
| `type` | string | Filter by type | `timed` |
| `category` | string | Filter by category | `mindfulness` |
| `subcategory` | string | Filter by subcategory | `sitting` |
| `tags` | string | Comma-separated tags | `focus,morning` |
| `source` | string | Filter by source | `voice` |
| `hasMood` | boolean | Has mood rating | `true` |
| `moodMin` | number | Minimum mood (1-10) | `7` |
| `moodMax` | number | Maximum mood (1-10) | `10` |
| `search` | string | Full-text search in title/note | `tandem` |
| `sort` | string | Sort field | `startTime` |
| `order` | asc/desc | Sort order | `desc` |
| `limit` | number | Max results (default 100, max 1000) | `50` |
| `offset` | number | Pagination offset | `100` |

**Response:**

```json
{
  "data": [
    {
      "id": "entry_abc123",
      "type": "timed",
      "category": "mindfulness",
      "subcategory": "sitting",
      "emoji": "🧘",
      "title": null,
      "startTime": "2026-01-31T07:00:00.000Z",
      "endTime": "2026-01-31T07:30:00.000Z",
      "duration": 1800,
      "timezone": "Europe/London",
      "note": "Deep session. Thoughts settled quickly.",
      "mood": 8,
      "energy": 7,
      "tags": ["morning", "deep"],
      "count": null,
      "source": "app",
      "createdAt": "2026-01-31T07:30:15.000Z",
      "updatedAt": "2026-01-31T07:30:15.000Z"
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

#### Get Single Entry

```http
GET /api/v1/entries/:id
Authorization: Bearer API_KEY
```

**Response:** Single entry object

#### Create Entry

```http
POST /api/v1/entries
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "type": "timed",
  "category": "mindfulness",
  "subcategory": "sitting",
  "startTime": "2026-01-31T07:00:00.000Z",
  "duration": 1800,
  "note": "Morning meditation",
  "mood": 8,
  "tags": ["morning"]
}
```

**Required Fields by Type:**

| Type | Required |
|------|----------|
| `timed` | type, category, startTime, duration OR endTime |
| `tada` | type, category, title |
| `tally` | type, category, count |
| `moment` | type, category |

**Response:**
```json
{
  "data": { ... created entry ... },
  "meta": {
    "created": true
  }
}
```

#### Update Entry

```http
PATCH /api/v1/entries/:id
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "note": "Updated note",
  "mood": 9
}
```

**Response:** Updated entry object

#### Delete Entry

```http
DELETE /api/v1/entries/:id
Authorization: Bearer API_KEY
```

**Response:**
```json
{
  "data": null,
  "meta": {
    "deleted": true,
    "id": "entry_abc123"
  }
}
```

#### Bulk Operations

```http
POST /api/v1/entries/bulk
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "operations": [
    { "action": "create", "data": { ... } },
    { "action": "update", "id": "entry_abc", "data": { ... } },
    { "action": "delete", "id": "entry_xyz" }
  ]
}
```

**Response:**
```json
{
  "data": {
    "results": [
      { "action": "create", "success": true, "id": "entry_new1" },
      { "action": "update", "success": true, "id": "entry_abc" },
      { "action": "delete", "success": true, "id": "entry_xyz" }
    ],
    "summary": {
      "total": 3,
      "succeeded": 3,
      "failed": 0
    }
  }
}
```

---

### Rhythms

Track habits, streaks, and recurring patterns.

#### Get All Rhythms

```http
GET /api/v1/rhythms
Authorization: Bearer API_KEY
```

**Response:**
```json
{
  "data": [
    {
      "id": "rhythm_meditation",
      "type": "timed",
      "category": "mindfulness",
      "subcategory": null,
      "name": "Daily Meditation",
      "target": {
        "frequency": "daily",
        "minimum": 1,
        "unit": "sessions"
      },
      "streak": {
        "current": 4016,
        "longest": 4016,
        "lastCompleted": "2026-01-31",
        "startedAt": "2015-02-15"
      },
      "stats": {
        "today": {
          "completed": true,
          "count": 1,
          "totalMinutes": 30
        },
        "thisWeek": {
          "days": 7,
          "sessions": 7,
          "totalMinutes": 225,
          "avgMinutes": 32.14,
          "target": 7,
          "progress": 1.0
        },
        "thisMonth": {
          "days": 31,
          "sessions": 31,
          "totalMinutes": 985,
          "avgMinutes": 31.77,
          "target": 31,
          "progress": 1.0
        },
        "thisYear": {
          "days": 31,
          "sessions": 31,
          "totalMinutes": 985,
          "avgMinutes": 31.77
        },
        "allTime": {
          "totalSessions": 4016,
          "totalMinutes": 127512,
          "avgMinutes": 31.75,
          "firstEntry": "2015-02-15",
          "totalDays": 4016
        }
      }
    },
    {
      "id": "rhythm_running",
      "type": "timed",
      "category": "movement",
      "subcategory": "running",
      "name": "Weekly Running",
      "target": {
        "frequency": "weekly",
        "minimum": 3,
        "unit": "sessions"
      },
      "streak": {
        "current": 156,
        "longest": 200,
        "lastCompleted": "2026-01-29",
        "startedAt": "2023-01-01"
      },
      "stats": { ... }
    }
  ],
  "meta": {
    "count": 5
  }
}
```

#### Get Single Rhythm

```http
GET /api/v1/rhythms/:id
Authorization: Bearer API_KEY
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | Stats period: today, week, month, year, all |
| `from` | YYYY-MM-DD | Custom range start |
| `to` | YYYY-MM-DD | Custom range end |

#### Get Rhythm History

```http
GET /api/v1/rhythms/:id/history
Authorization: Bearer API_KEY
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | day, week, month |
| `start` | YYYY-MM-DD | Range start |
| `end` | YYYY-MM-DD | Range end |
| `limit` | number | Max periods to return |

**Response (daily history):**
```json
{
  "data": {
    "rhythmId": "rhythm_meditation",
    "period": "day",
    "history": [
      {
        "date": "2026-01-31",
        "completed": true,
        "count": 1,
        "totalMinutes": 30,
        "streakDay": 4016
      },
      {
        "date": "2026-01-30",
        "completed": true,
        "count": 1,
        "totalMinutes": 35,
        "streakDay": 4015
      }
    ]
  }
}
```

#### Create/Update Rhythm

```http
POST /api/v1/rhythms
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "type": "timed",
  "category": "movement",
  "subcategory": "yoga",
  "name": "Weekly Yoga",
  "target": {
    "frequency": "weekly",
    "minimum": 2,
    "unit": "sessions"
  }
}
```

---

### Insights & Patterns

AI-powered pattern detection and correlations.

#### Get Patterns

```http
GET /api/v1/insights/patterns
Authorization: Bearer API_KEY
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `lookback` | number | Days to analyze (default 90, max 365) |
| `type` | string | Filter: correlation, temporal, sequence |
| `minConfidence` | string | low, medium, high |
| `category` | string | Focus on specific category |
| `refresh` | boolean | Force recalculation (expensive) |

**Response:**
```json
{
  "data": {
    "analyzedRange": {
      "start": "2025-11-01",
      "end": "2026-01-31",
      "days": 92,
      "entriesAnalyzed": 842
    },
    "patterns": [
      {
        "id": "pattern_meditation_productivity",
        "type": "correlation",
        "confidence": "high",
        "score": 0.82,
        "title": "Morning meditation boosts afternoon productivity",
        "description": "Days with meditation before 10 AM show 2.3x more accomplishments logged after 2 PM",
        "variables": {
          "predictor": {
            "type": "timed",
            "category": "mindfulness",
            "condition": "startTime.hour < 10"
          },
          "outcome": {
            "type": "tada",
            "category": "accomplishment",
            "condition": "startTime.hour >= 14"
          }
        },
        "evidence": {
          "meditationMorningDays": {
            "count": 78,
            "avgAfternoonTadas": 3.2
          },
          "noMeditationMorningDays": {
            "count": 14,
            "avgAfternoonTadas": 1.4
          },
          "ratio": 2.29,
          "pValue": 0.003
        },
        "firstDetected": "2025-12-15",
        "lastConfirmed": "2026-01-31"
      },
      {
        "id": "pattern_running_mood",
        "type": "correlation",
        "confidence": "medium",
        "score": 0.65,
        "title": "Running correlates with higher mood",
        "description": "Days with running entries show average mood of 8.2 vs 7.1 on non-running days",
        "variables": {
          "predictor": {
            "type": "timed",
            "category": "movement",
            "subcategory": "running"
          },
          "outcome": {
            "field": "mood",
            "aggregation": "average"
          }
        },
        "evidence": {
          "runningDays": {
            "count": 36,
            "avgMood": 8.2
          },
          "nonRunningDays": {
            "count": 56,
            "avgMood": 7.1
          },
          "difference": 1.1,
          "pValue": 0.02
        }
      },
      {
        "id": "pattern_weekly_accomplishments",
        "type": "temporal",
        "confidence": "high",
        "score": 0.88,
        "title": "Peak accomplishments on Tuesdays and Thursdays",
        "description": "You log significantly more accomplishments mid-week compared to weekends",
        "distribution": {
          "Monday": { "avg": 2.1, "stdDev": 0.8 },
          "Tuesday": { "avg": 3.8, "stdDev": 1.2 },
          "Wednesday": { "avg": 2.9, "stdDev": 1.0 },
          "Thursday": { "avg": 3.5, "stdDev": 1.1 },
          "Friday": { "avg": 2.4, "stdDev": 0.9 },
          "Saturday": { "avg": 1.8, "stdDev": 0.7 },
          "Sunday": { "avg": 1.3, "stdDev": 0.5 }
        },
        "peakDays": ["Tuesday", "Thursday"],
        "lowDays": ["Sunday"]
      },
      {
        "id": "pattern_meditation_duration_trend",
        "type": "trend",
        "confidence": "medium",
        "score": 0.58,
        "title": "Meditation duration increasing",
        "description": "Average meditation session has increased from 28m to 32m over the past 90 days",
        "trend": {
          "direction": "increasing",
          "startValue": 28.3,
          "endValue": 32.1,
          "changePercent": 13.4,
          "rSquared": 0.42
        }
      },
      {
        "id": "pattern_dream_recall",
        "type": "sequence",
        "confidence": "medium",
        "score": 0.61,
        "title": "Dream journaling peaks after meditation",
        "description": "Dream entries are 2.5x more likely the morning after evening meditation",
        "sequence": {
          "antecedent": {
            "type": "timed",
            "category": "mindfulness",
            "condition": "startTime.hour >= 20"
          },
          "consequent": {
            "type": "moment",
            "category": "journal",
            "subcategory": "dream",
            "condition": "within 12 hours"
          }
        },
        "evidence": {
          "eveningMeditationDays": {
            "count": 45,
            "dreamRecallRate": 0.62
          },
          "noEveningMeditationDays": {
            "count": 47,
            "dreamRecallRate": 0.25
          },
          "ratio": 2.48
        }
      }
    ]
  },
  "meta": {
    "computedAt": "2026-01-31T12:00:00Z",
    "computeTimeMs": 2340,
    "cached": true,
    "cacheExpiresAt": "2026-02-01T00:00:00Z"
  }
}
```

#### Get Correlations

Explore correlations between specific variables.

```http
GET /api/v1/insights/correlations
Authorization: Bearer API_KEY
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `variable1` | string | First variable: `category:mindfulness` |
| `variable2` | string | Second variable: `mood` or `category:accomplishment` |
| `lookback` | number | Days to analyze |

**Response:**
```json
{
  "data": {
    "correlation": 0.72,
    "interpretation": "strong positive",
    "sampleSize": 92,
    "pValue": 0.001,
    "visualization": {
      "type": "scatter",
      "xLabel": "Meditation Minutes",
      "yLabel": "Daily Mood",
      "points": [
        { "x": 30, "y": 8, "date": "2026-01-31" },
        { "x": 25, "y": 7, "date": "2026-01-30" }
      ]
    }
  }
}
```

#### Get Summary Statistics

```http
GET /api/v1/insights/summary
Authorization: Bearer API_KEY
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | today, week, month, year, custom |
| `start` | YYYY-MM-DD | Custom range start |
| `end` | YYYY-MM-DD | Custom range end |

**Response:**
```json
{
  "data": {
    "period": {
      "start": "2026-01-01",
      "end": "2026-01-31",
      "days": 31
    },
    "overview": {
      "totalEntries": 287,
      "entriesPerDay": 9.26,
      "uniqueCategories": 7,
      "uniqueSubcategories": 14
    },
    "byType": {
      "timed": {
        "count": 62,
        "totalMinutes": 2340,
        "avgDuration": 37.7
      },
      "tada": {
        "count": 87,
        "topCategories": ["work", "personal", "health"]
      },
      "tally": {
        "count": 124,
        "totalCount": 2456
      },
      "moment": {
        "count": 14
      }
    },
    "byCategory": {
      "mindfulness": {
        "entries": 31,
        "totalMinutes": 985,
        "streakDays": 31
      },
      "movement": {
        "entries": 12,
        "totalMinutes": 420
      },
      "accomplishment": {
        "entries": 87
      }
    },
    "mood": {
      "average": 7.6,
      "min": 4,
      "max": 10,
      "entriesWithMood": 45,
      "trend": "stable"
    },
    "energy": {
      "average": 6.8,
      "min": 3,
      "max": 9,
      "entriesWithEnergy": 42,
      "trend": "increasing"
    },
    "topTags": [
      { "tag": "morning", "count": 28 },
      { "tag": "work", "count": 24 },
      { "tag": "focus", "count": 19 }
    ],
    "streaks": {
      "meditation": { "current": 4016, "longest": 4016 },
      "journaling": { "current": 12, "longest": 45 }
    }
  }
}
```

---

### Export

#### Export Entries

```http
GET /api/v1/export/entries
Authorization: Bearer API_KEY
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | json, csv, markdown |
| `start` | YYYY-MM-DD | Range start |
| `end` | YYYY-MM-DD | Range end |
| `type` | string | Filter by type |
| `category` | string | Filter by category |
| `include` | string | Comma-separated: rhythms, insights, summary |

**Response (JSON):**
```json
{
  "export": {
    "format": "json",
    "generatedAt": "2026-01-31T12:00:00Z",
    "range": {
      "start": "2026-01-01",
      "end": "2026-01-31"
    },
    "entries": [ ... ],
    "rhythms": [ ... ],
    "insights": [ ... ],
    "summary": { ... }
  }
}
```

**Response (CSV):**
```csv
id,type,category,subcategory,emoji,title,startTime,endTime,duration,mood,energy,note,tags
entry_abc,timed,mindfulness,sitting,🧘,,2026-01-31T07:00:00Z,2026-01-31T07:30:00Z,1800,8,7,"Deep session","morning,deep"
```

**Response (Markdown):**
```markdown
# Ta-Da! Export: January 2026

## Summary
- Total entries: 287
- Meditation: 31 sessions (16h 25m)
- Accomplishments: 87 ta-das

## Entries

### 2026-01-31

🧘 **Meditation** (30m) - 7:00 AM
- Mood: 8/10
- Note: Deep session. Thoughts settled quickly.
- Tags: morning, deep

✅ **Finished tandem report** - 3:30 PM
- Category: work

...
```

#### Export to Obsidian Format

Optimized markdown for daily notes integration.

```http
GET /api/v1/export/obsidian
Authorization: Bearer API_KEY
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | YYYY-MM-DD | Single date export |
| `start` | YYYY-MM-DD | Range start |
| `end` | YYYY-MM-DD | Range end |
| `template` | string | daily, weekly, monthly |
| `sections` | string | Comma-separated: summary, entries, rhythms, insights |

**Response (Daily):**
```markdown
## Ta-Da! Summary

🧘 **Meditation:** 30m (Day 4,016 streak!)
🏃 **Running:** 5km in 28:15
**Mood:** 8/10 - Peaceful, focused

### Accomplishments

- ✅ Finished tandem evaluation report
- ✅ Updated research paper
- 📖 Read 2 chapters

### Journal

> Deep meditation session this morning. Noticed thoughts settling quickly. Productive afternoon following the sit.

### Rhythms

| Rhythm | Status | Progress |
|--------|--------|----------|
| Meditation | ✅ 30m | Day 4,016 |
| Running | ✅ 5km | 2/3 this week |
| Journaling | ✅ | 5/7 this week |
```

**Response (Weekly):**
```markdown
## Weekly Review: Jan 25-31, 2026

### Highlights

🧘 **Meditation:** 7/7 days - Perfect week! (3h 45m total)
🏃 **Movement:** 3 runs, 15km total
✅ **Accomplishments:** 12 ta-das logged

### Patterns Noticed

- Morning meditation → afternoon productivity (strong)
- Running days = higher mood (8.2 vs 7.1)

### Category Breakdown

| Category | Count | Time |
|----------|-------|------|
| Mindfulness | 7 | 225m |
| Movement | 5 | 180m |
| Accomplishment | 12 | - |
| Journal | 5 | - |

### Mood Trend

Mon: 7 → Tue: 8 → Wed: 8 → Thu: 7 → Fri: 9 → Sat: 8 → Sun: 7
Average: 7.7 ⬆️

### Top Tags

morning (7), work (5), focus (4), deep (3)
```

---

### Import

#### Import from CSV

```http
POST /api/v1/import/csv
Authorization: Bearer API_KEY
Content-Type: multipart/form-data

file: [CSV file]
options: {
  "mapping": {
    "Date": "startTime",
    "Duration (mins)": "duration",
    "Activity": "category"
  },
  "defaults": {
    "type": "timed",
    "source": "import"
  },
  "dryRun": true
}
```

**Response:**
```json
{
  "data": {
    "dryRun": true,
    "parsed": 365,
    "valid": 362,
    "invalid": 3,
    "duplicates": 12,
    "wouldCreate": 350,
    "errors": [
      { "row": 45, "error": "Invalid date format" },
      { "row": 123, "error": "Missing required field: category" }
    ],
    "preview": [
      { "row": 1, "parsed": { "type": "timed", ... }, "valid": true }
    ]
  }
}
```

#### Import from Insight Timer

```http
POST /api/v1/import/insight-timer
Authorization: Bearer API_KEY
Content-Type: multipart/form-data

file: [Insight Timer CSV export]
```

Pre-configured mapping for Insight Timer exports.

#### Import from JSON

```http
POST /api/v1/import/json
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "entries": [ ... ],
  "options": {
    "dryRun": false,
    "updateExisting": false,
    "source": "import"
  }
}
```

---

### Webhooks

Real-time notifications for external integrations.

#### List Webhooks

```http
GET /api/v1/webhooks
Authorization: Bearer API_KEY
```

**Response:**
```json
{
  "data": [
    {
      "id": "webhook_abc123",
      "url": "https://block.local/openclaw/webhook/tada",
      "events": ["entry.created", "streak.milestone"],
      "secret": "whsec_...",
      "active": true,
      "createdAt": "2026-01-15T12:00:00Z",
      "lastTriggeredAt": "2026-01-31T07:30:00Z",
      "stats": {
        "totalSent": 156,
        "lastWeek": 12,
        "failureRate": 0.02
      }
    }
  ]
}
```

#### Create Webhook

```http
POST /api/v1/webhooks
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "url": "https://block.local/openclaw/webhook/tada",
  "events": ["entry.created", "entry.updated", "streak.milestone", "rhythm.broken"],
  "secret": "your-webhook-secret"
}
```

**Available Events:**

| Event | Description | Payload |
|-------|-------------|---------|
| `entry.created` | New entry logged | Entry object |
| `entry.updated` | Entry modified | Entry object + changes |
| `entry.deleted` | Entry removed | Entry ID |
| `streak.milestone` | Hit streak milestone (100, 500, 1000, etc.) | Rhythm + milestone |
| `rhythm.broken` | Streak broken (rare!) | Rhythm object |
| `rhythm.completed` | Daily/weekly target met | Rhythm + stats |
| `pattern.detected` | New pattern discovered | Pattern object |
| `import.completed` | Bulk import finished | Import summary |

**Webhook Payload:**

```http
POST https://block.local/openclaw/webhook/tada
Content-Type: application/json
X-Tada-Event: entry.created
X-Tada-Signature: sha256=abc123...
X-Tada-Timestamp: 1706700600

{
  "event": "entry.created",
  "timestamp": "2026-01-31T07:30:00Z",
  "data": {
    "entry": { ... }
  },
  "webhook": {
    "id": "webhook_abc123"
  }
}
```

**Signature Verification:**

```javascript
const crypto = require('crypto')

function verifyWebhook(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}
```

#### Update Webhook

```http
PATCH /api/v1/webhooks/:id
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "events": ["entry.created"],
  "active": false
}
```

#### Delete Webhook

```http
DELETE /api/v1/webhooks/:id
Authorization: Bearer API_KEY
```

#### Test Webhook

```http
POST /api/v1/webhooks/:id/test
Authorization: Bearer API_KEY
```

Sends a test event to verify connectivity.

---

### User

#### Get Current User

```http
GET /api/v1/user
Authorization: Bearer API_KEY
```

**Response:**
```json
{
  "data": {
    "id": "user_abc123",
    "email": "caspar@example.com",
    "name": "Caspar",
    "timezone": "Europe/London",
    "settings": {
      "defaultCategory": "mindfulness",
      "weekStartsOn": "monday",
      "showStreaksOnHome": true
    },
    "stats": {
      "totalEntries": 15234,
      "memberSince": "2015-02-15",
      "longestStreak": 4016
    }
  }
}
```

#### Get User Settings

```http
GET /api/v1/user/settings
Authorization: Bearer API_KEY
```

#### Update User Settings

```http
PATCH /api/v1/user/settings
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "timezone": "America/New_York",
  "weekStartsOn": "sunday"
}
```

---

### Admin

Administrative endpoints for user management, system monitoring, and support operations. All admin endpoints require the requesting user to be listed in the `ADMIN_USER_IDS` environment variable. For API key authentication, the key must also have the corresponding `admin:*` permission scope.

**Permission Model:**
- Admin status is determined by the `ADMIN_USER_IDS` env var (comma-separated user IDs)
- Session-based auth: only checks admin status (sessions have all permissions)
- API key auth: checks admin status AND that the key has the required permission

**Admin Permissions:**
```typescript
type AdminPermission =
  | 'admin:stats'        // View site-wide statistics
  | 'admin:health'       // View system health and send test emails
  | 'admin:activity'     // View site-wide activity feed
  | 'admin:users'        // View user details
  | 'admin:users:write'  // Modify users, reset passwords, invalidate sessions
  | 'admin:feedback'     // View and manage feedback submissions
```

**Rate Limit:** All admin endpoints share the admin rate limit tier of 100 requests per minute.

#### Get Site Statistics

```http
GET /api/v1/admin/stats
Authorization: Bearer API_KEY
```

**Required Permission:** `admin:stats`

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `period` | string | Time period: `24h`, `7d`, `30d`, `90d`, `all` | `7d` |

**Response:**
```json
{
  "data": {
    "users": { "total": 142, "new": 12 },
    "entries": { "total": 15234, "new": 842 },
    "rhythms": { "total": 320, "new": 18 },
    "period": "7d"
  }
}
```

#### Get System Health

```http
GET /api/v1/admin/health
Authorization: Bearer API_KEY
```

**Required Permission:** `admin:health`

Returns detailed system health including database connectivity, table row counts, uptime, and environment info. Unlike the public `/api/v1/health` endpoint, this returns operational data.

**Response:**
```json
{
  "data": {
    "status": "healthy",
    "uptime": 86400,
    "database": {
      "status": "connected",
      "tables": {
        "users": 142,
        "entries": 15234,
        "rhythms": 320,
        "sessions": 45,
        "apiKeys": 12,
        "feedback": 8,
        "newsletterSubscribers": 230
      }
    },
    "cloudMode": true,
    "environment": "production"
  }
}
```

#### Get Activity Feed

```http
GET /api/v1/admin/activity
Authorization: Bearer API_KEY
```

**Required Permission:** `admin:activity`

Site-wide activity feed showing recent signups, logins, subscription changes, and password resets.

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `type` | string | Filter: `signup`, `subscription`, `login`, `password_reset` | all types |
| `limit` | number | Max results (1-200) | `50` |
| `offset` | number | Pagination offset | `0` |

**Response:**
```json
{
  "data": [
    {
      "type": "signup",
      "timestamp": "2026-01-31T12:00:00Z",
      "user": { "id": "user_abc123", "username": "caspar" },
      "details": {}
    },
    {
      "type": "subscription",
      "timestamp": "2026-01-31T11:00:00Z",
      "user": { "id": "user_xyz789", "username": "alice" },
      "details": { "event": "subscription_created" }
    }
  ],
  "meta": {
    "total": 256,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### List Users

```http
GET /api/v1/admin/users
Authorization: Bearer API_KEY
```

**Required Permission:** `admin:users`

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `tier` | string | Filter: `free`, `premium` | all |
| `status` | string | Filter: `active`, `cancelled`, `expired`, `past_due`, `suspended` | all |
| `search` | string | Search by username or email | |
| `sort` | string | Sort field: `createdAt`, `username`, `lastActiveAt` | `createdAt` |
| `order` | asc/desc | Sort order | `desc` |
| `limit` | number | Max results (1-200) | `50` |
| `offset` | number | Pagination offset | `0` |

**Response:**
```json
{
  "data": [
    {
      "id": "user_abc123",
      "username": "caspar",
      "email": "caspar@example.com",
      "emailVerified": true,
      "subscriptionTier": "premium",
      "subscriptionStatus": "active",
      "createdAt": "2015-02-15T00:00:00Z",
      "lastActiveAt": "2026-01-31T07:30:00Z",
      "stats": {
        "entryCount": 15234,
        "rhythmCount": 5
      }
    }
  ],
  "meta": {
    "total": 142,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Get User Detail

```http
GET /api/v1/admin/users/:id
Authorization: Bearer API_KEY
```

**Required Permission:** `admin:users`

Detailed view of a single user for support purposes. Includes subscription info, usage stats, and recent activity. Access is logged for audit purposes.

**Response:**
```json
{
  "data": {
    "id": "user_abc123",
    "username": "caspar",
    "email": "caspar@example.com",
    "emailVerified": true,
    "timezone": "Europe/London",
    "subscriptionTier": "premium",
    "subscriptionStatus": "active",
    "stripeCustomerId": "cus_xxx",
    "subscriptionExpiresAt": "2027-01-01T00:00:00Z",
    "createdAt": "2015-02-15T00:00:00Z",
    "updatedAt": "2026-01-31T07:30:00Z",
    "stats": {
      "entryCount": 15234,
      "rhythmCount": 5,
      "lastEntryAt": "2026-01-31T07:30:00Z",
      "firstEntryAt": "2015-02-15T08:00:00Z",
      "apiKeyCount": 2,
      "activeSessions": 3
    },
    "recentActivity": {
      "lastLogin": "2026-01-31T06:45:00Z",
      "loginsLast30d": 28,
      "entriesLast7d": 42
    }
  }
}
```

#### Update User

```http
PATCH /api/v1/admin/users/:id
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "subscriptionTier": "premium",
  "subscriptionStatus": "active",
  "subscriptionExpiresAt": "2027-01-01T00:00:00Z",
  "emailVerified": true
}
```

**Required Permission:** `admin:users:write`

**Updatable Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `subscriptionTier` | string | `free` or `premium` |
| `subscriptionStatus` | string | `active`, `cancelled`, `expired`, `past_due`, `suspended` |
| `subscriptionExpiresAt` | string/null | ISO 8601 datetime or null |
| `emailVerified` | boolean | Email verification status |

**Response:** Updated user object. Previous values are recorded in the audit log.

#### Trigger Password Reset

```http
POST /api/v1/admin/users/:id/reset-password
Authorization: Bearer API_KEY
```

**Required Permission:** `admin:users:write`

Triggers the standard password reset flow by sending a reset email to the user. Does not set the password directly.

**Response:**
```json
{
  "data": {
    "message": "Password reset email sent",
    "email": "caspar@example.com",
    "expiresAt": "2026-01-31T18:00:00Z"
  }
}
```

#### Invalidate User Sessions

```http
DELETE /api/v1/admin/users/:id/sessions
Authorization: Bearer API_KEY
```

**Required Permission:** `admin:users:write`

Invalidates all active sessions for a user. Useful when an account may be compromised or after a password reset.

**Response:**
```json
{
  "data": {
    "message": "All sessions invalidated",
    "sessionsRevoked": 3
  }
}
```

#### List Feedback

```http
GET /api/v1/admin/feedback
Authorization: Bearer API_KEY
```

**Required Permission:** `admin:feedback`

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `status` | string | Filter: `new`, `reviewed`, `in_progress`, `resolved`, `closed` | all |
| `type` | string | Filter: `bug`, `feedback`, `question` | all |
| `limit` | number | Max results (1-200) | `50` |
| `offset` | number | Pagination offset | `0` |

**Response:**
```json
{
  "data": [
    {
      "id": "fb_abc123",
      "type": "bug",
      "description": "Timer does not stop when app is backgrounded",
      "expectedBehavior": "Timer should continue running",
      "email": "user@example.com",
      "status": "new",
      "userId": "user_abc123",
      "username": "caspar",
      "systemInfo": { "browser": "Firefox 125", "os": "macOS" },
      "internalNotes": null,
      "resolvedAt": null,
      "createdAt": "2026-01-30T14:00:00Z",
      "updatedAt": "2026-01-30T14:00:00Z"
    }
  ],
  "meta": {
    "total": 8,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Update Feedback

```http
PATCH /api/v1/admin/feedback/:id
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "status": "in_progress",
  "internalNotes": "Confirmed bug on Firefox. Working on fix.",
  "replyEmail": "Thanks for reporting this! We've confirmed the issue and are working on a fix."
}
```

**Required Permission:** `admin:feedback`

**Body Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `new`, `reviewed`, `in_progress`, `resolved`, `closed` |
| `internalNotes` | string | Internal notes (not visible to user) |
| `replyEmail` | string | If provided, sends a reply email to the feedback submitter |

Setting status to `resolved` automatically sets `resolvedAt`. If `replyEmail` is provided and the feedback has an associated email, a reply is sent and recorded in internal notes.

**Response:** Updated feedback object. Includes `meta.emailSent: true` if a reply email was sent.

#### Send Test Email

```http
POST /api/v1/admin/test-email
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "to": "test@example.com",
  "template": "welcome"
}
```

**Required Permission:** `admin:health`

Sends a test email using one of the application's email templates. Useful for verifying SMTP configuration.

**Body Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `to` | string | Recipient email address (required) |
| `template` | string | Template name (default: `verify`) |

**Available Templates:** `verify`, `welcome`, `reset`, `changed`, `supporter`, `cancelled`, `payment-failed`, `payment-recovered`, `renewed`

**Response:**
```json
{
  "data": {
    "message": "Test \"welcome\" email sent to test@example.com"
  }
}
```

Returns 503 if SMTP is not configured.

---

## Error Handling

### Error Response Format

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

### Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request parameters |
| 400 | `INVALID_JSON` | Malformed JSON body |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 401 | `TOKEN_EXPIRED` | API key or session expired |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict (duplicate, etc.) |
| 422 | `UNPROCESSABLE` | Valid JSON but semantic error |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Maintenance or overload |

---

## Rate Limiting

**Limits:**

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Standard (GET) | 1000 | 1 hour |
| Write (POST/PATCH/DELETE) | 200 | 1 hour |
| Export | 50 | 1 hour |
| Pattern detection | 10 | 1 hour |
| Bulk operations | 20 | 1 hour |
| Admin | 100 | 1 minute |

**Headers:**

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1706745600
```

**429 Response:**

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "retryAfter": 3600
  }
}
```

---

## Pagination

### Offset-based (default)

```http
GET /api/v1/entries?limit=50&offset=100
```

**Response:**
```json
{
  "data": [ ... ],
  "meta": {
    "total": 4016,
    "limit": 50,
    "offset": 100,
    "hasMore": true
  }
}
```

### Cursor-based (for large datasets)

```http
GET /api/v1/entries?limit=50&cursor=eyJpZCI6ImVudHJ5X2FiYyJ9
```

**Response:**
```json
{
  "data": [ ... ],
  "meta": {
    "limit": 50,
    "nextCursor": "eyJpZCI6ImVudHJ5X3h5eiJ9",
    "hasMore": true
  }
}
```

---

## Versioning

API version in URL path: `/api/v1/`

**Deprecation:**
- 6-month notice before deprecating endpoints
- `X-API-Deprecated: true` header on deprecated endpoints
- `X-API-Sunset: 2026-07-01` header with removal date

---

## SDK Support (Future)

**Planned SDKs:**
- JavaScript/TypeScript (npm package)
- Python (pip package)
- CLI tool

**OpenClaw Skill:**
- Dedicated skill using this API
- See `/srv/brain/3_Resources/tada/OPENCLAW-SKILL.md`

---

## Changelog

### v1.0.0 (Planned)
- Initial API release
- All endpoints documented above

### v0.1.0 (MVP)
- GET /api/v1/entries
- GET /api/v1/rhythms
- Authentication (API keys)
- Basic export (JSON)

---

*API Specification v1.0*
*Last Updated: 2026-03-10*
*Maintainer: Caspar Addyman*
