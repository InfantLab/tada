# Ta-Da! Accessibility Plan

**Created:** 2026-03-28
**Target standard:** WCAG 2.2 AA
**Status:** Phase 1 + 2 complete. Phase 3 ready for implementation.

---

## Summary

Full accessibility audit covering colour contrast, colourblind safety, screen reader support, keyboard navigation, and touch target sizing. Phases 1 and 2 were implemented in v0.6.1. Phase 3 contains deeper structural changes suitable for a dedicated accessibility sprint.

---

## What's Done (Phase 1 + 2)

### Phase 1 — Quick Wins

| Fix | Files Changed |
|-----|---------------|
| Skip-to-main-content link | `layouts/default.vue` |
| `aria-hidden="true"` on decorative nav SVGs | `layouts/default.vue` |
| `role="dialog"` + `aria-modal` + `aria-labelledby` on all modals | `QuickEntryModal.vue`, `EmojiPicker.vue`, `RhythmCreateModal.vue`, `ContextualHelpPanel.vue`, `WelcomeOverlay.vue` |
| Form `<label>` wired to inputs via `for`/`id` | `CategorySubcategoryPicker.vue`, `ActivityAutocomplete.vue`, `DurationPicker.vue`, `QuickEntryModal.vue` |
| `aria-pressed` on filter/toggle buttons | `CategoryFilter.vue`, `ZoomToggle.vue` |
| Chart nav button padding `p-1` → `p-2` (28px → 36px) | `RhythmBarChart.vue`, `RhythmMonthCalendar.vue`, `RhythmYearTracker.vue` |
| Modal close button padding increased | `QuickEntryModal.vue` |
| `aria-label` on timeline strip toggle | `TimelineStrip.vue` |

### Phase 2 — Moderate Effort

| Fix | Files Changed |
|-----|---------------|
| `text-tada-600` → `text-tada-700` for body text on light backgrounds | `login.vue`, `index.vue`, `LandingPage.vue`, `ContextualHelpPanel.vue` |
| `text-stone-400` → `text-stone-500` for light-mode informational text | Various pages and components |
| Hardcoded `#9ca3af` → `#6b7280` in chart scoped styles | `RhythmBarChart.vue`, `RhythmMonthCalendar.vue`, `RhythmYearTracker.vue` |
| Focus management: move focus into modals on open, restore on close | `QuickEntryModal.vue`, `EmojiPicker.vue`, `RhythmCreateModal.vue` |
| `role="radiogroup"` + `role="radio"` + `aria-checked` on button groups | `RhythmCreateModal.vue` |
| Rhythm expand/collapse: `<div @click>` → `<button aria-expanded>` | `rhythms.vue` |

---

## Phase 3 — Remaining Work

### 3.1 Focus Trap Composable

**Priority:** P1
**Effort:** ~1 day
**Files:** New `composables/useFocusTrap.ts`, then applied to all modals

Currently, when a modal is open, pressing Tab cycles focus through the entire page behind the backdrop. A proper focus trap confines Tab/Shift+Tab to the modal's focusable elements.

**Implementation approach:**
1. Create `composables/useFocusTrap.ts`:
   - Accept a template ref to the dialog container
   - On activate: query all focusable elements (`a[href], button:not(:disabled), input, select, textarea, [tabindex]:not([tabindex="-1"])`)
   - Intercept `keydown` for Tab/Shift+Tab, cycle within the list
   - On deactivate: remove listener
2. Apply in `QuickEntryModal`, `EmojiPicker`, `RhythmCreateModal`, `ContextualHelpPanel`, `WelcomeOverlay`, `QuickAddMenu`
3. Test with keyboard-only navigation (no mouse)

**Acceptance criteria:**
- Tab never escapes the open modal
- Shift+Tab wraps from first to last focusable element
- Escape closes the modal and restores focus

---

### 3.2 Colourblind-Safe Heatmaps

**Priority:** P1
**Effort:** ~1 day
**Files:** `RhythmMonthCalendar.vue`, `RhythmYearTracker.vue`

The heat-map intensity levels (0–4) currently use a single-green gradient (`bg-green-100` through `bg-green-700`). Under deuteranopia (~6% of males), intermediate levels are indistinguishable.

**Option A — Blue-purple sequential scale (brand-aligned):**
```
Level 0: bg-stone-100 (empty)
Level 1: bg-violet-200
Level 2: bg-violet-400
Level 3: bg-violet-600
Level 4: bg-violet-800
```
This uses luminance steps that remain distinct under all major CVD types.

**Option B — Shape + colour hybrid:**
- Level 0: empty cell with visible border
- Level 1–4: filled cells with increasing size or added dot/stripe
- Provides redundant visual encoding beyond just colour

**Also needed:**
- `title` attributes on each cell with the actual value ("3 entries on March 12")
- A visible legend showing what each level means
- Same fix for `RhythmBarChart.vue` complete vs partial bars — add a secondary cue (border, pattern) beyond green-500 vs green-300

---

### 3.3 Category Colour Contrast

**Priority:** P2
**Effort:** ~0.5 day
**Files:** `utils/categoryDefaults.ts`, `timeline/TimelineStrip.vue`

Four category colours fail 3:1 contrast against white/pearl backgrounds:

