# Implementation Plan: Daily Timeline Bar

**Branch**: `010-daily-timelines` | **Date**: 2026-03-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-daily-timelines/spec.md`

## Summary

Add a minimalistic 24-hour timeline visualisation to the day view: a per-card indicator on each entry card and a combined day strip above the card list. Purely presentational — no new API endpoints, no database changes, no charting libraries. Uses existing entry data (timestamp, durationSeconds, category) with percentage-based CSS positioning and the existing category colour palette.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Vue 3 (Nuxt 4.4.2)
**Primary Dependencies**: Vue 3, Tailwind CSS 3.4.17, existing `categoryDefaults.ts` palette
**Storage**: N/A — no database changes; reads existing entry data
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (PWA), mobile-first (320px+)
**Project Type**: Web application (Nuxt full-stack)
**Performance Goals**: No measurable render performance regression; 60fps scrolling maintained with VirtualTimeline
**Constraints**: No charting library; pure CSS/SVG only; must work within VirtualTimeline's virtualised scroll
**Scale/Scope**: 2 new components, 1 utility module, 1 modified component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution template is unpopulated for this project. Applying general quality gates:

| Gate | Status | Notes |
|------|--------|-------|
| No new external dependencies | PASS | Pure CSS/SVG, no charting library |
| Test coverage for new code | PASS | Unit tests for positioning logic; E2E for visual rendering |
| Existing patterns respected | PASS | Follows existing component structure, uses `categoryDefaults.ts` |
| No database changes | PASS | Purely presentational feature |
| Responsive design | PASS | Percentage-based positioning, 320px+ tested |
| Performance budget | PASS | No heavy computation; lightweight DOM elements |

**Result**: All gates pass. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/010-daily-timelines/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: research findings
├── data-model.md        # Phase 1: data model
├── quickstart.md        # Phase 1: quickstart guide
├── daily-timelines-feature.md  # Original feature request
└── checklists/
    └── requirements.md  # Spec validation checklist
```

### Source Code (repository root)

```text
app/
├── components/
│   ├── timeline/
│   │   ├── TimelineStrip.vue        # Combined day strip (new)
│   │   └── CardTimeIndicator.vue    # Per-card mini timeline (new)
│   └── VirtualTimeline.vue          # Modified: integrate CardTimeIndicator into card template
├── composables/
│   └── useTimelinePosition.ts       # Shared positioning logic (new)
└── utils/
    └── categoryDefaults.ts          # Existing: category colour palette (read-only)
```

**Structure Decision**: Frontend-only feature. New components go in `app/components/timeline/` following the existing subdirectory convention (see `settings/`, `voice/`, `weekly-rhythms/`). Shared positioning logic extracted to a composable for reuse across the strip and per-card indicator, and to future-proof for week/month/year zoom levels.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
