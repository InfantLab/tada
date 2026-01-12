# Testing Guide for Tada

## Overview

Tada uses a **two-tier testing strategy**:

- **Integration Tests (80%)**: Test complete API request/response cycles
- **Unit Tests (20%)**: Test isolated pure functions

## Test File Organization

```
app/
├── tests/
│   ├── api/                     # Integration tests
│   │   └── entries.integration.test.ts
│   ├── stubs/                   # Future feature stubs (v0.2.0+)
│   ├── setup.ts                 # Global test configuration
│   ├── TESTING_APPROACH.md      # Why we test this way
│   └── TESTING_GUIDE.md         # This file
├── utils/
│   ├── categoryDefaults.ts
│   └── categoryDefaults.test.ts # Unit tests co-located
└── server/
    ├── utils/
    │   ├── logger.ts
    │   └── logger.test.ts       # Unit tests co-located
    └── api/
        └── entries/
            └── index.get.ts     # NO .test.ts files here!
```

## Current Test Coverage (v0.1.0)

### ✅ Integration Tests (tests/api/)

- **entries.integration.test.ts** (29 tests)
  - GET /api/entries: Authentication, filtering, pagination, soft-delete handling
  - POST /api/entries: Creation, validation, all entry types
  - PATCH /api/entries/:id: Updates, authorization, field nullability
  - DELETE /api/entries/:id: Soft delete, restore, authorization

### ✅ Unit Tests (utils/, server/utils/)

- **categoryDefaults.test.ts** (22 tests)
  - Category/subcategory lookups
  - Emoji resolution fallbacks
  - Edge cases (null, empty, invalid)
- **server/utils/logger.test.ts** (10 tests)
  - Structured JSON logging
  - Log levels, file writing
  - Error handling
- **utils/logger.test.ts** (11 tests)
  - Client-side console logging
  - Module prefixes
  - Log filtering

## Writing Integration Tests

### When to Write

- Testing API endpoints
- Validating authentication
- Testing database operations **through the API**
- Testing request/response formats

### Template

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setup, fetch } from "@nuxt/test-utils/e2e";
import { db } from "~/server/db";
import { users, sessions } from "~/server/db/schema";
import { nanoid } from "nanoid";

