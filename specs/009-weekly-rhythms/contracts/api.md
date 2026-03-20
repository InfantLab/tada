# API Contracts: Weekly Rhythms

**Date**: 2026-03-18  
**Base URL**: `/api/weekly-rhythms`

## Endpoints Overview

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/weekly-rhythms/settings` | Read the current user's weekly-rhythm settings |
| PUT | `/api/weekly-rhythms/settings` | Update opt-ins, tier, and delivery channels |
| GET | `/api/weekly-rhythms/current` | Fetch the current in-app encouragement/celebration surfaces |
| GET | `/api/weekly-rhythms/history` | Fetch recent generated weekly messages |
| POST | `/api/weekly-rhythms/preview` | Generate a preview for testing without waiting for schedule time |
| POST | `/api/weekly-rhythms/messages/:id/dismiss` | Dismiss an in-app encouragement banner or celebration card |
| GET | `/api/weekly-rhythms/unsubscribe/:token` | One-click email unsubscribe |

## GET /api/weekly-rhythms/settings

Returns the current effective settings, including capability flags that affect available tiers.

### Response 200

```json
{
  "celebrationEnabled": true,
  "encouragementEnabled": true,
  "celebrationTier": "stats_only",
  "deliveryChannels": {
    "celebration": { "inApp": true, "email": true, "push": false },
    "encouragement": { "inApp": true, "email": false, "push": false }
  },
  "schedule": {
    "encouragementLocalTime": "15:03",
    "celebrationGenerateLocalTime": "03:33",
    "celebrationDeliverLocalTime": "08:08"
  },
  "email": {
    "address": "user@example.com",
    "configured": true,
    "unsubscribed": false,
    "consecutiveFailures": 0
  },
  "capabilities": {
    "privateAiAvailable": false,
    "cloudAiAvailable": true,
    "pushAvailable": false
  },
  "privacy": {
    "cloudAcknowledged": false
  }
}
```

## PUT /api/weekly-rhythms/settings

Creates or updates weekly-rhythm settings for the current user.

### Request Body

```json
{
  "celebrationEnabled": true,
  "encouragementEnabled": true,
  "celebrationTier": "cloud_factual",
  "deliveryChannels": {
    "celebration": { "inApp": true, "email": true, "push": false },
    "encouragement": { "inApp": true, "email": false, "push": false }
  },
  "acknowledgeCloudPrivacy": true
}
```

### Validation Rules

- `celebrationTier` must be one of `stats_only`, `private_ai`, `cloud_factual`, `cloud_creative`.
- Enabling email delivery requires `users.email` to be present.
- Selecting a cloud tier requires `acknowledgeCloudPrivacy: true` on first enable.
- Selecting `private_ai` when the instance cannot serve it returns a soft validation error with `available: false`.

### Response 200

```json
{
  "saved": true,
  "settings": {
    "celebrationEnabled": true,
    "encouragementEnabled": true,
    "celebrationTier": "cloud_factual"
  },
  "warnings": []
}
```

### Response 400

```json
{
  "error": "CLOUD_PRIVACY_ACK_REQUIRED",
  "message": "Acknowledge the cloud privacy notice before enabling a cloud AI tier"
}
```

### Response 409

```json
{
  "error": "PRIVATE_AI_UNAVAILABLE",
  "message": "Private AI is not available on this instance yet",
  "available": false
}
```

## GET /api/weekly-rhythms/current

Fetches the current user-visible weekly content for in-app surfaces.

### Response 200

```json
{
  "encouragement": {
    "id": "msg_enc_123",
    "weekStartDate": "2026-03-16",
    "title": "There is still room in this week",
    "summaryBlocks": [
      {
        "section": "general_progress",
        "heading": "Your week so far",
        "lines": ["3 sessions logged", "1h 12m of mindful time"]
      },
      {
        "section": "stretch_goals",
        "heading": "Small moves that would count",
        "lines": ["One more meditation matches last week"]
      }
    ],
    "dismissedAt": null
  },
  "celebration": {
    "id": "msg_cel_456",
    "weekStartDate": "2026-03-09",
    "title": "Your week in Ta-Da!",
    "summaryBlocks": [
      {
        "section": "general_progress",
        "heading": "General progress",
        "lines": ["7 ta-das", "4 sessions totaling 2h 13m"]
      },
      {
        "section": "rhythm_wins",
        "heading": "Rhythm wins",
        "lines": ["Meditation chain extended to 23 days"]
      }
    ],
    "narrativeText": null
  }
}
```

## GET /api/weekly-rhythms/history

Returns recent generated messages for the current user.

### Query Parameters

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `kind` | string | all | `celebration`, `encouragement`, or omitted |
| `limit` | number | 8 | Max records to return, 1-26 |

### Response 200

```json
{
  "messages": [
    {
      "id": "msg_cel_456",
      "kind": "celebration",
      "weekStartDate": "2026-03-09",
      "tierApplied": "stats_only",
      "status": "delivered",
      "title": "Your week in Ta-Da!",
      "createdAt": "2026-03-16T03:33:12.000Z"
    }
  ]
}
```

## POST /api/weekly-rhythms/preview

Generates a preview for the authenticated user without waiting for the scheduler. Intended for UI preview and development testing.

### Request Body

```json
{
  "kind": "celebration",
  "tierOverride": "cloud_creative",
  "weekStartDate": "2026-03-09"
}
```

### Behavior

- Does not send email.
- May persist a temporary snapshot for debugging, but should not create a duplicate weekly message for the same user/week/kind.
- Uses the same sanitization and fallback rules as scheduled generation.

### Response 200

```json
{
  "kind": "celebration",
  "tierRequested": "cloud_creative",
  "tierApplied": "stats_only",
  "fallbackReason": "cloud_provider_unavailable",
  "preview": {
    "title": "Your week in Ta-Da!",
    "summaryBlocks": [
      {
        "section": "general_progress",
        "heading": "General progress",
        "lines": ["Quiet week, but you still showed up"]
      }
    ],
    "narrativeText": null
  }
}
```

## POST /api/weekly-rhythms/messages/:id/dismiss

Marks an in-app artifact as dismissed.

### Response 200

```json
{
  "dismissed": true,
  "messageId": "msg_enc_123"
}
```

## GET /api/weekly-rhythms/unsubscribe/:token

One-click unsubscribe endpoint linked from weekly-rhythm emails.

### Behavior

- Validates a signed token.
- Disables weekly-rhythm email channels while preserving in-app delivery.
- Returns a simple HTML confirmation page or redirects to settings.

### Response 200

```json
{
  "unsubscribed": true,
  "scope": "weekly_rhythms_email"
}
```

### Response 400

```json
{
  "error": "INVALID_UNSUBSCRIBE_TOKEN",
  "message": "This unsubscribe link is invalid or has expired"
}
```

## Internal Service Contract Notes

- Scheduler must treat `(userId, kind, weekStartDate)` as idempotency keys.
- Email send retries should use exponential backoff and append `weekly_delivery_attempts` rows instead of mutating a single attempt record.
- AI adapters accept `WeeklyNarrativeInput` only.
- In-app retrieval always reads persisted `weekly_messages`; it never re-renders on the fly.