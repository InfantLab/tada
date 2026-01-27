# Tada Testing

## Current Coverage (v0.2.0)

**133 tests passing (7 logger tests failing - pre-existing issue):**

- `utils/categoryDefaults.test.ts` (22 tests) - Category/emoji resolution
- `utils/columnDetection.test.ts` (20 tests) - CSV column auto-detection
- `utils/logger.test.ts` (10 tests) - Client-side logging
- `composables/useErrorTracker.test.ts` (26 tests) - Error tracking composable
- `server/utils/logger.test.ts` (13 tests, 7 failing) - Server-side logging
- `server/utils/password.test.ts` (14 tests) - Password hashing/verification
- `server/utils/csvParser.test.ts` (20 tests) - CSV parsing, date/duration detection
- `server/api/health.get.test.ts` (1 test) - Health check endpoint

**Integration tests (v0.4.0 planned):**

Integration tests for auth and import endpoints will be rewritten with `@nuxt/test-utils/e2e` as part of v0.4.0. Current integration tests:

- `tests/api/entries.integration.test.ts` - Entry CRUD with @nuxt/test-utils/e2e
- `tests/integration/entry-engine.test.ts` - Entry engine validation parity

**Coverage tool blocked:** `@vitest/coverage-v8` requires `node:inspector` which Bun doesn't implement yet.

## Running Tests

```bash
cd app
bun run test              # Run all tests (133 passing)
bun run test --watch      # Watch mode
```

## Writing Tests

### Unit Tests (co-located)

Test pure functions with no external dependencies:

```typescript
// utils/myUtil.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "./myUtil";

describe("myFunction", () => {
  it("should handle normal input", () => {
    expect(myFunction("input")).toBe("output");
  });

  it("should handle edge cases", () => {
    expect(myFunction(null)).toBe("default");
    expect(myFunction("")).toBe("default");
  });
});
```

### Integration Tests (tests/api/)

Test API endpoints via HTTP (requires @nuxt/test-utils/e2e setup):

```typescript
// tests/api/entries.test.ts
import { setup, $fetch } from "@nuxt/test-utils/e2e";

await setup({ server: true });

it("should create entry", async () => {
  const response = await $fetch("/api/entries", {
    method: "POST",
    body: { type: "tada", title: "Test" },
    headers: { Cookie: authCookie },
  });

  expect(response.id).toBeDefined();
});
```

## Test Principles

1. **Test behavior, not implementation**
2. **One assertion per test** (when practical)
3. **Descriptive test names** - `it("should X when Y")`
4. **Test edge cases** - null, empty, invalid input
5. **Clean up test data** in `afterEach`

## Next Steps

1. Fix e2e environment for integration tests
2. Add auth endpoint tests
3. Add entry CRUD integration tests
4. Add E2E tests for critical workflows
