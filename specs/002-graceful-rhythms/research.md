# Research: Graceful Rhythm Chains

**Date**: 2026-01-17  
**Feature**: [spec.md](./spec.md)

## Technical Context Resolved

All NEEDS CLARIFICATION items from the plan have been resolved through codebase analysis.

### Existing Schema Analysis

The `rhythms` table already exists with these fields:

- `id`, `userId`, `name`, `description`
- `matchType`, `matchCategory`, `matchSubcategory`, `matchName` (direct matching)
- `activityMatchers` (JSON for complex cases)
- `goalType`, `goalValue`, `goalUnit` (goal definition)
- `frequency`, `frequencyTarget` (frequency settings)
- `currentStreak`, `longestStreak`, `lastCompletedDate` (cached streaks)

**Decision**: Extend existing schema rather than replace it.

**Rationale**: The existing schema has the foundation. We need to add:

- `durationThresholdSeconds` (integer) - minimum duration per day
- `panelPreferences` (JSON) - visibility settings for panel elements

**Alternatives considered**:

- Create new `graceful_rhythms` table → Rejected: duplicates existing functionality, migration complexity
- Store threshold in `goalValue` → Rejected: semantic confusion with existing usage

### Tier Calculation Strategy

**Decision**: Calculate tiers on-demand, no historical logging.

**Rationale**:

- Aligns with "no guilt" philosophy (no record of when user "failed")
- Simpler implementation
- Can always add logging later if needed

**Algorithm**:

1. Query entries matching rhythm criteria for current week
2. Sum duration per day
3. Count days meeting threshold
4. Map to tier: 7 = Daily, 5-6 = Most Days, 3-4 = Few Times, 1-2 = Weekly, 0 = Starting

### Chain Calculation Strategy

**Decision**: Calculate chains dynamically from entry data.

**Rationale**:

- Single source of truth (entries table)
- No cache invalidation issues
- Acceptable performance for 2 years of data (~730 days)

**Algorithm for "Daily" tier chain**:

1. Start from today, work backwards
2. For each day: sum entries matching criteria, check if >= threshold
3. Chain breaks when a day fails threshold
4. Track longest-ever as we iterate

**Optimization**: Cache `longestStreak` in rhythms table (update on new entry).

### Year Tracker Component

**Decision**: Build new `RhythmYearTracker.vue` component, not reuse existing `YearView.vue`.

**Rationale**:

- `YearView.vue` shows entry summaries, not streak heatmaps
- Different data shape (entry counts vs completion status per day)
- GitHub-style heatmap needs different rendering approach

**Design pattern**:

- 53 columns (weeks) × 7 rows (days)
- Color intensity: empty → partial → complete
- SVG or CSS grid for rendering

### Month Calendar Component

**Decision**: Build new `RhythmMonthCalendar.vue` inspired by Insight Timer screenshot.

**Rationale**:

- Existing `MonthView.vue` shows summary cards, not day-by-day calendar
- Need calendar grid with completion highlighting

**Design pattern**:

- MTWTFSS header row
- Weeks as rows, days as cells
- Green background for completed days (like Insight Timer)
- Navigation arrows for month switching

### Encouragement Messages

**Decision**: Store encouragements in new `encouragements` database table with seed data.

**Rationale**:

- Enables varied messaging without code changes
- Future: user-contributed encouragements
- Future: per-rhythm custom messages

**Schema**:

```
encouragements:
  id (UUID)
  stage (text): 'starting' | 'building' | 'becoming'
  context (text): 'tier_achieved' | 'streak_milestone' | 'general'
  message (text): "You're becoming a meditator"
  activityType (text): 'mindfulness' | 'general'
```

**Seed data**: 20-30 varied encouragement messages categorized by stage.

### API Structure

**Decision**: RESTful API under `/api/rhythms/`.

**Endpoints**:
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/rhythms` | List user's rhythms with summary |
| POST | `/api/rhythms` | Create new rhythm |
| GET | `/api/rhythms/:id` | Get rhythm details |
| PUT | `/api/rhythms/:id` | Update rhythm |
| DELETE | `/api/rhythms/:id` | Delete rhythm |
| GET | `/api/rhythms/:id/progress` | Get calculated progress (tiers, chains, stats) |

**Rationale**: Follows existing patterns (`/api/entries/`, `/api/presets/`).

### Responsive Layout

**Decision**: Mobile-first with CSS Grid/Flexbox breakpoints.

**Mobile (< 768px)**:

- Panels stacked vertically
- Year tracker scrollable horizontally or simplified
- Month calendar full width
- Touch-friendly tap targets (44px minimum)

**Desktop (≥ 768px)**:

- Year tracker and month view side-by-side when expanded
- More rhythms visible when collapsed
- Hover states for interactivity

## Dependencies

No new dependencies required. Uses existing:

- Drizzle ORM for database
- TailwindCSS for styling
- Vitest for testing
- Existing auth middleware

## Performance Considerations

| Operation           | Target  | Approach                                      |
| ------------------- | ------- | --------------------------------------------- |
| List rhythms        | < 100ms | Query rhythms table only (no chain calc)      |
| Get progress        | < 200ms | Limit query to 2 years, optimize with indexes |
| Year tracker render | < 50ms  | Pre-calculate on API, render 365 squares      |
| Create rhythm       | < 50ms  | Simple insert                                 |

**Index recommendations**:

- `entries(userId, category, timestamp)` - for rhythm matching
- `entries(userId, timestamp)` - for date range queries
