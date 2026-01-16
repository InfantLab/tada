# Entry Editing System Refactor

**Created:** 2026-01-15  
**Status:** In Progress  
**Goal:** Unified, DRY entry saving with comprehensive edit capabilities

---

## Overview

Refactor entry creation and editing to:

1. Consolidate save logic into a reusable composable
2. Provide full edit capabilities for all entry fields
3. Create reusable input components (datetime, duration, category pickers)
4. Ensure one-click access to full data visibility

---

## Tasks

### Phase 1: Foundation

- [x] **T1.1** Create `useEntrySave` composable ✅

  - Unified validation
  - Emoji resolution using `resolveEmojiForNewEntry()`
  - Toast notifications for success/error
  - Returns save function and loading state
  - File: `app/composables/useEntrySave.ts`

- [x] **T1.2** Create `DateTimeInput.vue` component ✅

  - Nice date and time selection
  - Supports datetime-local with better UX
  - Mobile-friendly
  - File: `app/components/DateTimeInput.vue`

- [x] **T1.3** Create `DurationInput.vue` component ✅
  - Minutes and seconds inputs
  - Or total seconds
  - Validation for non-negative values
  - File: `app/components/DurationInput.vue`

### Phase 2: Full Edit Page Enhancement

- [x] **T2.1** Add category selector to `entry/[id].vue` ✅

  - Use existing category options from `categoryDefaults.ts`
  - Filter by visibility preferences

- [x] **T2.2** Add subcategory selector to `entry/[id].vue` ✅

  - Dynamic based on selected category
  - Updates when category changes

- [x] **T2.3** Add emoji picker to `entry/[id].vue` ✅

  - Use existing `EmojiPicker.vue` component
  - Show current emoji with edit button

- [x] **T2.4** Add duration editor to `entry/[id].vue` ✅

  - Use new `DurationInput.vue`
  - Only show for entries with duration

- [x] **T2.5** Add "Advanced" section to `entry/[id].vue` ✅
  - Show type (read-only)
  - Show `data` JSON blob (read-only)
  - Show source (read-only)
  - Show createdAt, updatedAt (read-only)

### Phase 3: Refactor Existing Save Calls

- [x] **T3.1** Refactor `timer.vue` to use `useEntrySave` ✅
- [x] **T3.2** Refactor `add.vue` to use `useEntrySave` ✅
- [x] **T3.3** Refactor `tada/add.vue` to use `useEntrySave` ✅
- [x] **T3.4** Refactor `entry/[id].vue` to use `useEntrySave` ✅

### Phase 4: Polish

- [ ] **T4.1** Add "Edit" link from timeline hover/tap
- [ ] **T4.2** Ensure all toast messages are consistent
- [ ] **T4.3** Test all entry types can be fully edited

---

## Current Entry Save Locations

| File                   | Method         | Entry Types                | Status            |
| ---------------------- | -------------- | -------------------------- | ----------------- |
| `pages/timer.vue`      | POST           | timed                      | Needs refactor    |
| `pages/add.vue`        | POST           | tada, dream, note, journal | Needs refactor    |
| `pages/tada/add.vue`   | POST           | tada                       | Needs refactor    |
| `pages/entry/[id].vue` | PATCH          | all                        | Needs enhancement |
| `pages/entry/[id].vue` | POST (restore) | all                        | Needs refactor    |
| `pages/tada.vue`       | PATCH (emoji)  | tada                       | OK (simple)       |

---

## Entry Fields Reference

```typescript
// Editable by user
name: string           // Title/description
category: string       // Life domain
subcategory: string    // Specific activity
emoji: string          // Visual identifier
timestamp: string      // When it happened (ISO 8601)
durationSeconds: number // How long (optional)
timezone: string       // Original timezone
data: object           // Type-specific JSON
tags: string[]         // Labels
notes: string          // Additional text

// System-managed (read-only in UI)
id: string             // UUID
userId: string         // Owner
type: string           // Entry type (rarely changed)
source: string         // 'manual', 'import', etc.
externalId: string     // For deduplication
createdAt: string      // Audit
updatedAt: string      // Audit
deletedAt: string      // Soft delete
```

---

## API Endpoints

- `POST /api/entries` - Create new entry
- `PATCH /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry
- `GET /api/entries/:id` - Get single entry

All endpoints support all entry fields consistently.