| Category | Current | Ratio on White | Suggested Fix |
|----------|---------|---------------|---------------|
| `creative` | #D97706 (amber) | 2.9:1 | → #B45309 (amber-700) |
| `social` | #F43F5E (rose) | 3.5:1 | → #BE123C (rose-700) |
| `life_admin` | #78716C (stone) | 3.4:1 | → #57534E (stone-600) |
| `events` | #EC4899 (pink) | 2.8:1 | → #BE185D (pink-700) |

**Also:**
- Verify new colours against dark-mode backgrounds (`cosmic-void` #1E0B2A, `cosmic-indigo` #3A1A55)
- Add `aria-label` on each timeline strip segment naming the category
- The opacity 0.35–0.7 applied in `TimelineStrip.vue` worsens effective contrast — consider raising minimum opacity to 0.6

---

### 3.4 Year Tracker Keyboard Navigation

**Priority:** P2
**Effort:** ~1–2 days
**Files:** `RhythmYearTracker.vue`

The 364 clickable day cells are `<div>` elements with `@click` handlers — invisible to keyboard users and screen readers.

**Implementation approach:**
1. Wrap the grid in `role="grid"` with `aria-label="Year activity tracker"`
2. Each row (week) gets `role="row"`
3. Each day cell gets `role="gridcell"` + `tabindex="-1"` (only one cell has `tabindex="0"` at a time — roving tabindex)
4. Arrow key navigation: Left/Right = prev/next day, Up/Down = prev/next week
5. Enter/Space activates the cell (fires the click handler)
6. Add `aria-label` on each cell: "March 12: 3 entries" or "March 12: no entries"
7. The 10×10px cell size is too small for touch — consider adding invisible padding or a `::before` pseudo-element expanding the tap area to 24px

**Reference pattern:** GitHub's contribution graph uses this exact approach.

---

### 3.5 `prefers-reduced-motion` Support

**Priority:** P2
**Effort:** ~0.5 day
**Files:** `CelebrationOverlay.vue`, `WelcomeOverlay.vue`, chart hover styles

No animations currently respect the OS-level reduced motion preference.

**Implementation:**
1. In scoped `<style>` of `CelebrationOverlay.vue`, add:
   ```css
   @media (prefers-reduced-motion: reduce) {
     .confetti-piece, .bounce, .pulse { animation: none !important; }
   }
   ```
2. Same for `WelcomeOverlay.vue` fade/slide animations
3. For chart hover scale transforms in `RhythmBarChart.vue` / `RhythmYearTracker.vue`:
   ```css
   @media (prefers-reduced-motion: reduce) {
     .day-cell { transition: none; }
   }
   ```
4. Optionally expose a Vue composable `useReducedMotion()` that reads `matchMedia('(prefers-reduced-motion: reduce)')` for programmatic animation control

---

### 3.6 Toggle Switch Accessibility

**Priority:** P2
**Effort:** ~0.5 day
**Files:** `pages/settings.vue`, `components/settings/WeeklyRhythmsSettings.vue`

The custom CSS toggle switches (checkbox styled as a pill) have inconsistent ARIA:
- Some have `role="switch"`, most don't
- None have `aria-checked` bound to state
- The white thumb on `bg-stone-200` unchecked background has ~1.9:1 contrast

**Fix:**
1. Audit all toggles — ensure each `<input type="checkbox">` that's styled as a switch has `role="switch"` and `:aria-checked="isEnabled"`
2. Add visible `aria-label` describing what the toggle controls (e.g., "Enable celebrations")
3. Change unchecked track from `bg-stone-200` to `bg-stone-300` (slightly darker, 2.5:1 — still borderline but improved). Consider adding a 1px border for the track outline.

---

### 3.7 `aria-live` for Filter Results

**Priority:** P3
**Effort:** ~0.5 day
**Files:** `components/VirtualTimeline.vue`

When timeline filters change, screen reader users get no feedback about the result count.

**Fix:**
1. Add a visually-hidden `<div role="status" aria-live="polite" class="sr-only">` near the top of the timeline
2. When entries finish loading after a filter change, update its text content to `"${count} entries found"` (or `"No entries found"`)
3. Debounce announcements by 300ms to avoid rapid-fire during typing in search

---

## Testing Checklist

For any Phase 3 work, verify with:

- [ ] **Keyboard only:** Navigate the entire feature without a mouse — Tab, Shift+Tab, Enter, Space, Escape, Arrow keys
- [ ] **Screen reader:** VoiceOver (macOS) or NVDA (Windows) — all content is announced, no orphaned or duplicate announcements
- [ ] **Colour contrast:** Use browser DevTools accessibility inspector or axe DevTools to verify AA ratios
- [ ] **Colourblind simulation:** Chrome DevTools → Rendering → Emulate vision deficiencies → Deuteranopia, Protanopia, Tritanopia
- [ ] **Reduced motion:** System Preferences → Accessibility → Reduce motion → verify no animations
- [ ] **Zoom:** Browser zoom to 200% — no content hidden or overlapping
- [ ] **Mobile touch:** All interactive elements have ≥44px touch target (or ≥24px with adequate spacing per WCAG 2.5.8)

## Tools

- [axe DevTools](https://www.deque.com/axe/devtools/) — automated WCAG checker (browser extension)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/) — manual ratio checks
- Chrome DevTools → Rendering → Emulate vision deficiencies
- VoiceOver (Cmd+F5 on macOS), NVDA (free, Windows)
