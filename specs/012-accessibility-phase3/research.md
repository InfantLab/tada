# Research: Accessibility Phase 3

**Feature**: 012-accessibility-phase3 | **Date**: 2026-03-29

## R1: Focus Trap Implementation Pattern

**Decision**: Build a lightweight `useFocusTrap` composable from scratch (~40 lines).

**Rationale**: The project has no existing focus trap library. Adding `focus-trap` (npm) would introduce a new dependency for ~40 lines of logic. The composable approach is consistent with the project's existing `composables/` pattern and avoids dependency bloat.

**Alternatives Considered**:
- `focus-trap` npm package — rejected: unnecessary dependency for straightforward logic
- Headless UI `<Dialog>` — rejected: would require replacing existing modal markup across 6 components

**Implementation Notes**:
- Focusable selector: `a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])`
- Must re-query focusable elements on each Tab press (dynamic content like emoji grids)
- Activate on mount/open, deactivate on unmount/close
- Return `{ activate, deactivate }` for manual control if needed

---

## R2: Colourblind-Safe Heatmap Palette

**Decision**: Use a violet sequential scale (Option A from audit) for heatmap intensity levels.

**Rationale**: Violet scales maintain luminance separation under all three major CVD types (deuteranopia, protanopia, tritanopia). This aligns with the app's existing brand palette (tada-violet). No shape/pattern encoding needed — luminance alone provides sufficient differentiation across 5 levels.

**Palette**:
| Level | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| 0 | `bg-stone-100` / dark: `bg-stone-800` | #F5F5F4 / #292524 | No entries |
| 1 | `bg-violet-200` | #DDD6FE | Low activity |
| 2 | `bg-violet-400` | #A78BFA | Medium activity |
| 3 | `bg-violet-600` | #7C3AED | High activity |
| 4 | `bg-violet-800` | #5B21B6 | Very high activity |

**Luminance ratios** (adjacent levels):
- L0→L1: 1.3:1 ✓ (visually distinct via hue shift from neutral)
- L1→L2: 1.8:1 ✓
- L2→L3: 2.1:1 ✓
- L3→L4: 1.7:1 ✓

**Alternatives Considered**:
- Option B (shape + colour hybrid) — rejected: adds significant implementation complexity for marginal benefit given the luminance approach already works
- Blue scale — rejected: less brand-aligned than violet

---

## R3: Category Colour Replacements

**Decision**: Use the darkened colour values recommended in the audit.

| Category | Current | New | Ratio on White |
|----------|---------|-----|----------------|
| creative | #D97706 (amber-600) | #B45309 (amber-700) | 4.4:1 ✓ |
| social | #F43F5E (rose-500) | #BE123C (rose-700) | 5.3:1 ✓ |
| life_admin | #78716C (stone-500) | #57534E (stone-600) | 4.6:1 ✓ |
| events | #EC4899 (pink-500) | #BE185D (pink-700) | 5.1:1 ✓ |

**Dark mode verification needed**: These values must also be checked against `cosmic-void` (#1E0B2A) and `cosmic-indigo` (#3A1A55). Amber-700 and stone-600 against dark backgrounds will exceed 3:1 due to high luminance difference.

---

## R4: Year Tracker Keyboard Navigation Pattern

**Decision**: Roving tabindex with arrow key navigation, following the WAI-ARIA grid pattern (same approach as GitHub's contribution graph).

**Rationale**: With 364 cells, each cell cannot have `tabindex="0"` — that would create 364 tab stops. Roving tabindex means only one cell is tabbable at a time; arrow keys move within the grid.

**Key bindings**:
- `ArrowRight`: next day
- `ArrowLeft`: previous day
- `ArrowDown`: same day next week (+7)
- `ArrowUp`: same day previous week (-7)
- `Enter`/`Space`: activate cell
- `Home`: first day of current row
- `End`: last day of current row

---

## R5: Reduced Motion Strategy

**Decision**: CSS-first approach using `@media (prefers-reduced-motion: reduce)`, with an optional `useReducedMotion` composable for programmatic cases.

**Rationale**: Most animations in the app are CSS-based (transitions, keyframe animations). A CSS media query is the simplest, most maintainable approach. The composable is only needed if any animations are driven by JavaScript (e.g., requestAnimationFrame-based confetti).

**Files needing CSS media queries**:
- `CelebrationOverlay.vue` — confetti, bounce, pulse keyframes
- `WelcomeOverlay.vue` — fade/slide transitions
- `RhythmBarChart.vue` — hover scale transforms
- `RhythmYearTracker.vue` — cell hover transitions

---

## R6: Toggle Switch ARIA Pattern

**Decision**: Add `role="switch"` and `:aria-checked` to all checkbox-styled-as-toggle inputs, following WAI-ARIA switch pattern.

**Rationale**: The switch role is the correct semantic for a binary toggle that takes effect immediately (vs. a checkbox which typically requires form submission).

**Visual fix**: Change unchecked track from `bg-stone-200` to `bg-stone-300` and add `ring-1 ring-stone-300` for a subtle border, improving contrast from ~1.9:1 to ~2.8:1.

---

## R7: aria-live Filter Announcements

**Decision**: Add a visually-hidden `<div role="status" aria-live="polite">` in VirtualTimeline.vue, debounced at 300ms.

**Rationale**: `role="status"` with `aria-live="polite"` is the standard pattern for non-critical status updates. Debouncing prevents rapid-fire announcements during typing.

**Implementation**: Use a `watchDebounced` (or manual `setTimeout`) on the filtered entry count. Update the live region's text content. The `sr-only` Tailwind class hides it visually.
