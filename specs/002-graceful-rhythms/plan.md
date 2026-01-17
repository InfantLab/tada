# Implementation Plan: Graceful Rhythm Chains

**Branch**: `002-graceful-rhythms` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-graceful-rhythms/spec.md`

## Summary

Implement graceful rhythm chains with tiered frequency targets (Daily, Most Days, Few Times, Weekly) that celebrate achievements rather than breaking chains. Timer-based rhythms for mindfulness category with duration thresholds, GitHub-style year tracker, calendar month view, accordion panels for multiple rhythms, and identity-based encouragement messaging from a database of varied phrases.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3.4+, Nuxt 3.x  
**Primary Dependencies**: Drizzle ORM, TailwindCSS, Lucia Auth  
**Storage**: SQLite via Drizzle (existing database)  
**Testing**: Vitest (unit tests co-located with source)  
**Target Platform**: PWA (mobile-first, works on desktop)  
**Project Type**: Web application (Nuxt full-stack)  
**Performance Goals**: Rhythm calculations < 200ms for 1000+ entries  
**Constraints**: Mobile-first, offline-capable, one-hand navigation  
**Scale/Scope**: Single user per instance (self-hosted), up to 50+ rhythms, 2 years of data

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

No constitution violations detected. Project follows existing patterns:

- ✅ Co-located tests with source
- ✅ Type-safe with strict TypeScript
- ✅ Uses existing Drizzle ORM patterns
- ✅ Uses `createLogger()` not console.log
- ✅ No `any` types

## Project Structure

### Documentation (this feature)

```text
specs/002-graceful-rhythms/
├── plan.md              # This file
├── spec.md              # Feature specification (complete)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (existing Nuxt structure)

```text
app/
├── server/
│   ├── api/
│   │   └── rhythms/              # NEW: Rhythm CRUD endpoints
│   │       ├── index.get.ts      # GET /api/rhythms
│   │       ├── index.post.ts     # POST /api/rhythms
│   │       ├── [id].get.ts       # GET /api/rhythms/:id
│   │       ├── [id].put.ts       # PUT /api/rhythms/:id
│   │       ├── [id].delete.ts    # DELETE /api/rhythms/:id
│   │       └── [id]/
│   │           └── progress.get.ts  # GET /api/rhythms/:id/progress
│   ├── db/
│   │   ├── schema.ts             # EXTEND: rhythms table + encouragements table
│   │   └── migrations/           # NEW: schema migration
│   └── utils/
│       └── rhythmCalculator.ts   # NEW: Tier calculation, chain logic
├── components/
│   ├── RhythmPanel.vue           # NEW: Main rhythm accordion panel
│   ├── RhythmYearTracker.vue     # NEW: GitHub-style year heatmap
│   ├── RhythmMonthCalendar.vue   # NEW: Calendar month view
│   ├── RhythmChainStats.vue      # NEW: Chain statistics display
│   ├── RhythmCreateModal.vue     # NEW: Create/edit rhythm form
│   └── RhythmEncouragement.vue   # NEW: Identity-based message display
├── composables/
│   └── useRhythms.ts             # NEW: Rhythm state management
├── pages/
│   └── rhythms.vue               # REWRITE: Complete rhythms page
└── utils/
    ├── tierCalculator.ts         # NEW: Tier calculation logic (pure functions)
    └── tierCalculator.test.ts    # NEW: Unit tests for tier logic
```

**Structure Decision**: Follows existing Nuxt patterns. API in `server/api/`, components in `components/`, composables in `composables/`. New `rhythms/` API folder for REST endpoints.

## Complexity Tracking

No constitution violations requiring justification.
