# CSV Import Framework - Task List

**Feature Branch:** `feature/csv-import-framework`  
**Target Version:** v0.2.0  
**Estimated Time:** 17-24 hours (~2-3 days)

---

## Phase 1: Database Schema & Dependencies (4-6 hours)

### Task 1.1: Install Papa Parse

- [ ] Run `bun add papaparse`
- [ ] Run `bun add -d @types/papaparse`
- [ ] Verify installation in package.json
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

- [ ] Create `app/utils/csvImporter.ts`
- [ ] Implement `parseCSVFile(file, options)` - returns Promise<ParseResult>
- [ ] Implement `detectDateFormat(samples)` - analyzes date strings
- [ ] Implement `parseDuration(str)` - handles H:MM:SS format
- [ ] Implement `parseDate(str, format, timezone)` - converts to ISO
- [ ] Implement `generateExternalId(row)` - creates hash for deduplication
- [ ] Add TypeScript interfaces for all functions
- **Estimated:** 2-3 hours

### Task 1.6: Write parser tests

- [ ] Create `app/utils/csvImporter.test.ts`
- [ ] Test date parsing (MM/DD/YYYY, ISO, edge cases)
- [ ] Test duration parsing (0:6:0, 23:50:0, etc.)
- [ ] Test external ID generation (same data = same hash)
- [ ] Test CSV parsing with Papa Parse (headers, empty lines)
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

- [ ] Limit to 1 import per 10 seconds per user
- [ ] Return 429 if exceeded
- [ ] Add to logger for monitoring
- **Estimated:** 30 minutes

### Task 2.4: Create import log tracking

- [ ] Insert import_logs record at start
- [ ] Update with results at end
- [ ] Store recipe snapshot for audit
- [ ] Handle transaction rollback on critical errors
- **Estimated:** 45 minutes

### Task 2.5: Write API tests

- [ ] Test successful import (small batch)
- [ ] Test duplicate handling
- [ ] Test rate limiting
- [ ] Test error handling (invalid data)
- [ ] Test batch transaction rollback
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

- [ ] Hidden file input with styled label
- [ ] Accept .csv files only
- [ ] File size validation (50 MB max)
- [ ] Show selected file info (name, size)
- [ ] Drag-and-drop support (optional enhancement)
- **Estimated:** 1 hour

### Task 3.3: Create CSV preview table

- [ ] Parse first 10 rows with Papa Parse preview mode
- [ ] Display in responsive table
- [ ] Show row count after parsing
- [ ] Handle parsing errors gracefully
- **Estimated:** 1 hour

### Task 3.4: Build column mapping interface

- [ ] Dropdown for each CSV column
- [ ] Options: startedAt, endedAt, durationSeconds, name, category, subcategory, notes, tags, [skip]
- [ ] Auto-detection with confidence badges
- [ ] Manual override always available
- [ ] Save mappings to local state
- **Estimated:** 2 hours

### Task 3.5: Add transformation config

- [ ] Timezone selector (dropdown with common zones)
- [ ] Date format selector (if auto-detect fails)
- [ ] Default category dropdown
- [ ] Custom emoji picker for new subcategories
- **Estimated:** 1.5 hours

### Task 3.6: Build data validation panel

- [ ] Flag durations >3 hours with ⚠️
- [ ] Flag durations <30 seconds with ⚠️
- [ ] Show "New category/subcategory" warnings
- [ ] Count and display validation issues
- [ ] Allow user to proceed despite warnings
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

- [ ] Create migration seed file
- [ ] Recipe: name="Insight Timer", userId=null (built-in)
- [ ] Mappings: "Started At"→startedAt, "Duration"→durationSeconds, "Activity"→subcategory
- [ ] Defaults: category="mindfulness", type="timed"
- [ ] Include export instructions in metadata
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

- [ ] Create expandable instructions panel on `/import`
- [ ] Include: "Settings → Features & Preferences → Sessions → Export Data"
- [ ] Show only when Insight Timer card is focused
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
