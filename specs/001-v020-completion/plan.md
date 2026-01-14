# Implementation Plan: v0.2.0 Core Experience Completion

**Branch**: `001-v020-completion` | **Date**: 2026-01-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-v020-completion/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Complete remaining v0.2.0 roadmap features: Ta-Da celebration page with sound/animation, universal entry editing, timer presets, user customisation (emojis, hidden categories, entry types), toast notifications, undo support, subcategory auto-complete, and logger test fixes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Vue 3 Composition API  
**Primary Dependencies**: Nuxt 3, Drizzle ORM, TailwindCSS  
**Storage**: SQLite via Drizzle (existing schema in `server/db/schema.ts`)  
**Testing**: Vitest (unit), @nuxt/test-utils (integration)  
**Target Platform**: PWA (browser), Docker deployment, Node 20 runtime
**Project Type**: Web application (Nuxt full-stack)  
**Performance Goals**: <200ms page loads, <100ms toast appearance  
**Constraints**: Offline-capable PWA, mobile-first responsive design  
**Scale/Scope**: Single-user self-hosted, ~15 pages, ~20 API endpoints

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Philosophy Alignment** (from design/philosophy.md):

- ✅ Timers count up, never down — no changes to timer direction
- ✅ Identity over behavior — celebration reinforces "you did this!"
- ✅ Chains that bend, not break — undo support aligns with graceful approach
- ✅ Not a productivity tracker — no metrics dashboards added
- ✅ Personal, not social — all customisation is per-user

**Technical Standards** (from AGENTS.md):

- ✅ No `any` types — use `unknown` with guards
- ✅ Use `createLogger()` not `console.log`
- ✅ Co-locate tests with source
- ✅ Strict TypeScript mode

## Project Structure

### Documentation (this feature)

```text
specs/001-v020-completion/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 API contracts
└── checklists/          # Validation checklists
```

### Source Code (repository root)

```text
app/
├── pages/
│   ├── tada/
│   │   └── add.vue          # New: dedicated Ta-Da celebration page
│   ├── entry/
│   │   └── [id].vue         # Entry edit screen
│   └── settings.vue         # Extended: customisation UI
├── components/
│   ├── ToastContainer.vue   # Existing: needs integration
│   ├── EmojiPicker.vue      # Existing: reuse for customisation
│   └── TimerPresetPicker.vue # New: preset selection UI
├── composables/
│   ├── useToast.ts          # Existing: toast notifications
│   ├── useUndo.ts           # New: undo buffer management
│   └── usePreferences.ts    # New: user customisation state
├── server/
│   ├── api/
│   │   ├── presets/         # New: timer preset CRUD
│   │   ├── preferences/     # New: user preferences CRUD
│   │   └── entries/         # Existing: extend with edit/delete
│   └── db/
│       └── schema.ts        # Extend: presets, preferences tables
├── utils/
│   ├── logger.ts            # Fix: JSON format for tests
│   └── logger.test.ts       # Fix: 7 failing tests
└── public/
    └── sounds/
        └── tada-celebration.mp3  # New: triumphant sound
```

**Structure Decision**: Nuxt 3 full-stack application. Pages auto-route, server API in `/server/api/`, composables for shared state, components for UI.

## Complexity Tracking

> No constitution violations. All features align with existing architecture and philosophy.