describe("API Name Integration", async () => {
  await setup({ server: true });

  const testUserId = nanoid();
  let authCookie: string;

  beforeAll(async () => {
    // Create test user and session
    await db.insert(users).values({
      /* ... */
    });
    await db.insert(sessions).values({
      /* ... */
    });
    authCookie = `auth_session=${sessionId}`;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should handle authenticated request", async () => {
    const response = await fetch("/api/endpoint", {
      headers: { Cookie: authCookie },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({
      /* ... */
    });
  });
});
```

### Key Principles

1. **Test the HTTP layer**: Use `fetch()` not database calls
2. **Test authentication**: Always test both authenticated and unauthenticated
3. **Test authorization**: Verify users can't access others' data
4. **Test validation**: Send invalid data and verify errors
5. **Test edge cases**: Empty results, large datasets, soft-deleted records
6. **Clean up**: Always clean up test data in `afterAll` or `afterEach`

## Writing Unit Tests

### When to Write

- Testing pure functions (no side effects)
- Data transformations
- Utility functions
- Business logic with no external dependencies

### Template

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./myFunction";

describe("myFunction", () => {
  it("should handle normal input", () => {
    const result = myFunction("input");
    expect(result).toBe("expected");
  });

  it("should handle null/undefined", () => {
    expect(myFunction(null)).toBe("default");
    expect(myFunction(undefined)).toBe("default");
  });

  it("should handle edge cases", () => {
    expect(myFunction("")).toBe("default");
    expect(myFunction("invalid")).toBe("fallback");
  });
});
```

### Key Principles

1. **No external dependencies**: No database, no HTTP, no file I/O
2. **Test edge cases**: null, undefined, empty strings, invalid inputs
3. **Test fallbacks**: What happens when lookups fail?
4. **Fast**: Unit tests should run in milliseconds
5. **Co-located**: Keep test files next to the code they test

## What NOT to Test

### ❌ Don't Create Database-Layer Tests

```typescript
// BAD: This bypasses the API layer
it("should insert entry in database", async () => {
  await db.insert(entries).values({ /* ... */ });
  const result = await db.select()...;
  expect(result).toBeDefined();
});
```

```typescript
// GOOD: Test through the API
it("should create entry via POST", async () => {
  const response = await fetch("/api/entries", {
    method: "POST",
    body: JSON.stringify({
      /* ... */
    }),
  });
  expect(response.status).toBe(200);
});
```

### ❌ Don't Test Implementation Details

```typescript
// BAD: Testing internal function
it("should call hashPassword", () => {
  const spy = vi.spyOn(auth, "hashPassword");
  createUser("test", "password");
  expect(spy).toHaveBeenCalled();
});
```

```typescript
// GOOD: Test behavior
it("should not store plain text passwords", async () => {
  await fetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username: "test", password: "secret" }),
  });

  const [user] = await db.select().from(users).limit(1);
  expect(user.passwordHash).not.toBe("secret");
  expect(user.passwordHash.length).toBeGreaterThan(20);
});
```

### ❌ Don't Create Test Scripts in Root

```bash
# BAD
app/test-api.mjs
app/test-meditation-save.mjs

# GOOD
app/scripts/test-api.mjs
app/scripts/test-meditation-save.mjs
```

## Running Tests

```bash
cd app

# Run all tests
bun run test

# Run specific file
bun run test tests/api/entries.integration.test.ts

# Run with coverage
bun run test:coverage

# Run in watch mode
bun run test --watch

# Run only integration tests
bun run test tests/api

# Run only unit tests
bun run test utils/ server/utils/
```

## Test Coverage Goals

- **Integration Tests**: Cover all v0.1.0 API endpoints

  - ✅ GET /api/entries
  - ✅ POST /api/entries
  - ✅ PATCH /api/entries/:id
  - ✅ DELETE /api/entries/:id
  - ⏳ GET /api/auth/session (future)
  - ⏳ POST /api/auth/login (future)

- **Unit Tests**: 80%+ coverage for:
  - ✅ utils/categoryDefaults.ts
  - ✅ utils/logger.ts
  - ✅ server/utils/logger.ts
  - ⏳ server/utils/auth.ts (future)

## CI/CD Integration

Tests run automatically on:

- Every commit (local)
- Every PR (GitHub Actions)
- Before deployment

**Failing tests block deployment** — fix them before merging!

## Common Pitfalls

### 1. SQLite Database Locking

**Problem**: Tests running in parallel hit SQLITE_BUSY errors

**Solution**: Configure Vitest for single-fork execution

```typescript
// vitest.config.ts
export default defineVitestConfig({
  test: {
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true, // ← This fixes it
      },
    },
  },
});
```

### 2. Circular Dependencies

**Problem**: Importing `db` at module level causes initialization errors

**Solution**: Use dynamic imports in `beforeAll`

```typescript
let db: any;
beforeAll(async () => {
  const dbModule = await import("~/server/db");
  db = dbModule.db;
});
```

### 3. Test Isolation

**Problem**: Tests interfere with each other

**Solution**: Clean up data in `beforeEach` or use unique IDs

```typescript
beforeEach(async () => {
  await db.delete(entries).where(eq(entries.userId, testUserId));
});
```

### 4. Missing Test Database

**Problem**: Tests fail with "no such table"

**Solution**: Run migrations on test database

```bash
DATABASE_URL="file:./data/test.db" bun run db:migrate
```

## For AI Agents

When asked to write tests:

1. **Ask clarifying questions**:

   - "Is this an API endpoint or a utility function?"
   - "What edge cases should I cover?"

2. **Use the right test type**:

   - API endpoint → Integration test in `tests/api/`
   - Pure function → Unit test co-located with source

3. **Follow established patterns**:

   - Look at `tests/api/entries.integration.test.ts` for integration tests
   - Look at `utils/categoryDefaults.test.ts` for unit tests

4. **Don't create fake tests**:

   - No database-layer tests
   - No test scripts in root
   - No tests that skip the HTTP layer

5. **Be comprehensive**:
   - Test happy path
   - Test error cases
   - Test edge cases (null, empty, invalid)
   - Test authorization (can't access others' data)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [@nuxt/test-utils](https://nuxt.com/docs/getting-started/testing)
- [tests/TESTING_APPROACH.md](./TESTING_APPROACH.md) - Why we test this way
- [design/SDR.md](../../design/SDR.md) - Software requirements
