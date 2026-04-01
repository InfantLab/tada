# Feature Specification: Accessibility Phase 3 — WCAG 2.2 AA Compliance

**Feature Branch**: `012-accessibility-phase3`
**Created**: 2026-03-29
**Status**: Draft
**Input**: Implement remaining Phase 3 accessibility recommendations from the WCAG 2.2 AA audit documented in `design/accessibility.md`. Phases 1 and 2 were shipped in v0.6.1.

## User Scenarios & Testing

### User Story 1 — Keyboard-Only Modal Navigation (Priority: P1)

A keyboard-only user opens the Quick Entry modal. They press Tab and Shift+Tab to move between form fields and buttons. Focus stays trapped inside the modal — it never leaks to the page behind the backdrop. When the user presses Escape, the modal closes and focus returns to the element that opened it.

**Why this priority**: Focus traps are the single most impactful keyboard accessibility fix. Without them, keyboard users can get lost behind modals with no way to interact with the visible UI.

**Independent Test**: Open any modal using only the keyboard. Tab through all focusable elements and verify focus never escapes the modal boundary.

**Acceptance Scenarios**:

1. **Given** a modal is open, **When** the user presses Tab on the last focusable element, **Then** focus wraps to the first focusable element inside the modal
2. **Given** a modal is open, **When** the user presses Shift+Tab on the first focusable element, **Then** focus wraps to the last focusable element inside the modal
3. **Given** a modal is open, **When** the user presses Escape, **Then** the modal closes and focus returns to the trigger element

---

### User Story 2 — Colourblind-Safe Data Visualisations (Priority: P1)

A user with deuteranopia views their rhythm heatmaps (month calendar and year tracker). They can distinguish all intensity levels because the colour palette uses luminance-differentiated steps rather than a green-only gradient. Each cell also has a tooltip describing the data value.

**Why this priority**: ~8% of males have some form of colour vision deficiency. The current green-only gradient makes heatmaps unreadable for a significant portion of users.

**Independent Test**: Use Chrome DevTools vision deficiency emulation (deuteranopia, protanopia, tritanopia) to verify all heatmap levels remain visually distinguishable. Hover over cells to confirm tooltips show entry counts.

**Acceptance Scenarios**:

1. **Given** a heatmap with entries at all intensity levels, **When** viewed under deuteranopia simulation, **Then** each level is visually distinguishable from its neighbours
2. **Given** any heatmap cell, **When** the user hovers or focuses the cell, **Then** a tooltip shows the date and entry count (e.g., "March 12: 3 entries")
3. **Given** the month calendar or year tracker, **When** the user looks for a legend, **Then** a visible legend explains what each intensity level represents

---

### User Story 3 — Category Colour Contrast Fix (Priority: P2)

A low-vision user views the daily timeline strip. All category colour segments meet WCAG 2.2 AA 3:1 minimum contrast ratio against both light and dark backgrounds. Each segment also has an `aria-label` naming the category for screen reader users.

**Why this priority**: Four category colours currently fail the 3:1 minimum contrast ratio, making them difficult to distinguish for users with low vision.

