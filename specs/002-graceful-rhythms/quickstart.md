# Quickstart: Graceful Rhythm Chains

**Date**: 2026-01-17  
**Feature**: [spec.md](./spec.md)

## Getting Started

This document provides a quick guide for implementing the Graceful Rhythm Chains feature.

## Prerequisites

- Existing Tada development environment running (`bun run dev`)
- Database with existing `rhythms` table
- Understanding of Nuxt 3 / Vue 3 patterns

## Implementation Order

### Phase 1: Database & API Foundation

1. **Schema Migration** (30 min)
   - Add `durationThresholdSeconds` to `rhythms` table
   - Add `panelPreferences` JSON column
   - Create `encouragements` table
   - Seed encouragements data

2. **Tier Calculator Utility** (1 hour)
   - Create `app/utils/tierCalculator.ts`
   - Pure functions for tier calculation
   - Write unit tests first (TDD)

3. **Rhythms CRUD API** (2 hours)
   - `GET /api/rhythms` - list with summaries
   - `POST /api/rhythms` - create
   - `GET /api/rhythms/:id` - details
   - `PUT /api/rhythms/:id` - update
   - `DELETE /api/rhythms/:id` - delete

4. **Progress API** (2 hours)
   - `GET /api/rhythms/:id/progress`
   - Calculate tiers, chains, day status
   - Select encouragement message

### Phase 2: Core Components

5. **RhythmYearTracker** (2 hours)
   - GitHub-style heatmap for calendar year
   - Year navigation (previous years)
   - 53×7 grid of day squares

6. **RhythmMonthCalendar** (2 hours)
   - Calendar grid view (MTWTFSS)
   - Insight Timer-style completion highlighting
   - Month navigation
   - Linear week toggle

7. **RhythmChainStats** (1 hour)
   - Display chains by tier
   - Current (prominent) and longest (subtle)

8. **RhythmEncouragement** (30 min)
   - Identity-based message display
   - Journey stage indicator

### Phase 3: Panel & Page

9. **RhythmPanel** (2 hours)
   - Accordion collapse/expand
   - Combine all visualization components
   - Collapsed summary header

10. **Rhythms Page Rewrite** (2 hours)
    - Replace placeholder with real implementation
    - Multiple rhythm panels
    - Create/edit modal
    - Empty state

### Phase 4: Polish

11. **RhythmCreateModal** (1.5 hours)
    - Form for creating/editing rhythms
    - Duration threshold selector
    - Frequency options
    - Category picker

12. **useRhythms Composable** (1 hour)
    - State management for rhythms
    - Caching and refetching

13. **Responsive Layout** (1 hour)
    - Mobile optimizations
    - Desktop side-by-side layout

14. **Integration Testing** (1 hour)
    - End-to-end flow tests
    - API contract verification

## Key Files to Create

```text
app/
├── server/
│   ├── api/rhythms/
│   │   ├── index.get.ts
│   │   ├── index.post.ts
│   │   ├── [id].get.ts
│   │   ├── [id].put.ts
│   │   ├── [id].delete.ts
│   │   └── [id]/progress.get.ts
│   ├── db/migrations/
│   │   └── 000X_rhythms_extension.sql
│   └── utils/
│       └── rhythmCalculator.ts
├── components/
│   ├── RhythmPanel.vue
│   ├── RhythmYearTracker.vue
│   ├── RhythmMonthCalendar.vue
│   ├── RhythmChainStats.vue
│   ├── RhythmEncouragement.vue
│   └── RhythmCreateModal.vue
├── composables/
│   └── useRhythms.ts
├── utils/
│   ├── tierCalculator.ts
│   └── tierCalculator.test.ts
└── pages/
    └── rhythms.vue (rewrite)
```

## Key Patterns to Follow

### API Endpoints

Follow existing patterns from `/api/entries/`:

- Use `requireAuth()` middleware
- Use `createLogger()` for logging
- Return proper HTTP status codes
- Validate input with Zod

### Components

Follow existing component patterns:

- Props interface with `defineProps`
- Emit events for parent communication
- Use `ref()` and `computed()` for state
- TailwindCSS for styling

### Testing

Follow existing test patterns:

- Co-locate tests with source (`.test.ts`)
- Use Vitest
- Test pure functions thoroughly
- Stub API calls in component tests

## Common Gotchas

1. **Timezone handling**: All dates in entries use ISO 8601. Calculate local week boundaries on the server using user's timezone from `users.timezone`.

2. **Performance**: The progress endpoint queries up to 730 days of entries. Use indexed queries and consider caching for heavy users.

3. **Tier calculation direction**: Calculate chains by walking backwards from today, not forwards from first entry.

4. **Encouragement selection**: Select randomly from matching stage/context to ensure variety.

## Verification Checklist

- [ ] Can create a rhythm with duration threshold
- [ ] Year tracker shows calendar year with completion status
- [ ] Month calendar shows days with Insight Timer-style highlighting
- [ ] Chain stats show current and longest for each tier
- [ ] Encouragement messages vary on refresh
- [ ] Multiple rhythms display in accordion
- [ ] Collapsed panels show summary
- [ ] Mobile layout is usable one-handed
- [ ] Desktop layout uses space efficiently
