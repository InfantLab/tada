# API Contracts: Graceful Rhythm Chains

**Date**: 2026-01-17  
**Base URL**: `/api/rhythms`

## Endpoints Overview

| Method | Path                        | Description                        |
| ------ | --------------------------- | ---------------------------------- |
| GET    | `/api/rhythms`              | List user's rhythms with summaries |
| POST   | `/api/rhythms`              | Create a new rhythm                |
| GET    | `/api/rhythms/:id`          | Get rhythm details                 |
| PUT    | `/api/rhythms/:id`          | Update rhythm                      |
| DELETE | `/api/rhythms/:id`          | Delete rhythm                      |
| GET    | `/api/rhythms/:id/progress` | Get calculated progress data       |

---

## GET /api/rhythms

List all rhythms for the authenticated user with summary data for collapsed view.

### Request

```http
GET /api/rhythms
Authorization: Bearer <session_token>
```

### Response 200

```json
{
  "rhythms": [
    {
      "id": "uuid-1",
      "name": "Daily Meditation",
      "emoji": "🧘",
      "matchCategory": "mindfulness",
      "durationThresholdSeconds": 360,
      "frequency": "daily",
      "currentTier": "most_days",
      "currentTierLabel": "Most Days",
      "currentChainDays": 12,
      "currentChainWeeks": 2,
      "panelPreferences": {
        "showYearTracker": true,
        "showMonthCalendar": true,
        "showChainStats": true,
        "monthViewMode": "calendar",
        "expandedByDefault": true
      },
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### Response 401

```json
{
  "error": "Unauthorized"
}
```

---

## POST /api/rhythms

Create a new rhythm.

### Request

```http
POST /api/rhythms
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "name": "Daily Meditation",
  "matchCategory": "mindfulness",
  "matchSubcategory": null,
  "matchType": "timed",
  "durationThresholdSeconds": 360,
  "frequency": "daily",
  "goalType": "duration",
  "goalValue": 6,
  "goalUnit": "minutes"
}
```

### Response 201

```json
{
  "id": "uuid-new",
  "name": "Daily Meditation",
  "matchCategory": "mindfulness",
  "durationThresholdSeconds": 360,
  "frequency": "daily",
  "createdAt": "2026-01-17T12:00:00Z"
}
```

### Response 400

```json
{
  "error": "Validation failed",
  "details": {
    "name": "Name is required"
  }
}
```

---

## GET /api/rhythms/:id

Get full rhythm details (without progress calculation).

### Request

```http
GET /api/rhythms/uuid-1
Authorization: Bearer <session_token>
```

### Response 200

```json
{
  "id": "uuid-1",
  "name": "Daily Meditation",
  "description": null,
  "matchType": "timed",
  "matchCategory": "mindfulness",
  "matchSubcategory": null,
  "matchName": null,
  "durationThresholdSeconds": 360,
  "frequency": "daily",
  "frequencyTarget": null,
  "goalType": "duration",
  "goalValue": 6,
  "goalUnit": "minutes",
  "currentStreak": 12,
  "longestStreak": 23,
  "lastCompletedDate": "2026-01-17",
  "panelPreferences": {
    "showYearTracker": true,
    "showMonthCalendar": true,
    "showChainStats": true,
    "monthViewMode": "calendar",
    "expandedByDefault": true
  },
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-17T00:00:00Z"
}
```

### Response 404

```json
{
  "error": "Rhythm not found"
}
```

---

## PUT /api/rhythms/:id

Update a rhythm.

### Request

```http
PUT /api/rhythms/uuid-1
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "name": "Morning Meditation",
  "durationThresholdSeconds": 600,
  "panelPreferences": {
    "showYearTracker": true,
    "showMonthCalendar": false,
    "showChainStats": true,
    "monthViewMode": "linear",
    "expandedByDefault": false
  }
}
```

### Response 200

```json
{
  "id": "uuid-1",
  "name": "Morning Meditation",
  "durationThresholdSeconds": 600,
  "updatedAt": "2026-01-17T12:30:00Z"
}
```

### Response 403

```json
{
  "error": "Not authorized to update this rhythm"
}
```

---

## DELETE /api/rhythms/:id

Delete a rhythm (entries are preserved).

### Request

```http
DELETE /api/rhythms/uuid-1
Authorization: Bearer <session_token>
```

### Response 204

(No content)

### Response 403

```json
{
  "error": "Not authorized to delete this rhythm"
}
```

---

## GET /api/rhythms/:id/progress

Get calculated progress data for a rhythm (tiers, chains, day-by-day data).

### Request

```http
GET /api/rhythms/uuid-1/progress?year=2026
Authorization: Bearer <session_token>
```

### Query Parameters

| Param  | Type   | Default      | Description              |
| ------ | ------ | ------------ | ------------------------ |
| `year` | number | current year | Year for day-by-day data |

### Response 200

```json
{
  "rhythmId": "uuid-1",

  "currentWeek": {
    "startDate": "2026-01-13",
    "daysCompleted": 4,
    "achievedTier": "few_times",
    "bestPossibleTier": "daily",
    "daysRemaining": 3,
    "nudgeMessage": "3 more times to hit 'Daily'"
  },

  "chains": [
    { "tier": "daily", "current": 0, "longest": 14 },
    { "tier": "most_days", "current": 3, "longest": 8 },
    { "tier": "few_times", "current": 6, "longest": 12 },
    { "tier": "weekly", "current": 10, "longest": 20 }
  ],

  "days": [
    {
      "date": "2026-01-01",
      "totalSeconds": 720,
      "isComplete": true,
      "entryCount": 1
    },
    {
      "date": "2026-01-02",
      "totalSeconds": 0,
      "isComplete": false,
      "entryCount": 0
    },
    {
      "date": "2026-01-03",
      "totalSeconds": 420,
      "isComplete": true,
      "entryCount": 2
    }
  ],

  "totals": {
    "totalSessions": 47,
    "totalSeconds": 42300,
    "totalHours": 11.75,
    "firstEntryDate": "2025-11-15",
    "weeksActive": 9
  },

  "journeyStage": "becoming",
  "encouragement": "You're becoming a meditator"
}
```

---

## Error Responses

All endpoints may return these errors:

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```
