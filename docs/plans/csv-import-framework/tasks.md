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

- [x] Add schema to `app/server/db/schema.ts` (line 217)
- [x] Fields: id, userId, name, columnMapping (JSON), transforms (JSON), isBuiltIn, previousVersions, etc.
- [x] Add indexes for userId and isBuiltIn
- [x] Run `bun run db:generate` to create migration
- **Estimated:** 30 minutes ✅ COMPLETE

### Task 1.3: Create import_logs table

- [x] Add schema to `app/server/db/schema.ts` (line 277)
- [x] Fields: id, userId, recipeId, filename, status, totalRows, successfulRows, failedRows, errors
- [x] Add index for userId and recipeId
- [x] Run `bun run db:generate` to create migration
- **Estimated:** 20 minutes ✅ COMPLETE

### Task 1.4: Apply migrations

- [x] Run `bun run db:migrate` locally
- [x] Verify tables created in Drizzle Studio
- [x] Test rollback capability
- **Estimated:** 15 minutes ✅ COMPLETE

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

- [x] Create `app/server/api/import/entries.post.ts` (236 lines)
- [x] Accept: entries array, source, recipeName, recipeId, filename, userId (from session)
- [x] Validate user authentication
- [x] Implement batched inserts (500 rows per transaction)
- [x] Track success/skip/fail counts
- [x] Return detailed results object with error tracking
- **Estimated:** 1.5 hours ✅ COMPLETE

### Task 2.2: Add duplicate detection

- [x] Check for existing entries by externalId
- [x] Implement skip strategy (duplicates skipped, count returned)
- [x] Add to import results (duplicates skipped count)
- **Estimated:** 45 minutes ✅ COMPLETE

### Task 2.3: Add rate limiting

- [x] Limit to 1 import per 10 seconds per user (429 response)
- [x] Return 429 if exceeded
- [x] Add to logger for monitoring
- [x] Created `app/server/utils/rateLimiter.ts` with in-memory tracking
- **Estimated:** 30 minutes ✅ COMPLETE

### Task 2.4: Create import log tracking

- [x] Insert import_logs record at end of import
- [x] Update with results (successful, failed, skipped counts)
- [x] Store error details in logs table
- [x] Transaction safety via batching
- **Estimated:** 45 minutes ✅ COMPLETE

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

- [x] Create `app/pages/import/index.vue` (240 lines)
- [x] Hero section: "Import Your Data"
- [x] Quick-start cards: Insight Timer, Custom CSV
- [x] Card component with icon, title, description, link
- **Estimated:** 1 hour ✅ COMPLETE

### Task 3.2: Build file upload component

- [x] Hidden file input with styled label
- [x] Accept .csv files only
- [x] File size validation (50 MB max)
- [x] Show selected file info (name, size)
- [x] Drag-and-drop support with visual feedback (dragover state)
- [x] Integrated into ImportWizard.vue step 1
- **Estimated:** 1 hour ✅ COMPLETE

### Task 3.3: Create CSV preview table

- [x] Parse first 10 rows with Papa Parse
- [x] Display in responsive table
- [x] Show row count after parsing
- [x] Handle parsing errors gracefully
- ⚠️ Note: Color classes reverted to theme, needs testing
- **Estimated:** 1 hour ✅ MOSTLY COMPLETE

### Task 3.4: Build column mapping interface

- [x] Dropdown for each CSV column
- [x] 9 fields: startedAt, endedAt, duration, name, category, subcategory, notes, tags, emoji
- [x] Auto-detection with confidence badges (high/medium/low)
- [x] Color-coded confidence indicators
- [x] Manual override always available
- [x] Save mappings to local state
- [x] Created `app/utils/columnDetection.ts` for smart pattern matching
- **Estimated:** 2 hours ✅ COMPLETE

### Task 3.5: Add transformation config

- ⚠️ Timezone selector (NOT YET - backend transform logic exists, UI missing)
- ⚠️ Date format selector (NOT YET - auto-detect works, manual selector missing)
- [ ] Default category dropdown
- [ ] Custom emoji picker for new subcategories
- **Estimated:** 1.5 hours ⚠️ UI INCOMPLETE (backend ready)

### Task 3.6: Build data validation panel

- [x] Flag durations >3 hours with ⚠️
- [x] Flag durations <30 seconds with ⚠️
- [x] Show "New category/subcategory" warnings
- [x] Flag future dates with warning
- [x] Count and display validation issues in preview
- [x] Allow user to proceed despite warnings
- [x] Integrated into ImportWizard.vue
- **Estimated:** 1 hour ✅ COMPLETE

