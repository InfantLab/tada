# Testing Guide

Tada has a comprehensive test suite with 80%+ coverage of v0.1.0 features.

## Quick Start

```bash
cd app

# Run all tests
bun run test

# Run full verification (lint + typecheck + test + coverage)
bun run verify-tests

# Watch mode
bun run test --watch

# Coverage report
bun run test:coverage

# Visual UI
bun run test:ui
```

## Documentation

- **[Testing README](../../app/tests/README.md)** - Complete testing guide
- **[Test Stubs](../../app/tests/stubs/README.md)** - Future test plans (v0.2.0)

## Test Structure

Tests are co-located with source files:

```
app/
├── utils/
│   ├── categoryDefaults.ts
│   └── categoryDefaults.test.ts    ← Unit test
├── server/
│   └── api/
│       └── entries/
│           ├── index.get.ts
│           └── index.get.test.ts   ← Integration test
└── tests/
    ├── setup.ts                     ← Global test setup
    └── stubs/                       ← Future test stubs
```

## Coverage

Current: **~80%** of v0.1.0 features

### Tested ✅

- Entry CRUD operations
- Authentication checks
- User isolation
- Category/emoji system
- Logging infrastructure
- Soft delete

### TODO ⏳

- Auth endpoints (login, register, logout)
- Habits API (v0.2.0)
- E2E flows (v0.2.0)

## CI Integration

Tests run automatically on:

- Every push to main
- Every pull request

See [.github/workflows/ci.yml](../../.github/workflows/ci.yml)

## Writing Tests

See examples in any `*.test.ts` file:

- [categoryDefaults.test.ts](../../app/utils/categoryDefaults.test.ts) - Unit test example
- [index.get.test.ts](../../app/server/api/entries/index.get.test.ts) - API test example

---

For complete documentation, see [app/tests/README.md](../../app/tests/README.md)
