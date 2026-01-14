# Feature Specification: v0.2.0 Core Experience Completion

**Feature Branch**: `001-v020-completion`  
**Created**: 2026-01-14  
**Status**: Draft  
**Input**: Complete v0.2.0 Core Experience - all remaining roadmap items including user customisation, Ta-Da celebration page, entry improvements, graceful rhythms, practice links, photo attachments, and polish

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ta-Da! Celebration Experience (Priority: P1)

A user wants to record an accomplishment and feel celebrated. They navigate to the dedicated Ta-Da page, enter what they achieved, and experience a triumphant moment with sound and visual celebration.

**Why this priority**: Ta-Das are a core differentiator of the app — celebrating wins should feel magical, not mundane. This is foundational to the app's philosophy.

**Independent Test**: Can be fully tested by adding a Ta-Da and verifying the celebration experience (sound, animation) triggers on save.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I navigate to `/tada/add`, **Then** I see a dedicated Ta-Da entry form with distinct celebratory design
2. **Given** I am on the Ta-Da add page, **When** I enter an accomplishment and save, **Then** I hear a triumphant sound effect and see celebratory animation
3. **Given** I am on the journal add page, **When** I look at available entry types, **Then** Ta-Da is not listed (it has its own dedicated page)

---

### User Story 2 - Universal Entry Editing (Priority: P1)

A user taps any entry in their timeline to view and edit it. They can change the title, contents, personal emoji, or delete the entry entirely.

**Why this priority**: Users need to correct mistakes and personalise their entries. Without editing, the app feels rigid and frustrating.

**Independent Test**: Can be fully tested by tapping any entry type (timed, tada, journal) and successfully editing each field.

**Acceptance Scenarios**:

1. **Given** I have entries in my timeline, **When** I tap any entry, **Then** I see an edit screen for that entry
2. **Given** I am editing an entry, **When** I change the title/contents/emoji and save, **Then** the changes persist and display correctly in the timeline
3. **Given** I am editing an entry, **When** I tap delete and confirm, **Then** the entry is removed from my timeline
4. **Given** I view my timeline, **When** I look at any entry, **Then** I see its personal emoji (or category emoji as fallback)

---

### User Story 3 - Timer Presets (Priority: P2)

A meditator has a favourite timer configuration (20 minutes, mindfulness category, singing bowl bells). They save this as a preset called "Morning Sit" and can start it with one tap.

**Why this priority**: Reduces friction for repeat users. Most people have 1-3 regular practices they do repeatedly.

**Independent Test**: Can be fully tested by saving a preset, then using it to start a timer session.

**Acceptance Scenarios**:

1. **Given** I have configured my timer, **When** I tap "Save as Preset", **Then** I can name and save the configuration
2. **Given** I have saved presets, **When** I visit the timer page, **Then** I see my presets available for quick selection
3. **Given** I select a preset, **When** the timer starts, **Then** it uses all the saved settings (duration, category, bells)
4. **Given** I have presets, **When** I want to modify or delete one, **Then** I can manage my presets in settings

---

### User Story 4 - Customise Entry Types in Journal (Priority: P2)

A user primarily logs dreams and morning pages, but never uses mood tracking. They hide mood from their journal add page to reduce clutter.

**Why this priority**: Users have different journaling practices. Showing irrelevant options creates friction and visual noise.

**Independent Test**: Can be fully tested by hiding an entry type and verifying it no longer appears in the journal add page.

**Acceptance Scenarios**:

1. **Given** I am on the journal add page, **When** I view available entry types, **Then** I see default types (mood, dreams, morning pages, notes)
2. **Given** I go to customisation settings, **When** I hide an entry type, **Then** it no longer appears on my journal add page
3. **Given** I have hidden entry types, **When** I want to add one back, **Then** I can show it again from settings
4. **Given** I want a custom entry type, **When** I create one with a name and emoji, **Then** it appears in my journal add options

---

### User Story 5 - Custom Emojis for Categories (Priority: P2)

A user wants to change the meditation emoji from 🧘 to 🪷 because it resonates more with their practice. They update it in settings and see the change reflected everywhere.