### Task 3.7: Create preview transformed entries

- [x] Transform first 10 rows using mappings
- [x] Display in table with final field names
- [x] Show what will be imported
- ⚠️ Highlight any issues inline (partial)
- **Estimated:** 1 hour ✅ MOSTLY COMPLETE

### Task 3.8: Build import progress UI

- [x] Progress bar component
- [x] "X of Y rows processed" message
- [x] Success/skip/error counters (live update)
- [x] Integrated into ImportWizard.vue step 4
- **Estimated:** 45 minutes ✅ COMPLETE

### Task 3.9: Create results summary

- [x] Display final counts (imported/skipped/failed)
- [x] Link to view imported entries
- [x] "Import Another File" button
- ⚠️ Download error log button (if errors exist) - partial
- **Estimated:** 30 minutes ✅ MOSTLY COMPLETE

---

## Phase 4: Recipe System (2-3 hours)

### Task 4.1: Create recipe save/load functions

- [x] API endpoint: `POST /api/import/recipes` to save
- [x] API endpoint: `GET /api/import/recipes` to list
- [x] API endpoint: `GET /api/import/recipes/[id]` to load
- [x] `deleteRecipe(id)` via `DELETE /api/import/recipes/[id]`
- **Estimated:** 1 hour ✅ COMPLETE

### Task 4.2: Add recipe selector to UI

- ⚠️ Dropdown of user's saved recipes (partial integration)
- ⚠️ "Save current mapping as recipe" button (exists but needs polish)
- ⚠️ Recipe name input dialog (modal exists)
- ⚠️ Load recipe auto-fills all mappings (logic ready)
- **Estimated:** 1 hour ✅ PARTIAL - Backend 100%, UI 60%

### Task 4.3: Seed Insight Timer built-in recipe

- [x] Created via `app/server/api/import/recipes.get.ts` (auto-creates on load)
- [x] Recipe: name="Insight Timer", userId=null (built-in)
- [x] Mappings: "Started At"→startedAt, "Duration"→duration, "Activity"→name, etc.
- [x] Defaults: category="mindfulness", type="timed"
- [x] Uses user's timezone
- [x] Export instructions added to UI panel
- **Estimated:** 30 minutes ✅ COMPLETE

### Task 4.4: Add recipe rollback mechanism

- [x] Store previous mapping versions on update (up to 3)
- ⚠️ `POST /api/import/recipes/[id]/restore` endpoint created
- [ ] "Restore Previous" button in UI
- [ ] Limit to last 3 versions (auto-prune) - backend enforces
- **Estimated:** 30 minutes ⚠️ BACKEND COMPLETE, UI MISSING

---

## Phase 5: Integration & Polish (2-3 hours)

### Task 5.1: Add import navigation to Settings

- [x] Update `app/pages/settings.vue`
- [x] Add "Data" section with "Import Data" link (📥 icon)
- [x] Link to `/import`
- **Estimated:** 15 minutes ✅ COMPLETE

### Task 5.2: Add Insight Timer instructions

- [x] Create expandable instructions panel on `/import`
- [x] Include: "Settings → Features & Preferences → Sessions → Export Data" (8 steps)
- [x] Collapsible section with toggle button
- [x] Added to `app/pages/import/index.vue`
- **Estimated:** 30 minutes ✅ COMPLETE

### Task 5.3: Error handling & user feedback

- [x] Toast notifications for success/error
- [x] Inline validation messages
- [x] Helpful error text (not just "500 Error")
- ⚠️ Loading states for all async operations (mostly done)
- **Estimated:** 1 hour ✅ MOSTLY COMPLETE

### Task 5.4: Write E2E test

- [ ] Test full import flow with sample CSV
- [ ] Verify entries created in database
- [ ] Test recipe save/load
- [ ] Test error scenarios
- [ ] Create `tests/e2e/import-flow.spec.ts`
- **Estimated:** 1 hour ❌ NOT STARTED (Recommended for v0.2.0 final)

### Task 5.5: Update AGENTS.md and roadmap

- [x] Document CSV import feature in AGENTS.md
- [x] Add CSV Import section with API reference
- [ ] Mark roadmap item as complete in `design/roadmap.md`
- [ ] Create deployment checklist
- **Estimated:** 15 minutes ✅ MOSTLY COMPLETE

---

## Testing Checklist

Before merging to main:

- [x] All unit tests passing (80/80)
- [ ] E2E test passing (deferred - @nuxt/test-utils needed)
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
