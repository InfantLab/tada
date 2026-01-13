# CSV Import Framework - Task List

**Feature Branch:** `feature/csv-import-framework`  
**Target Version:** v0.2.0  
**Estimated Time:** 17-24 hours (~2-3 days)

---

## Phase 1: Database Schema & Dependencies (4-6 hours)

### Task 1.1: Install Papa Parse

- [x] Run `bun add papaparse`
- [x] Run `bun add -d @types/papaparse`
- [x] Verify installation in package.json
- **Estimated:** 5 minutes

### Task 1.2: Create import_recipes table

- [ ] Add schema to `app/server/db/schema.ts`
- [ ] Fields: id, userId, name, source, columnMappings (JSON), transformRules (JSON), defaults (JSON), isPublic, previousVersion (JSON), createdAt, updatedAt
- [ ] Add indexes for userId and source
- [ ] Run `bun run db:generate` to create migration
- **Estimated:** 30 minutes

### Task 1.3: Create import_logs table

- [ ] Add schema to `app/server/db/schema.ts`
- [ ] Fields: id, userId, recipeId, recipeSnapshot (JSON), entriesImported, entriesSkipped, entriesFailed, errorLog (JSON), startedAt, completedAt
- [ ] Add index for userId
- [ ] Run `bun run db:generate` to create migration
- **Estimated:** 20 minutes

### Task 1.4: Apply migrations

- [ ] Run `bun run db:migrate` locally
- [ ] Verify tables created in Drizzle Studio
- [ ] Test rollback capability
- **Estimated:** 15 minutes

### Task 1.5: Build CSV parser utility

- [x] Create `app/server/utils/csvParser.ts` (server-side)
- [x] Implement `parseCSV(content, options)` - returns ParseResult
- [x] Implement `detectDateFormat(samples)` - analyzes date strings with confidence
- [x] Implement `parseDuration(str)` - handles H:MM:SS format
- [x] Implement `parseDateTime(str, format, timezone)` - converts to ISO with 3 format support
- [x] Implement `generateExternalId(entry)` - creates SHA-256 hash for deduplication
- [x] Add TypeScript interfaces for all functions
- **Estimated:** 2-3 hours

### Task 1.6: Write parser tests

- [x] Create `app/server/utils/csvParser.test.ts`
- [x] Test date parsing (MM/DD/YYYY, DD/MM/YYYY, ISO, edge cases) - 32/34 passing
- [x] Test duration parsing (0:6:0, 23:50:0, etc.)
- [x] Test external ID generation (same data = same hash)
- [x] Test CSV parsing with Papa Parse (headers, empty lines)
- [x] Test detectDateFormat with confidence scoring
- **Estimated:** 1 hour

---

## Phase 2: API Layer (3-4 hours)

### Task 2.1: Create bulk import endpoint

- [ ] Create `app/server/api/import/csv.post.ts`
- [ ] Accept: recipeId, entries array, userId (from session)
- [ ] Validate user owns recipe (or recipe is built-in)
- [ ] Implement batched inserts (500 rows per transaction)
- [ ] Track success/skip/fail counts
- [ ] Return detailed results object
- **Estimated:** 1.5 hours

### Task 2.2: Add duplicate detection

- [ ] Check for existing entries by externalId
- [ ] Implement skip/update/import strategy
- [ ] Add to import results (duplicates skipped count)
- **Estimated:** 45 minutes

### Task 2.3: Add rate limiting

- [x] Limit to 1 import per 10 seconds per user
- [x] Return 429 if exceeded
- [x] Add to logger for monitoring
- [x] Created `app/server/utils/rateLimiter.ts` with in-memory tracking
- **Estimated:** 30 minutes

### Task 2.4: Create import log tracking

- [ ] Insert import_logs record at start
- [ ] Update with results at end
- [ ] Store recipe snapshot for audit
- [ ] Handle transaction rollback on critical errors
- **Estimated:** 45 minutes

### Task 2.5: Write API tests

- [x] Test successful import (small batch)
- [x] Test duplicate handling by externalId
- [x] Test rate limiting (429 response)
- [x] Test error handling (invalid data)
- [x] Test batch processing (1500 rows)
- [x] Created `app/server/api/import/entries.post.test.ts` with 6 test cases
- **Estimated:** 1 hour

---

## Phase 3: UI - Import Wizard (6-8 hours)

### Task 3.1: Create import landing page

- [ ] Create `app/pages/import/index.vue`
- [ ] Hero section: "Import Your Data"
- [ ] Quick-start cards: Insight Timer, Custom CSV, Coming Soon placeholders
- [ ] Card component with icon, title, description, link
- **Estimated:** 1 hour

### Task 3.2: Build file upload component

- [x] Hidden file input with styled label
- [x] Accept .csv files only
- [x] File size validation (50 MB max)
- [x] Show selected file info (name, size)
- [x] Drag-and-drop support with visual feedback (dragover state)
- [x] Integrated into ImportWizard.vue
- **Estimated:** 1 hour

### Task 3.3: Create CSV preview table

- [ ] Parse first 10 rows with Papa Parse preview mode
- [ ] Display in responsive table
- [ ] Show row count after parsing
- [ ] Handle parsing errors gracefully
- **Estimated:** 1 hour

### Task 3.4: Build column mapping interface

- [x] Dropdown for each CSV column
- [x] 9 fields: startedAt, endedAt, duration, name, category, subcategory, notes, tags, emoji
- [x] Auto-detection with confidence badges (high/medium/low)
- [x] Color-coded confidence indicators (green/yellow/red)
- [x] Manual override always available
- [x] Save mappings to local state
- [x] Created `app/utils/columnDetection.ts` for smart pattern matching
- **Estimated:** 2 hours

