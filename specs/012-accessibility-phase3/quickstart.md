# Quickstart: Accessibility Phase 3

**Branch**: `012-accessibility-phase3` | **Date**: 2026-03-29

## Overview

This feature implements 7 accessibility improvements from the WCAG 2.2 AA Phase 3 audit. All changes are frontend-only (Vue components, composables, CSS, one utility file). No database or API changes.

## Prerequisites

- Node.js + npm (already configured in repo)
- No new dependencies to install

## Implementation Order

Work in this order to minimise merge conflicts and maximise testability:

### 1. Create composables (no component changes yet)
- `app/composables/useFocusTrap.ts` — focus trap logic
- `app/composables/useReducedMotion.ts` — reactive `prefers-reduced-motion` reader

### 2. Apply focus traps to modals (P1)
Apply `useFocusTrap` to these 6 components:
- `QuickEntryModal.vue`
- `EmojiPicker.vue`
- `RhythmCreateModal.vue`
- `ContextualHelpPanel.vue`
- `WelcomeOverlay.vue`
- `QuickAddMenu.vue`

### 3. Colourblind-safe heatmaps (P1)
- Replace green gradient with violet scale in `RhythmMonthCalendar.vue` and `RhythmYearTracker.vue`
- Add `title` attributes to all heatmap cells
- Add visible legend component
- Fix `RhythmBarChart.vue` complete vs partial bar contrast

### 4. Category colour contrast (P2)
- Update 4 colours in `utils/categoryDefaults.ts`
- Raise minimum opacity to 0.6 in `TimelineStrip.vue`
- Add `aria-label` to timeline strip segments

### 5. Year tracker keyboard nav (P2)
- Add `role="grid"` / `role="row"` / `role="gridcell"` to `RhythmYearTracker.vue`
- Implement roving tabindex + arrow key navigation
- Add `aria-label` to each cell

### 6. Reduced motion (P2)
- Add `@media (prefers-reduced-motion: reduce)` blocks to `CelebrationOverlay.vue`, `WelcomeOverlay.vue`, `RhythmBarChart.vue`, `RhythmYearTracker.vue`

### 7. Toggle switch ARIA (P2)
- Audit and fix toggles in `settings.vue` and `WeeklyRhythmsSettings.vue`
- Add `role="switch"`, `aria-checked`, `aria-label`
- Fix unchecked track contrast

### 8. Filter announcements (P3)
- Add `aria-live="polite"` region to `VirtualTimeline.vue`
- Debounce at 300ms

## Testing

```bash
# Unit tests
npm test

# Lint
npm run lint

# E2E (if Playwright tests exist for these components)
npx playwright test
```

### Manual Testing Checklist
- Keyboard-only navigation through all modals
- Chrome DevTools → Rendering → Emulate vision deficiencies (deuteranopia, protanopia, tritanopia)
- OS reduced motion setting → verify no animations
- Screen reader (VoiceOver/NVDA) on settings page toggles and timeline filters
- Browser zoom 200% → no content overlap

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Custom focus trap composable | Avoids new dependency for ~40 lines of code |
| Violet heatmap palette | Brand-aligned, luminance-safe under all CVD types |
| CSS-first reduced motion | Most animations are CSS; simpler than JS approach |
| Roving tabindex for year grid | Standard WAI-ARIA grid pattern; avoids 364 tab stops |
