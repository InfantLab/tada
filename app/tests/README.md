# Tada Testing

## Current Coverage (v0.1.0)

**60 tests passing:**

- `utils/categoryDefaults.test.ts` (22 tests) - Category/emoji resolution
- `utils/logger.test.ts` (11 tests) - Client-side logging
- `server/utils/logger.test.ts` (13 tests) - Server-side logging
- `server/utils/password.test.ts` (14 tests) - Password hashing/verification

**Missing coverage:**

- ❌ API endpoints (entries CRUD, auth, health) - e2e environment broken
- ❌ Auth middleware and session management - requires HTTP context
- ❌ Database operations - no direct tests yet
- ❌ E2E user flows - blocked on @nuxt/test-utils/e2e

**Integration tests blocked:** `@nuxt/test-utils/e2e` fails with port timeout. Cannot test HTTP layer until environment is fixed.

**Coverage tool blocked:** `@vitest/coverage-v8` requires `node:inspector` which Bun doesn't implement yet.

## Running Tests

```bash
cd app
bun run test              # Run all tests (60 passing, 1 integration blocked)
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
