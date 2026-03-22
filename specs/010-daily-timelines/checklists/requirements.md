# Requirements Checklist: Daily Timeline Bar

**Purpose**: Validate that the spec covers all required sections, quality criteria, and traceability from feature request to specification.
**Created**: 2026-03-22
**Feature**: [spec.md](../spec.md)

## Spec Completeness

- [x] CHK001 Spec has a clear feature name and metadata (branch, date, status)
- [x] CHK002 Scope section defines what is in V1 and what is out of scope
- [x] CHK003 User stories are prioritized (P1, P2) with clear rationale
- [x] CHK004 Each user story is independently testable
- [x] CHK005 Acceptance scenarios use Given/When/Then format
- [x] CHK006 Edge cases are identified and documented
- [x] CHK007 Functional requirements use MUST/SHOULD/MAY language
- [x] CHK008 Key entities are defined
- [x] CHK009 Success criteria are measurable and technology-agnostic
- [x] CHK010 Assumptions are documented

## Feature Request Traceability

- [x] CHK011 Per-card timeline indicator described (feature request section 1)
- [x] CHK012 Combined day strip described (feature request section 2)
- [x] CHK013 Category colour coding addressed (feature request "Category Colours")
- [x] CHK014 Day view only constraint captured (FR-006, FR-013)
- [x] CHK015 Minimum width for short-duration entries specified (FR-004, <5 min = dot)
- [x] CHK016 No axis labels/numbers constraint captured (FR-019)
- [x] CHK017 Mobile responsiveness (320px+) addressed (FR-021, SC-006)
- [x] CHK018 Non-interactive in V1 captured (FR-024)
- [x] CHK019 Rendering approach (pure CSS/SVG, no charting library) documented in assumptions
- [x] CHK020 All required data already exists — confirmed in assumptions (no new API/DB)

## Spec Quality

- [x] CHK021 Spec focuses on WHAT and WHY, not HOW (implementation-agnostic)
- [x] CHK022 Written for business stakeholders (no code in spec body)
- [x] CHK023 Clarification items are limited (max 3) and clearly marked
- [x] CHK024 Entry types covered: timed (bar), ta-da (marker), moment (marker), tally (marker), exercise (bar)
- [x] CHK025 Empty day state handled (FR-012 — empty strip still renders)

## Resolved Clarifications

- [x] CHK026 **Overlapping timed bars on day strip**: Semi-transparent layering (primary), vertical stacking (fallback if transparency breaks colour cues). Emoji markers use z-ordering.
- [x] CHK027 **Mobile per-card indicator breakpoint**: Always show — percentage-based bars scale naturally at any width.

## Resolved Clarifications (continued)

- [x] CHK028 **Emoji marker overlap on narrow screens**: Allow free overlap — density is an honest signal of a busy day.

## Notes

- 0 clarification items remain
- All functional requirements trace back to the original feature request
- The spec deliberately avoids prescribing component structure or rendering technology