**Why this priority**: Personal expression matters. Small customisations make the app feel like "theirs".

**Independent Test**: Can be fully tested by changing a category emoji and verifying it displays correctly in timeline, pickers, and entry views.

**Acceptance Scenarios**:

1. **Given** I am in settings, **When** I select a category or subcategory, **Then** I can change its emoji
2. **Given** I have changed an emoji, **When** I view the timeline, **Then** entries use the new emoji
3. **Given** I have changed an emoji, **When** I use entry pickers, **Then** they show the new emoji

---

### User Story 6 - Hide Unused Categories (Priority: P3)

A user only uses Ta-Da for mindfulness and accomplishments. They hide the "physical" and "creative" categories from all pickers to simplify their experience.

**Why this priority**: Reduces cognitive load. Users shouldn't wade through options they never use.

**Independent Test**: Can be fully tested by hiding a category and verifying it doesn't appear in category pickers.

**Acceptance Scenarios**:

1. **Given** I am in settings, **When** I view category management, **Then** I can hide categories I don't use
2. **Given** I have hidden categories, **When** I use any category picker, **Then** hidden categories don't appear
3. **Given** I have hidden a category, **When** I want it back, **Then** I can unhide it from settings

---

### User Story 7 - Delete Category Data (Priority: P3)

A user decides to stop tracking their weight and wants to delete all entries in that category. They delete the data with a clear confirmation step.

**Why this priority**: Data sovereignty. Users should control what data exists about them.

**Independent Test**: Can be fully tested by deleting all entries for a category and verifying they're removed.

**Acceptance Scenarios**:

1. **Given** I am in category settings, **When** I select "Delete all data" for a category, **Then** I see a clear warning about what will be deleted
2. **Given** I confirm deletion, **When** the operation completes, **Then** all entries in that category are permanently removed
3. **Given** I accidentally delete data, **When** within the undo window, **Then** I can recover the deleted entries

---

### User Story 8 - Undo Support (Priority: P3)

A user accidentally deletes an important entry. Within a short time window, they can undo the deletion.

**Why this priority**: Safety net for destructive actions. Reduces anxiety about using the app.

**Independent Test**: Can be fully tested by deleting an entry and successfully undoing within the time window.

**Acceptance Scenarios**:

1. **Given** I delete an entry, **When** I see the deletion confirmation, **Then** I see an "Undo" option
2. **Given** I tap "Undo" within the time window, **When** the undo completes, **Then** the entry is restored
3. **Given** the undo window expires, **When** I try to undo, **Then** recovery is no longer available

---

### User Story 9 - Toast Notification System (Priority: P2)

A user saves an entry and sees a friendly toast notification confirming the save, rather than a jarring browser alert.

**Why this priority**: Polish matters for user experience. Alert dialogs feel broken and unprofessional.

**Independent Test**: Can be fully tested by triggering actions that show notifications and verifying toast appearance.

**Acceptance Scenarios**:

1. **Given** I perform an action that needs feedback (save, delete, error), **When** the action completes, **Then** I see a styled toast notification
2. **Given** a toast appears, **When** I wait or dismiss it, **Then** it disappears gracefully
3. **Given** multiple actions occur, **When** toasts queue up, **Then** they display in order without overlapping awkwardly

---

### User Story 10 - Subcategory Auto-complete (Priority: P3)

A user has previously logged meditations with subcategory "metta". When they start typing "me", their previous subcategories appear as suggestions.

**Why this priority**: Reduces typing and ensures consistency in user's own taxonomy.

**Independent Test**: Can be fully tested by creating entries with subcategories, then verifying they appear as suggestions.

**Acceptance Scenarios**:

1. **Given** I have used subcategories before, **When** I start typing in a subcategory field, **Then** I see my previous entries as suggestions
2. **Given** suggestions appear, **When** I select one, **Then** the field is filled with that subcategory
3. **Given** I type a new subcategory, **When** I save the entry, **Then** it becomes available for future auto-complete

---

### User Story 11 - Fix Logger Test Failures (Priority: P3)

A developer runs the test suite and all 140 tests pass, including the 7 logger tests that currently fail due to JSON format assertion issues.

