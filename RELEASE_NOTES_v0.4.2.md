# Ta-Da! v0.4.2 Release Notes

**Release Date:** March 2026
**Codename:** Clean Slate

---

## What's New in v0.4.2

A quality-focused release that brings Ta-Da! to full TypeScript strict mode compliance, improves voice input accuracy, adds operational safety with backup tooling, and polishes several UX rough edges. No new features to learn — just a more reliable, more correct codebase underneath.

---

## Highlights

### 294 Errors Fixed, Zero Remaining

The entire codebase now passes TypeScript strict mode and ESLint with zero errors — down from 220 TypeScript and 74 ESLint errors. This wasn't just suppressing warnings. The process uncovered **real bugs**:

- Insight cache queries referenced schema fields that don't exist (`createdAt` instead of `computedAt`, `cacheKey` instead of `id`)
- Auth event logging used `email_update` but the type system only accepts `email_change`
- Webhook updates tried to set a `lastDeliveredAt` field that was never in the schema
- API error helpers returned plain objects that weren't compatible with Nuxt's `createError()`

All fixed. TypeScript strict mode stays on — it caught things humans missed.

### Voice Input Gets Smarter

Voice-to-entry extraction is now significantly more accurate:

- **System/user message separation** — LLM providers now receive properly structured prompts instead of everything in one message
- **Few-shot examples** — The LLM sees example inputs and expected outputs, reducing ambiguous extractions
- **Subcategory extraction** — "Did yoga for 30 minutes" now correctly extracts subcategory "yoga" under Movement
- **Journal mode fixed** — Voice journal entries were silently failing; now they save correctly with proper `moments` category
- **Updated to Claude Haiku 4.5** for Anthropic provider

### Smarter Rhythm Heatmap

The rhythm heatmap popover got a complete rework:

- **Entry list on active days** — Clicking a completed day shows all matching entries with emoji, name, duration, and edit links (previously just "Activity logged")
- **Smart add-entry** — The "Add entry" button pre-fills the correct entry type (timed/tally/moment/tada) and date for the rhythm
- **Available everywhere** — Add-entry works on both empty and active days

### Timeline Date Search

Type natural dates into the timeline search bar:

- "march 2024" — jumps to March 2024
- "march 4, 2024" — jumps to that specific day
- "yesterday", "last week" — relative dates work too

### Backup & Operations

- **Automated backup scripts** for CapRover deployments (scheduled and on-demand)
- **Live-import script** for moving data between environments via `docker cp`
- **Session recovery** for interrupted timed entries

---

## Technical Changes

### Added

- `types/h3.d.ts` — H3 event context type augmentation for typed `event.context.auth`
- `H3ErrorInput` return type for all API error helpers (`apiError`, `unauthorized`, `forbidden`, `notFound`, `validationError`, `internalError`, `rateLimitExceeded`)
- Backup and import scripts for CapRover container management
- Fuzzy import deduplication logic
- API key management UI

### Changed

- All API error helpers now return `Partial<H3Error>` (was incompatible `ApiError` plain objects)
- `event.context.auth` typed as `ApiAuthContext | undefined` via module augmentation (was untyped index signature)
- All `Record<string, any>` replaced with `Record<string, unknown>` across services and schemas
- All index-signature property access uses bracket notation (`event.context['auth']` not `.auth`)
- Category alignment: rule-based fallback extractor uses correct 10-category ontology
- Anthropic voice provider updated to Claude Haiku 4.5

### Fixed

- Schema field mismatches in insight cache queries (`createdAt` → `computedAt`, `cacheKey` → `id`, `result` → `data`)
- Auth event type mismatch (`email_update` → `email_change`)
- Webhook update referencing non-existent `lastDeliveredAt` field
- `entries.get` pagination defaults (was `undefined`, now `100`/`0`)
- Obsidian export date parsing with `noUncheckedIndexedAccess`
- Voice journal mode (was calling missing `createVoiceEntry` method)
- Voice entries missing `category: "moments"` for moment subtypes
- Health endpoint using `db.execute` instead of `db.run`
- Production crash from readonly runtimeConfig assignment
- DevBanner using runtimeConfig instead of `window.location`

### Removed

- Unused imports, variables, and functions across 20+ files (cleaned by ESLint `no-unused-vars`)
- `EXTRACTION_PROMPT` constant from tadaExtractor (dead code)
- `ApiError` type import from response utils (replaced by `H3ErrorInput`)

---

## CI/CD

The `typecheck` and `lint` jobs in GitHub Actions were running with `continue-on-error: true` due to pre-existing errors. Both can now run as hard gates — zero errors in either.

---

## Upgrade Notes

**Breaking Changes:** None. All existing data is preserved.

**Self-hosted users:** No action required. This is a drop-in upgrade.

**CI/CD:** If you've forked the repo, you can remove `continue-on-error: true` from the `typecheck` and `lint` jobs in your GitHub Actions workflow.

---

## Philosophy

> "Clean code isn't about perfection — it's about honesty. When the type system says something is wrong, listen."

v0.4.2 is the release where we stopped ignoring the warnings. 294 errors sounds like a lot, but most were systematic — the same few patterns repeated across dozens of files. The real value wasn't in making the linter happy. It was in the half-dozen actual bugs that strict mode surfaced: queries hitting wrong database columns, auth events with mismatched type strings, API responses that didn't match what the framework expected. TypeScript strict mode earned its keep.

---

**Thank you for using Ta-Da!**
