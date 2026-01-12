# Test Stubs for v0.2.0 Features

This directory contains test stubs for upcoming v0.2.0 features. These tests are currently marked as `test.todo()` or `test.skip()` and will be implemented as features are developed.

## Planned Tests

### Habits API (v0.2.0)

- [ ] GET /api/habits - List user habits
- [ ] POST /api/habits - Create habit
- [ ] PATCH /api/habits/:id - Update habit
- [ ] DELETE /api/habits/:id - Delete habit
- [ ] GET /api/habits/:id/progress - Get habit progress/stats
- [ ] Habit matching logic - Entry → Habit association

### Streak Calculations (v0.2.0)

- [ ] Calculate streak from entries
- [ ] Handle timezone correctly
- [ ] Handle gaps/misses
- [ ] Longest streak calculation
- [ ] Current streak calculation

### Entry Aggregation (v0.2.0)

- [ ] Daily summaries
- [ ] Weekly summaries
- [ ] Category totals
- [ ] Time-of-day patterns

### Data Import (v0.2.0+)

- [ ] CSV import
- [ ] Deduplication logic
- [ ] Validation
- [ ] Error handling

## Creating Test Stubs

When planning a feature, create a test stub:

```typescript
import { describe, it, expect, test } from "vitest";

describe("upcoming feature", () => {
  test.todo("should implement core behavior");

  test.skip("stub for complex case", () => {
    // Rough implementation that will be refined
    expect(true).toBe(true);
  });
});
```

## Running Stubs

```bash
# Show TODO tests
bun run test -- --reporter=verbose

# Run skipped tests (for development)
bun run test -- --run
```

---

**Note:** This file serves as a planning document. As features are implemented, tests move from stubs → full implementation in their respective files.