**Independent Test**: Use a colour contrast analyser tool to verify all category colours meet 3:1 against white (#FFFFFF), pearl, cosmic-void (#1E0B2A), and cosmic-indigo (#3A1A55) backgrounds.

**Acceptance Scenarios**:

1. **Given** a timeline strip with segments from all categories, **When** measured with a contrast analyser, **Then** every category colour achieves at least 3:1 contrast ratio against its background
2. **Given** a timeline strip segment, **When** a screen reader encounters it, **Then** it announces the category name via `aria-label`
3. **Given** a timeline segment with opacity applied, **When** measured at its effective rendered colour, **Then** the contrast ratio still meets 3:1 (minimum opacity raised to 0.6)

---

### User Story 4 — Year Tracker Keyboard Navigation (Priority: P2)

A keyboard-only user navigates the year activity tracker using arrow keys. They can move between day cells (Left/Right for adjacent days, Up/Down for weeks), activate cells with Enter/Space, and hear screen reader announcements for each cell's date and entry count.

**Why this priority**: The 364-cell grid is currently invisible to keyboard and screen reader users — they cannot access any of this data.

**Independent Test**: Focus the year tracker and navigate using only arrow keys, Enter, and Space. Verify all cells are reachable and screen reader announces date and entry count for each.

**Acceptance Scenarios**:

1. **Given** the year tracker is focused, **When** the user presses Right arrow, **Then** focus moves to the next day cell
2. **Given** a focused day cell, **When** the user presses Enter or Space, **Then** the cell's click action fires
3. **Given** a focused day cell, **When** a screen reader reads it, **Then** it announces the date and entry count (e.g., "March 12: 3 entries" or "March 12: no entries")

---

### User Story 5 — Reduced Motion Support (Priority: P2)

A user who has enabled "Reduce motion" in their OS settings visits the app. Confetti animations on celebrations, welcome overlay transitions, and chart hover scale effects are all suppressed — content appears immediately without animation.

**Why this priority**: Motion-sensitive users (vestibular disorders, migraine) currently have no way to suppress app animations, despite having set their OS preference.

**Independent Test**: Enable "Reduce motion" in OS accessibility settings. Trigger a celebration, open the welcome overlay, and hover over chart elements. Verify no animations play.

**Acceptance Scenarios**:

1. **Given** reduced motion is enabled, **When** a celebration triggers, **Then** confetti and bounce animations are suppressed
2. **Given** reduced motion is enabled, **When** the welcome overlay opens, **Then** it appears instantly without fade/slide animation
3. **Given** reduced motion is enabled, **When** the user hovers chart elements, **Then** no scale transforms animate

---

### User Story 6 — Toggle Switch Accessibility (Priority: P2)

A screen reader user navigates the settings page. Each toggle switch is announced with its label, current state ("on"/"off"), and role ("switch"). Toggling updates the announcement. The visual contrast of the unchecked state meets minimum visibility requirements.

**Why this priority**: Settings toggles are currently inconsistent in their ARIA markup, making them unpredictable for screen reader users.

**Independent Test**: Navigate the settings page with a screen reader. Verify each toggle announces its label, role, and state. Toggle it and verify the state announcement updates.

**Acceptance Scenarios**:

1. **Given** a settings toggle, **When** a screen reader encounters it, **Then** it announces the toggle's label, "switch" role, and current state
2. **Given** a toggle is toggled, **When** the state changes, **Then** the screen reader announces the new state
3. **Given** an unchecked toggle, **When** viewed on screen, **Then** the track is visually distinguishable (contrast improved from `bg-stone-200` to `bg-stone-300` with border)

---

### User Story 7 — Screen Reader Filter Feedback (Priority: P3)

A screen reader user applies a filter on the timeline. After the filter results load, the screen reader announces the result count (e.g., "12 entries found" or "No entries found") without requiring the user to navigate elsewhere.

**Why this priority**: Without live region announcements, screen reader users have no feedback about whether their filter action produced results.

**Independent Test**: Apply a timeline filter with a screen reader active. Verify the result count is announced automatically after results load.

**Acceptance Scenarios**:

1. **Given** a screen reader user applies a timeline filter, **When** results finish loading, **Then** the screen reader announces "[count] entries found"
2. **Given** rapid filter changes (e.g., typing in search), **When** results update multiple times within 300ms, **Then** only the final count is announced (debounced)

---

### Edge Cases

- What happens when a modal contains zero focusable elements? (Focus trap should handle gracefully — no JS error, focus stays on container)
- What happens when all heatmap cells have zero entries? (Legend still displays; cells still have tooltips saying "no entries")
- What happens when the year tracker grid renders a partial first/last week? (Arrow keys skip empty cells to the next available day)
- What happens when a user toggles reduced motion mid-session? (Running animations should stop immediately via `matchMedia` listener)

## Requirements

### Functional Requirements

- **FR-001**: System MUST trap keyboard focus inside open modals (Tab, Shift+Tab cycle within modal; Escape closes and restores focus)
- **FR-002**: System MUST provide a reusable `useFocusTrap` composable applied to all 6 modal/overlay components
- **FR-003**: Heatmap colour palette MUST be distinguishable under deuteranopia, protanopia, and tritanopia simulations
- **FR-004**: All heatmap cells MUST have `title` attributes with date and entry count
- **FR-005**: Heatmaps MUST include a visible legend
- **FR-006**: Category colours for creative, social, life_admin, and events MUST achieve 3:1 contrast ratio against all app backgrounds (light and dark modes)
- **FR-007**: Timeline strip segments MUST have `aria-label` attributes naming the category
- **FR-008**: Minimum opacity on timeline strip segments MUST be 0.6
- **FR-009**: Year tracker MUST use `role="grid"` with roving `tabindex` and arrow key navigation
- **FR-010**: Year tracker cells MUST have `aria-label` with date and entry count
- **FR-011**: All animations MUST respect `prefers-reduced-motion: reduce` via CSS media queries
- **FR-012**: All toggle switches MUST have `role="switch"` and bound `aria-checked`
- **FR-013**: All toggle switches MUST have descriptive `aria-label`
- **FR-014**: Unchecked toggle track MUST use `bg-stone-300` with a visible border
- **FR-015**: Timeline filter changes MUST announce result count via `aria-live="polite"` region, debounced at 300ms

### Key Entities

- **useFocusTrap composable**: Reusable Vue composable that accepts a container ref, traps Tab/Shift+Tab focus cycling, and cleans up on deactivate
- **useReducedMotion composable** (optional): Reactive composable reading `matchMedia('(prefers-reduced-motion: reduce)')` for programmatic animation control

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero focus escape incidents when tabbing through any open modal (automated test or manual verification)
- **SC-002**: All 4 heatmap intensity levels remain visually distinguishable under deuteranopia, protanopia, and tritanopia simulation in Chrome DevTools
- **SC-003**: All category colours achieve ≥3:1 contrast ratio against white, pearl, cosmic-void, and cosmic-indigo backgrounds (measured via contrast analyser)
- **SC-004**: Year tracker is fully navigable via keyboard alone — all 364 cells reachable via arrow keys
- **SC-005**: Zero animation plays when `prefers-reduced-motion: reduce` is active
- **SC-006**: axe DevTools reports zero critical or serious WCAG 2.2 AA violations on pages touched by this work
- **SC-007**: Screen reader announces filter result count within 500ms of filter change completing
