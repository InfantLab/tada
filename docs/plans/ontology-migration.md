# Ontology Migration Plan

**Date:** January 26, 2026  
**Status:** Planning  
**Related:** [ontology.md](../../design/ontology.md), [decisions.md](../../design/decisions.md)

---

## Overview

Migrate the codebase from the old type/category naming to the refined ontology:

| Before    | After     | Level       | Meaning                      |
| --------- | --------- | ----------- | ---------------------------- |
| `journal` | `moment`  | Type        | Reflective capture behavior  |
| `reps`    | `tally`   | Type        | Count-based capture behavior |
| `journal` | `moments` | Category    | Inner life domain            |
| `note`    | `journal` | Subcategory | Personal diary entries       |

---

## Phase 1: Database Schema & Migration

### 1.1 Update Schema Types

**File:** `server/db/schema.ts`

- [ ] Update type enum/comments to reflect new types: `timed`, `tada`, `moment`, `tally`
- [ ] Update category comments to show `moments` instead of `journal`

### 1.2 Create Migration

**File:** `server/db/migrations/XXXX_ontology_rename.sql`

```sql
-- Rename type: journal → moment
UPDATE entries SET type = 'moment' WHERE type = 'journal';

-- Rename type: reps → tally
UPDATE entries SET type = 'tally' WHERE type = 'reps';

-- Rename category: journal → moments
UPDATE entries SET category = 'moments' WHERE category = 'journal';

-- Rename subcategory: note → journal
UPDATE entries SET subcategory = 'journal' WHERE subcategory = 'note';

-- Update rhythms that match on old values
UPDATE rhythms SET match_category = 'moments' WHERE match_category = 'journal';
UPDATE rhythms SET match_subcategory = 'journal' WHERE match_subcategory = 'note';

-- Update timer_presets if any reference old values
UPDATE timer_presets SET subcategory = 'journal' WHERE subcategory = 'note';
```

### 1.3 Backward Compatibility

Add query normalization for legacy data (imported entries, API calls):

**File:** `server/utils/normalizeEntry.ts` (new)

```typescript
export function normalizeEntryType(type: string): string {
  if (type === "journal") return "moment";
  if (type === "reps") return "tally";
  return type;
}

export function normalizeCategory(category: string): string {
  if (category === "journal") return "moments";
  return category;
}

export function normalizeSubcategory(subcategory: string): string {
  if (subcategory === "note") return "journal";
  return subcategory;
}
```

---

## Phase 2: Utility Updates

### 2.1 Category Defaults

**File:** `utils/categoryDefaults.ts`

- [x] Rename `journal` category → `moments` ✅ (already done in design, verify code)
- [ ] Update emoji: 📝 → 💭 for moments category
- [ ] Rename `note` subcategory → `journal`
- [ ] Reorder subcategories: `journal` first under moments

### 2.2 Entry Type Schemas

**File:** `utils/entrySchemas.ts` (if exists) or create

- [ ] Add `moment` type schema (rename from journal)
- [ ] Add `tally` type schema (rename from reps)
- [ ] Keep backward compat aliases

### 2.3 Entry Display Utils

**Files:** Any utils that check entry types

- [ ] Search for `type === "journal"` → update to `type === "moment"`
- [ ] Search for `type === "reps"` → update to `type === "tally"`
- [ ] Search for `category === "journal"` → update to `category === "moments"`

---

## Phase 3: Page Updates

### 3.1 Moments Page

**File:** `pages/moments.vue`

- [ ] Update filter: `type === "journal"` → `type === "moment"`
- [ ] Update filter: `category === "journal"` → `category === "moments"`
- [ ] Update any hardcoded references

### 3.2 Tally Page

**File:** `pages/tally.vue`

- [ ] Ensure uses `type === "tally"` (not "reps")
- [ ] Verify category defaults work correctly

### 3.3 Add Page

**File:** `pages/add.vue`

- [ ] Update type selector to use `moment` not `journal`
- [ ] Update type selector to use `tally` not `reps`
- [ ] Update default categories for each type

### 3.4 Entry Detail Page

**File:** `pages/entry/[id].vue`

- [ ] Update type display labels
- [ ] Update category display

### 3.5 Sessions Page

**File:** `pages/sessions.vue`

- [ ] Verify still uses `type === "timed"` (unchanged)

---

## Phase 4: Component Updates

### 4.1 Entry Type Toggle

**File:** `components/EntryTypeToggle.vue`

- [ ] Update type options: `journal` → `moment`, `reps` → `tally`
- [ ] Update labels and icons

### 4.2 Quick Entry Modal

**File:** `components/QuickEntryModal.vue`

- [ ] Update any type references

### 4.3 Timeline Components

**Files:** `components/VirtualTimeline.vue`, `components/TimelineHeader.vue`

- [ ] Update type-based styling/filtering

### 4.4 Import Wizard

**File:** `components/ImportWizard.vue`

- [ ] Update type mapping for imports
- [ ] Ensure imported entries use new type names

---

## Phase 5: Composable Updates

### 5.1 useEntryEngine

**File:** `composables/useEntryEngine.ts`

- [ ] Update type references
- [ ] Update default values

### 5.2 useEntrySave

**File:** `composables/useEntrySave.ts`

- [ ] Update validation
- [ ] Update default types

### 5.3 useJournalTypeDetection

**File:** `composables/useJournalTypeDetection.ts`

- [ ] Rename to `useMomentTypeDetection.ts`?
- [ ] Or keep name but update internal references

---

## Phase 6: API Updates

### 6.1 Entry Endpoints

**Files:** `server/api/entries/*.ts`

- [ ] Update validation to accept new types
- [ ] Apply normalization to incoming data
- [ ] Update any type-specific logic

### 6.2 Import Endpoints

**Files:** `server/api/import/*.ts`

- [ ] Update type mapping
- [ ] Normalize imported entry types

---

## Phase 7: Test Updates

### 7.1 Unit Tests

- [ ] Update all tests using `type: "journal"` → `type: "moment"`
- [ ] Update all tests using `type: "reps"` → `type: "tally"`
- [ ] Update category/subcategory references

### 7.2 Search Pattern

```bash
# Find all references to update
grep -r "journal" --include="*.ts" --include="*.vue" app/
grep -r "reps" --include="*.ts" --include="*.vue" app/
```

---

## Implementation Order

1. **Schema & Migration** - Database first (with backward compat)
2. **Utils** - categoryDefaults, normalization helpers
3. **Composables** - Core logic
4. **Pages** - UI updates
5. **Components** - Shared components
6. **API** - Server endpoints
7. **Tests** - Update all test files
8. **Verify** - Run full test suite, manual testing

---

## Rollback Plan

If issues arise:

1. Migration is reversible (just swap values back)
2. Normalization functions can work both directions
3. No data is deleted, only renamed

---

## Success Criteria

- [ ] All tests pass
- [ ] Moments page shows moment-type entries
- [ ] Tally page shows tally-type entries
- [ ] New entries created with correct types
- [ ] Imported entries normalized correctly
- [ ] No console errors related to type mismatches