### Task 3.5: Add transformation config

- [ ] Timezone selector (dropdown with common zones)
- [ ] Date format selector (if auto-detect fails)
- [ ] Default category dropdown
- [ ] Custom emoji picker for new subcategories
- **Estimated:** 1.5 hours

### Task 3.6: Build data validation panel

- [x] Flag durations >3 hours with ⚠️
- [x] Flag durations <30 seconds with ⚠️
- [x] Show "New category/subcategory" warnings
- [x] Flag future dates with warning
- [x] Count and display validation issues in preview
- [x] Allow user to proceed despite warnings
- [x] Integrated into ImportWizard.vue generatePreview()
- **Estimated:** 1 hour

### Task 3.7: Create preview transformed entries

- [ ] Transform first 10 rows using mappings
- [ ] Display in table with final field names
- [ ] Show what will be imported
- [ ] Highlight any issues inline
- **Estimated:** 1 hour

### Task 3.8: Build import progress UI

- [ ] Progress bar component
- [ ] "X of Y rows processed" message
- [ ] Success/skip/error counters (live update)
- [ ] Cancel button (optional)
- **Estimated:** 45 minutes

### Task 3.9: Create results summary

- [ ] Display final counts (imported/skipped/failed)
- [ ] Link to view imported entries
- [ ] Download error log button (if errors exist)
- [ ] "Import Another File" button
- **Estimated:** 30 minutes

---

## Phase 4: Recipe System (2-3 hours)

### Task 4.1: Create recipe save/load functions

- [ ] Composable: `useImportRecipe()`
- [ ] `saveRecipe(name, mappings, transforms)` - stores in DB
- [ ] `loadRecipe(id)` - retrieves and applies
- [ ] `deleteRecipe(id)` - soft delete check
- **Estimated:** 1 hour

### Task 4.2: Add recipe selector to UI

- [ ] Dropdown of user's saved recipes
- [ ] "Save current mapping as recipe" button
- [ ] Recipe name input dialog
- [ ] Load recipe auto-fills all mappings
- **Estimated:** 1 hour

### Task 4.3: Seed Insight Timer built-in recipe

- [x] Created via `app/server/api/import/recipes.get.ts` (auto-creates on load)
- [x] Recipe: name="Insight Timer", userId=null (built-in)
- [x] Mappings: "Started At"→startedAt, "Duration"→duration, "Activity"→name, etc.
- [x] Defaults: category="mindfulness", type="timed"
- [x] Uses user's timezone (not hardcoded)
- [x] Export instructions added to UI panel
- **Estimated:** 30 minutes

### Task 4.4: Add recipe rollback mechanism

- [ ] Store previous mapping version on edit
- [ ] "Restore Previous" button in UI
- [ ] Limit to last 3 versions (auto-prune)
- **Estimated:** 30 minutes

---

## Phase 5: Integration & Polish (2-3 hours)

### Task 5.1: Add import navigation to Settings

- [ ] Update `app/pages/settings.vue`
- [ ] Add "Data" section with "Import Data" link (📥 icon)
- [ ] Link to `/import`
- **Estimated:** 15 minutes

### Task 5.2: Add Insight Timer instructions

- [x] Create expandable instructions panel on `/import`
- [x] Include: "Settings → Features & Preferences → Sessions → Export Data" (8 steps)
- [x] Collapsible section with toggle button
- [x] Added to `app/pages/import/index.vue`
- **Estimated:** 30 minutes

### Task 5.3: Error handling & user feedback

- [ ] Toast notifications for success/error
- [ ] Inline validation messages
- [ ] Helpful error text (not just "500 Error")
- [ ] Loading states for all async operations
- **Estimated:** 1 hour

### Task 5.4: Write E2E test

- [ ] Test full import flow with sample CSV
- [ ] Verify entries created in database
- [ ] Test recipe save/load
- [ ] Test error scenarios
- **Estimated:** 1 hour

### Task 5.5: Update AGENTS.md and roadmap

- [ ] Document CSV import feature
- [ ] Mark roadmap item as complete
- [ ] Add usage examples
- **Estimated:** 15 minutes

---

## Testing Checklist

Before merging to main:

- [ ] All unit tests passing
- [ ] E2E test passing
- [ ] Manual test: Import Insight Timer CSV (4,854 rows)
- [ ] Manual test: Create and use custom recipe
- [ ] Manual test: Error handling (bad CSV format)
- [ ] Manual test: Duplicate detection works
- [ ] Check database: entries have correct timestamps/durations
- [ ] Check database: new categories/subcategories created
- [ ] Test on production (staging environment if available)
- [ ] Performance: 4,854 rows imports in <2 minutes
- [ ] No memory leaks (check with large file)

---

## Deployment Steps

1. Merge feature branch to main
2. Push to GitHub (triggers CapRover auto-deploy)
3. Monitor deployment logs
4. Run `bun run db:migrate` on production (auto-runs via migrate.js)
5. Verify new tables exist in production database
6. Test import with real Insight Timer data
7. Announce feature to users

---

## Future Enhancements (Post-v0.2.0)

- [ ] Recipe sharing marketplace (v0.4.0)
- [ ] LLM-assisted column mapping (v0.5.0)
- [ ] Support for other formats (JSON, Excel)
- [ ] Two-way sync with external services
- [ ] Scheduled imports
- [ ] Background job processing for very large files