**Why this priority**: Technical debt that's been lingering. Clean test suite builds confidence and enables CI/CD.

**Independent Test**: Can be fully tested by running `bun run test` and verifying all logger tests pass.

**Acceptance Scenarios**:

1. **Given** I run the test suite, **When** logger tests execute, **Then** all 7 previously failing tests pass
2. **Given** I use the logger in production code, **When** it outputs logs, **Then** the format matches what tests expect

---

### Edge Cases

- What happens when a user deletes all entries in a category that has rhythms? (Rhythms should remain but show empty)
- How does undo work for batch deletions vs single deletions? (Both should be undoable with same mechanism)
- What happens when a preset references a hidden category? (Preset still works, category shown when preset is used)
- How do emojis display for entries imported before emoji customisation? (Use current emoji setting, not historical)

## Requirements _(mandatory)_

### Functional Requirements

**Ta-Da Celebration**:

- **FR-001**: System MUST provide a dedicated Ta-Da add page at `/tada/add`
- **FR-002**: System MUST play a triumphant sound effect when a Ta-Da is saved
- **FR-003**: System MUST display celebratory animation/visual feedback on Ta-Da save
- **FR-004**: System MUST remove Ta-Da from the journal add page entry types

**Entry Editing**:

- **FR-005**: System MUST allow any entry to be opened for editing from the timeline
- **FR-006**: System MUST allow editing of title, contents, and personal emoji for any entry
- **FR-007**: System MUST allow deletion of any entry with confirmation
- **FR-008**: System MUST display personal emoji for each entry (category emoji as fallback)

**Timer Presets**:

- **FR-009**: System MUST allow saving current timer configuration as a named preset
- **FR-010**: System MUST store preset settings: duration hint, category, subcategory, bell configuration
- **FR-011**: System MUST allow quick-starting a timer from a saved preset
- **FR-012**: System MUST allow managing (edit/delete) saved presets

**Customisation**:

- **FR-013**: System MUST allow changing emoji for any category or subcategory
- **FR-014**: System MUST allow hiding categories from pickers
- **FR-015**: System MUST allow hiding entry types from journal add page
- **FR-016**: System MUST allow creating custom entry types with name and emoji
- **FR-017**: System MUST remember user's subcategory entries for auto-complete suggestions

**Data Management**:

- **FR-018**: System MUST allow bulk deletion of all entries in a category
- **FR-019**: System MUST show clear confirmation before destructive operations
- **FR-020**: System MUST provide time-limited undo for deletions

**Polish**:

- **FR-021**: System MUST display toast notifications instead of browser alerts
- **FR-022**: System MUST support stacking/queuing multiple toast notifications

**Technical Debt**:

- **FR-023**: All logger tests MUST pass (fix 7 failing JSON format assertion tests)

### Key Entities

- **Timer Preset**: Named configuration (name, duration hint, category, subcategory, bell settings, user reference)
- **User Preferences**: Stores hidden categories, hidden entry types, custom emojis, custom entry types
- **Entry**: Extended with personal emoji field (existing entity)
- **Undo Buffer**: Temporary storage for recently deleted entries with expiry timestamp

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can add a Ta-Da and experience celebration (sound + visual) in under 10 seconds
- **SC-002**: Users can edit any entry's title, contents, or emoji within 3 taps from timeline
- **SC-003**: Users can start a timer from preset in 2 taps (select preset → start)
- **SC-004**: 100% of destructive actions (delete entry, delete category data) are undoable within 10 seconds
- **SC-005**: All user feedback uses toast notifications (0 browser alert dialogs in normal usage)
- **SC-006**: Users can customise their experience (emojis, hidden categories, entry types) without developer intervention
- **SC-007**: Subcategory suggestions appear within 200ms of typing

## Assumptions

- Sound effects will be short audio files bundled with the app (similar to existing bell sounds)
- Undo window will be 10-30 seconds (implementation will determine exact duration)
- Toast notifications will auto-dismiss after 3-5 seconds with option to dismiss early
- Custom entry types are stored per-user, not globally shared
- Emoji picker will use native OS emoji selector or existing EmojiPicker component
