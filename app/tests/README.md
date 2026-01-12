# Tada Test Suite

This directory contains the test suite for Tada v0.1.0.

## Test Structure

```
app/
├── utils/
│   ├── categoryDefaults.ts
│   ├── categoryDefaults.test.ts      ← Unit tests
│   ├── logger.ts
│   └── logger.test.ts                ← Unit tests
├── server/
│   ├── api/
│   │   ├── health.get.ts
│   │   ├── health.get.test.ts        ← Integration tests
│   │   └── entries/
│   │       ├── index.get.ts
│   │       ├── index.get.test.ts     ← Integration tests
│   │       ├── index.post.ts
│   │       ├── index.post.test.ts    ← Integration tests
│   │       ├── [id].patch.ts
│   │       ├── [id].patch.test.ts    ← Integration tests
│   │       ├── [id].delete.ts
│   │       └── [id].delete.test.ts   ← Integration tests
│   └── utils/
│       ├── logger.ts
│       └── logger.test.ts            ← Unit tests
└── tests/
    ├── README.md (this file)
    └── e2e/                          ← E2E tests (future)
```

## Running Tests

```bash
cd app

# Run all tests
bun run test

# Watch mode (auto-rerun on changes)
bun run test --watch

# Run specific test file
bun run test categoryDefaults.test.ts

# Run with coverage
bun run test:coverage

# Visual UI
bun run test:ui
```

## Test Coverage

Current target: **80%+ coverage**

Coverage includes:

- ✅ Utils (categoryDefaults, logger)
- ✅ Server utils (logger)
- ✅ API endpoints (entries CRUD, health)
- ⏳ Auth endpoints (TODO)
- ⏳ Components (TODO - if needed)

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./myFunction";

describe("myFunction", () => {
  it("should do something", () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### API Integration Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "~/server/db";
import { myTable } from "~/server/db/schema";
import myHandler from "./my-endpoint.ts";

describe("/api/my-endpoint", () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  it("should return data", async () => {
    const event = {
      context: { user: mockUser, session: {} },
      node: { req: {}, res: {} },
    } as any;

    const result = await myHandler(event);
    expect(result).toBeTruthy();
  });
});
```

## Test Philosophy

- **Test behavior, not implementation** - Focus on what the code does, not how
- **Keep tests simple** - One assertion per test when possible
- **Use descriptive names** - `it("should X when Y")`
- **Test edge cases** - null, empty arrays, boundary conditions
- **Mock external dependencies** - APIs, timers, file system
- **Clean up after yourself** - Always reset state in afterEach

## Common Patterns

### Mocking Database

Tests use the real SQLite database with proper cleanup. Each test:

1. Creates test users/entries in `beforeEach`
2. Runs the test
3. Cleans up in `afterEach`

### Mocking Timers

```typescript
import { vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("should wait", () => {
  const callback = vi.fn();
  setTimeout(callback, 1000);
  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
});
```

### Testing Async Code

```typescript
it("should fetch data", async () => {
  const result = await fetchData();
  expect(result).toBeTruthy();
});
```

### Testing Error Conditions

```typescript
it("should throw on invalid input", async () => {
  await expect(myFunction(invalidInput)).rejects.toThrow();
});
```

## CI Integration

Tests run automatically on:

- Push to main
- Pull requests

CI workflow runs:

1. `bun run lint` - Must pass
2. `bun run typecheck` - Must pass
3. `bun run test` - Must pass ✅
4. `bun run build` - Must succeed

## Future Additions

- [ ] Auth endpoint tests (login, register, logout)
- [ ] E2E tests for critical flows (timer, entry creation)
- [ ] Component tests (if complex components are added)
- [ ] Performance tests for large datasets

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Nuxt Test Utils](https://nuxt.com/docs/getting-started/testing)
- [Testing Best Practices](https://testingjavascript.com/)
