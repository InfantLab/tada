# API Contracts: v0.2.0 Core Experience Completion

**Date**: 2026-01-14

## Timer Presets API

### GET /api/presets

List all presets for current user.

**Response 200**:

```json
{
  "presets": [
    {
      "id": "uuid",
      "name": "Morning Sit",
      "durationHint": 1200,
      "category": "mindfulness",
      "subcategory": "meditation",
      "bellConfig": { "intervals": [...] },
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

### POST /api/presets

Create new preset.

**Request**:

```json
{
  "name": "Morning Sit",
  "durationHint": 1200,
  "category": "mindfulness",
  "subcategory": "meditation",
  "bellConfig": { "intervals": [...] }
}
```

**Response 201**: Created preset object

### PUT /api/presets/:id

Update preset.

**Request**: Same as POST (partial update)
**Response 200**: Updated preset object

### DELETE /api/presets/:id

Delete preset.

**Response 204**: No content

---

## User Preferences API

### GET /api/preferences

Get current user's preferences.

**Response 200**:

```json
{
  "hiddenCategories": ["physical", "creative"],
  "hiddenEntryTypes": ["mood"],
  "customEmojis": { "mindfulness": "🪷" },
  "customEntryTypes": [{ "name": "gratitude", "emoji": "🙏" }]
}
```

### PUT /api/preferences

Update preferences (partial update, merges with existing).

**Request**:

```json
{
  "hiddenCategories": ["physical"],
  "customEmojis": { "mindfulness": "🪷" }
}
```

**Response 200**: Updated preferences object

---

## Entry API Extensions

### PUT /api/entries/:id

Update entry (existing, add emoji support).

**Request**:

```json
{
  "title": "Updated title",
  "content": "Updated content",
  "emoji": "🧘"
}
```

**Response 200**: Updated entry object

### DELETE /api/entries/:id

Delete single entry.

**Response 204**: No content

### DELETE /api/entries?category=:category

Bulk delete all entries in category.

**Query Params**:

- `category` (required): Category to delete

**Response 200**:

```json
{
  "deleted": 47
}
```

---

## Subcategory API

### GET /api/subcategories?category=:category

Get distinct subcategories for auto-complete.

**Query Params**:

- `category` (required): Filter by category

**Response 200**:

```json
{
  "subcategories": ["meditation", "breathing", "metta", "walking"]
}
```

---

## Error Responses

All endpoints return errors in format:

```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE"
}
```

| Code             | HTTP Status | Description                    |
| ---------------- | ----------- | ------------------------------ |
| UNAUTHORIZED     | 401         | Not authenticated              |
| NOT_FOUND        | 404         | Resource not found             |
| VALIDATION_ERROR | 400         | Invalid request data           |
| FORBIDDEN        | 403         | Not allowed to access resource |
