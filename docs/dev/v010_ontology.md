# v0.10 Ontology Implementation Plan

_Category hierarchy, emoji system, and type normalization for Tada v0.1.0_

**Status:** Planning  
**Created:** 2026-01-11  
**Design Doc:** [ontology.md](../../design/ontology.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Changes](#schema-changes)
3. [Category Defaults Config](#category-defaults-config)
4. [Timer Page Updates](#timer-page-updates)
5. [Add Page Updates](#add-page-updates)
6. [Journal Page Updates](#journal-page-updates)
7. [Timeline Updates](#timeline-updates)
8. [Habit Matching Updates](#habit-matching-updates)
9. [API Updates](#api-updates)
10. [Testing Checklist](#testing-checklist)

---

## Overview

This implementation adds three-level entry classification (type/category/subcategory) with emoji and color support.

### Goals

1. Add `category`, `subcategory`, `emoji` columns to entries table
2. Create `categorySettings` table for future user customization
3. Create shared category defaults config with emojis and colors
4. Update timer to use new ontology (`type: "timed"` + category/subcategory)
5. Update add/journal pages to populate category/subcategory
6. Update timeline to display emoji badges with category colors
7. Simplify habit matching to use new top-level fields

### Files to Create

- `app/utils/categoryDefaults.ts` — Default categories, subcategories, emojis, colors

### Files to Modify

- `app/server/db/schema.ts` — Add fields and new table
- `app/server/db/migrations/` — New migration file
- `app/pages/timer.vue` — Use new ontology
- `app/pages/add.vue` — Add category/subcategory selection
- `app/pages/journal.vue` — Display with emoji
- `app/pages/index.vue` — Emoji badges in timeline
- `app/server/api/entries/*.ts` — Handle new fields

---

## Schema Changes

### 1. Add columns to entries table

```typescript
// In entries table definition, add after 'name':
category: text("category"),       // "mindfulness", "accomplishment", etc.
subcategory: text("subcategory"), // "sitting", "work", etc.
emoji: text("emoji"),             // Per-entry override (nullable)
```

### 2. Create categorySettings table

```typescript
export const categorySettings = sqliteTable("category_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  category: text("category").notNull(),
  subcategory: text("subcategory"), // null = category-level setting

  emoji: text("emoji"),
  color: text("color"),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
```

### 3. Update timerPresets table

Rename `category` to `subcategory` and add `category`:

```typescript
// Change:
category: text('category').notNull(), // 'sitting', 'breathing', etc.

// To:
category: text("category").notNull(),     // "mindfulness", "creative", etc.
subcategory: text("subcategory").notNull(), // "sitting", "piano", etc.
```

### 4. Update habits table

Add direct matching fields (simpler than JSON matchers):

```typescript
// Add new fields:
matchType: text("match_type"),
matchCategory: text("match_category"),
matchSubcategory: text("match_subcategory"),
matchName: text("match_name"),

// Keep activityMatchers for backward compatibility, but prefer new fields
```

### 5. Generate migration

```bash
cd app
bun run db:generate
```

This will create a new migration file with ALTER TABLE statements.

---

## Category Defaults Config

Create `app/utils/categoryDefaults.ts`:

```typescript
/**
 * Category Defaults - Emojis, colors, and subcategories
 * See design/ontology.md for full documentation
 */

export interface CategoryDefinition {
  emoji: string;
  color: string;
  label: string;
  subcategories: SubcategoryDefinition[];
}

export interface SubcategoryDefinition {
  slug: string;
  emoji: string;
  label: string;
}

export const CATEGORY_DEFAULTS: Record<string, CategoryDefinition> = {
  mindfulness: {
    emoji: "🧘",
    color: "#7C3AED",
    label: "Mindfulness",
    subcategories: [
      { slug: "sitting", emoji: "🧘", label: "Sitting Meditation" },
      { slug: "breathing", emoji: "🫁", label: "Breathing Exercise" },
      { slug: "walking", emoji: "🚶", label: "Walking Meditation" },
      { slug: "body_scan", emoji: "🫀", label: "Body Scan" },
      { slug: "loving_kindness", emoji: "💗", label: "Loving-Kindness" },
      { slug: "prayer", emoji: "🙏", label: "Prayer" },
      { slug: "visualization", emoji: "🌈", label: "Visualization" },
    ],
  },
  movement: {
    emoji: "🏃",
    color: "#059669",
    label: "Movement",
    subcategories: [
      { slug: "yoga", emoji: "🧘‍♀️", label: "Yoga" },
      { slug: "tai_chi", emoji: "🥋", label: "Tai Chi" },
      { slug: "running", emoji: "🏃", label: "Running" },
      { slug: "walking", emoji: "🚶", label: "Walking" },
      { slug: "cycling", emoji: "🚴", label: "Cycling" },
      { slug: "strength", emoji: "💪", label: "Strength Training" },
      { slug: "gym", emoji: "🏋️", label: "Gym" },
      { slug: "swimming", emoji: "🏊", label: "Swimming" },
      { slug: "dance", emoji: "💃", label: "Dance" },
    ],
  },
  creative: {
    emoji: "🎵",
    color: "#D97706",
    label: "Creative",
    subcategories: [
      { slug: "music", emoji: "🎵", label: "Music Practice" },
      { slug: "piano", emoji: "🎹", label: "Piano" },
      { slug: "guitar", emoji: "🎸", label: "Guitar" },
      { slug: "singing", emoji: "🎤", label: "Singing" },
      { slug: "art", emoji: "🎨", label: "Art" },
      { slug: "writing", emoji: "✍️", label: "Writing" },
      { slug: "coding", emoji: "💻", label: "Coding" },
      { slug: "crafts", emoji: "🧶", label: "Crafts" },
    ],
  },
  learning: {
    emoji: "📚",
    color: "#2563EB",
    label: "Learning",
    subcategories: [
      { slug: "lesson", emoji: "📚", label: "Lesson" },
      { slug: "reading", emoji: "📖", label: "Reading" },
      { slug: "language", emoji: "🗣️", label: "Language" },
      { slug: "course", emoji: "🎓", label: "Course" },
      { slug: "practice", emoji: "🎯", label: "Practice" },
    ],
  },
  journal: {
    emoji: "📝",
    color: "#6366F1",
    label: "Journal",
    subcategories: [
      { slug: "dream", emoji: "🌙", label: "Dream" },
      { slug: "gratitude", emoji: "🙏", label: "Gratitude" },
      { slug: "reflection", emoji: "💭", label: "Reflection" },
      { slug: "note", emoji: "📝", label: "Note" },
      { slug: "serendipity", emoji: "✨", label: "Serendipity" },
      { slug: "memory", emoji: "📸", label: "Memory" },
    ],
  },
  accomplishment: {
    emoji: "⚡",
    color: "#F59E0B",
    label: "Accomplishment",
    subcategories: [
      { slug: "home", emoji: "🏠", label: "Home" },
      { slug: "work", emoji: "💼", label: "Work" },
      { slug: "personal", emoji: "🎯", label: "Personal" },
      { slug: "hobby", emoji: "🎨", label: "Hobby" },
      { slug: "social", emoji: "👫", label: "Social" },
      { slug: "health", emoji: "💚", label: "Health" },
    ],
  },
  events: {
    emoji: "🎭",
    color: "#EC4899",
    label: "Events",
    subcategories: [
      { slug: "concert", emoji: "🎵", label: "Concert" },
      { slug: "movie", emoji: "🎬", label: "Movie" },
      { slug: "theatre", emoji: "🎭", label: "Theatre" },
      { slug: "exhibition", emoji: "🖼️", label: "Exhibition" },
      { slug: "talk", emoji: "🎤", label: "Talk" },
      { slug: "sports", emoji: "🏟️", label: "Sports Event" },
    ],
  },
};

// Flat lookup for subcategories (any category)
export const SUBCATEGORY_DEFAULTS: Record<
  string,
  { emoji: string; label: string; category: string }
> = {};

// Build the flat lookup
for (const [categorySlug, category] of Object.entries(CATEGORY_DEFAULTS)) {
  for (const subcat of category.subcategories) {
    // If same slug exists in multiple categories, first one wins (or we could make it category-specific)
    if (!SUBCATEGORY_DEFAULTS[subcat.slug]) {
      SUBCATEGORY_DEFAULTS[subcat.slug] = {
        emoji: subcat.emoji,
        label: subcat.label,
        category: categorySlug,
      };
    }
  }
}

// Default fallbacks
export const DEFAULT_EMOJI = "📌";
export const DEFAULT_COLOR = "#6B7280";

/**
 * Get display properties for an entry
 */
export function getEntryDisplayProps(entry: {
  emoji?: string | null;
  category?: string | null;
  subcategory?: string | null;
}): { emoji: string; color: string; label: string } {
  const emoji =
    entry.emoji ||
    (entry.subcategory && SUBCATEGORY_DEFAULTS[entry.subcategory]?.emoji) ||
    (entry.category && CATEGORY_DEFAULTS[entry.category]?.emoji) ||
    DEFAULT_EMOJI;

  const color =
    (entry.category && CATEGORY_DEFAULTS[entry.category]?.color) ||
    DEFAULT_COLOR;

  const label =
    (entry.subcategory && SUBCATEGORY_DEFAULTS[entry.subcategory]?.label) ||
    (entry.category && CATEGORY_DEFAULTS[entry.category]?.label) ||
    "Entry";

  return { emoji, color, label };
}

/**
 * Get subcategories for a category
 */
export function getSubcategoriesForCategory(
  category: string
): SubcategoryDefinition[] {
  return CATEGORY_DEFAULTS[category]?.subcategories || [];
}
```

---

## Timer Page Updates

File: `app/pages/timer.vue`

### Current State

- Uses `type: "meditation"` when saving entries
- Stores category in `data.category` (e.g., "sitting", "breathing")
- Categories array hardcoded with emoji icons

### Changes

1. **Update type normalization**: Save as `type: "timed"` instead of `type: "meditation"`

2. **Add category field**: Set `category: "mindfulness"` (or "creative" for music, etc.)

3. **Move subcategory to top-level**: Use `subcategory` field instead of `data.category`

4. **Import category defaults**: Use `CATEGORY_DEFAULTS` and `getSubcategoriesForCategory()`

5. **Update categories array**: Generate from defaults instead of hardcoding

```typescript
// Before:
const categories = [
  { value: "sitting", label: "Sitting", icon: "🧘" },
  // ...
];

// After:
import {
  CATEGORY_DEFAULTS,
  getSubcategoriesForCategory,
} from "~/utils/categoryDefaults";

const selectedCategory = ref("mindfulness");
const subcategories = computed(() =>
  getSubcategoriesForCategory(selectedCategory.value).map((s) => ({
    value: s.slug,
    label: s.label,
    icon: s.emoji,
  }))
);
```

6. **Display large emoji**: Show selected subcategory emoji prominently on timer screen

7. **Update entry creation**:

```typescript
// Before:
const entry = {
  type: "meditation",
  name: `${categoryLabel} (${formattedDuration})`,
  data: { category: selectedCategory.value, ... },
  ...
};

// After:
const entry = {
  type: "timed",
  category: "mindfulness",  // or derived from UI
  subcategory: selectedSubcategory.value,
  name: `${subcategoryLabel} (${formattedDuration})`,
  data: { ... },  // No longer needs category here
  ...
};
```

---

## Add Page Updates

File: `app/pages/add.vue`

### Current State

- Entry types: "tada", "dream", "note", "meditation"
- Uses `type` field directly for these values

### Changes

1. **Normalize entry types**:

| Old          | New Type            | New Category     | New Subcategory                  |
| ------------ | ------------------- | ---------------- | -------------------------------- |
| `tada`       | `tada`              | `accomplishment` | (user picks: home/work/personal) |
| `dream`      | `journal`           | `journal`        | `dream`                          |
| `note`       | `journal`           | `journal`        | `note`                           |
| `meditation` | (redirect to timer) | -                | -                                |

2. **Add subcategory picker for tadas**:

```vue
<select v-if="entryType === 'tada'" v-model="subcategory">
  <option value="home">🏠 Home</option>
  <option value="work">💼 Work</option>
  <option value="personal">🎯 Personal</option>
  <option value="hobby">🎨 Hobby</option>
  <option value="social">👫 Social</option>
</select>
```

3. **Auto-set category based on type**:

```typescript
const category = computed(() => {
  switch (entryType.value) {
    case "tada":
      return "accomplishment";
    case "dream":
    case "note":
      return "journal";
    default:
      return null;
  }
});

const subcategory = computed(() => {
  if (entryType.value === "dream") return "dream";
  if (entryType.value === "note") return "note";
  return selectedSubcategory.value;
});
```

4. **Show emoji in entry type buttons**:

```vue
<button @click="entryType = 'tada'">
  ⚡ Tada!
</button>
<button @click="entryType = 'dream'">
  🌙 Dream
</button>
<button @click="entryType = 'note'">
  📝 Note
</button>
```

5. **Update entry creation**:

```typescript
const entry = {
  type: entryType.value === "tada" ? "tada" : "journal",
  category: category.value,
  subcategory: subcategory.value,
  name: title.value || `${subcategoryLabel} entry`,
  // ...
};
```

---

## Journal Page Updates

File: `app/pages/journal.vue`

### Current State

- Filters entries where type is one of `['dream', 'note', 'journal', 'tada']`
- Displays type as badge

### Changes

1. **Update filter logic**:

```typescript
// Before:
const journalTypes = ["dream", "note", "journal", "tada"];
const isJournalEntry = journalTypes.includes(entry.type);

// After (filter by type, not by old type strings):
const isJournalEntry = entry.type === "journal" || entry.type === "tada";
```

2. **Display emoji badge instead of type text**:

```vue
<!-- Before -->
<span class="badge">{{ entry.type }}</span>

<!-- After -->
<span
  class="badge"
  :style="{ backgroundColor: getEntryDisplayProps(entry).color }"
>
  {{ getEntryDisplayProps(entry).emoji }}
</span>
```

3. **Group or filter by category/subcategory**:

Add filter dropdown to show only dreams, only tadas, etc.

```vue
<select v-model="filter">
  <option value="">All</option>
  <option value="dream">🌙 Dreams</option>
  <option value="tada">⚡ Tadas</option>
  <option value="gratitude">🙏 Gratitude</option>
  <option value="note">📝 Notes</option>
</select>
```

---

## Timeline Updates

File: `app/pages/index.vue`

### Current State

- Displays entries in a list with type badge
- No emoji or color coding

### Changes

1. **Import display helpers**:

```typescript
import {
  getEntryDisplayProps,
  CATEGORY_DEFAULTS,
} from "~/utils/categoryDefaults";
```

2. **Add emoji badge to each entry**:

```vue
<template>
  <div v-for="entry in entries" :key="entry.id" class="entry-row">
    <!-- Emoji badge -->
    <span
      class="emoji-badge"
      :style="{ backgroundColor: getEntryDisplayProps(entry).color + '20' }"
    >
      {{ getEntryDisplayProps(entry).emoji }}
    </span>

    <!-- Entry content -->
    <div class="entry-content">
      <span class="entry-name">{{ entry.name }}</span>
      <span class="entry-meta">
        {{ entry.category }}
        <span v-if="entry.subcategory"> • {{ entry.subcategory }}</span>
      </span>
    </div>

    <!-- Duration/time -->
    <span v-if="entry.durationSeconds" class="entry-duration">
      {{ formatDuration(entry.durationSeconds) }}
    </span>
  </div>
</template>
```

3. **Style emoji badges**:

```css
.emoji-badge {
  font-size: 1.5rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  flex-shrink: 0;
}
```

4. **Optional: Group by category**:

Add view toggle to group entries by category instead of chronological.

5. **Category filter pills**:

```vue
<div class="category-filters">
  <button 
    v-for="(cat, slug) in CATEGORY_DEFAULTS" 
    :key="slug"
    :class="{ active: activeFilter === slug }"
    @click="activeFilter = slug"
  >
    {{ cat.emoji }} {{ cat.label }}
  </button>
</div>
```

---

## Habit Matching Updates

File: `app/server/db/schema.ts` (habits table)

### Current State

- Uses `activityMatchers` JSON array with complex matcher objects
- Matches on `field: 'name' | 'type' | 'tag' | 'category'`

### Changes

1. **Add direct matching fields** (simpler, more efficient):

```typescript
export const habits = sqliteTable("habits", {
  // ... existing fields ...

  // New: Direct matching (simpler than JSON matchers)
  matchType: text("match_type"), // e.g., "timed"
  matchCategory: text("match_category"), // e.g., "mindfulness"
  matchSubcategory: text("match_subcategory"), // e.g., "sitting"
  matchName: text("match_name"), // e.g., "meditation"

  // Keep activityMatchers for complex cases, but prefer new fields
});
```

2. **Update habit matching logic**:

```typescript
function entryMatchesHabit(entry: Entry, habit: Habit): boolean {
  // Use new direct fields if available
  if (habit.matchType && entry.type !== habit.matchType) return false;
  if (habit.matchCategory && entry.category !== habit.matchCategory)
    return false;
  if (habit.matchSubcategory && entry.subcategory !== habit.matchSubcategory)
    return false;
  if (
    habit.matchName &&
    !entry.name.toLowerCase().includes(habit.matchName.toLowerCase())
  )
    return false;

  // Fall back to legacy matchers if present
  // ...

  return true;
}
```

3. **Example habit definitions**:

```typescript
// "Daily Meditation" habit
{
  name: "Daily Meditation",
  matchType: "timed",
  matchCategory: "mindfulness",
  goalType: "duration",
  goalValue: 6,  // 6 minutes
  goalUnit: "minutes",
  frequency: "daily",
}

// "Morning Tai Chi" habit
{
  name: "Morning Tai Chi",
  matchType: "timed",
  matchCategory: "mindfulness",
  matchSubcategory: "tai_chi",
  goalType: "boolean",
  goalValue: 1,
  frequency: "daily",
}
```

---

## API Updates

### Entry Creation/Update

Files: `app/server/api/entries/index.post.ts`, `app/server/api/entries/[id].patch.ts`

1. **Accept new fields in request body**:

```typescript
const body = await readBody(event);
const { type, name, category, subcategory, emoji, ...rest } = body;
```

2. **Validate category/subcategory** (optional, since open strings allowed):

```typescript
import { CATEGORY_DEFAULTS } from "~/utils/categoryDefaults";

// Warn if unknown category (but allow it)
if (category && !CATEGORY_DEFAULTS[category]) {
  console.warn(`Unknown category: ${category}`);
}
```

3. **Include in database insert**:

```typescript
const newEntry = await db
  .insert(entries)
  .values({
    id: generateId(),
    userId: session.userId,
    type,
    name,
    category,
    subcategory,
    emoji,
    // ...rest
  })
  .returning();
```

### Entry Retrieval

File: `app/server/api/entries/index.get.ts`

1. **Return new fields** (automatic if selecting all columns)

2. **Add category filter** (optional enhancement):

```typescript
const { category, subcategory } = getQuery(event);

let query = db.select().from(entries).where(eq(entries.userId, session.userId));

if (category) {
  query = query.where(eq(entries.category, category));
}
if (subcategory) {
  query = query.where(eq(entries.subcategory, subcategory));
}
```

---

## Testing Checklist

### Schema Migration

- [ ] Run `bun run db:generate` successfully
- [ ] Run `bun run db:migrate` successfully
- [ ] New columns appear in entries table
- [ ] categorySettings table created
- [ ] timerPresets updated with category/subcategory

### Timer Page

- [ ] Timer shows subcategory picker with emojis
- [ ] Large emoji displays during countdown
- [ ] Completing timer creates entry with `type: "timed"`
- [ ] Entry has `category: "mindfulness"` (or appropriate)
- [ ] Entry has `subcategory` matching selection
- [ ] Entry name includes subcategory label

### Add Page

- [ ] Tada button shows ⚡ emoji
- [ ] Dream button shows 🌙 emoji
- [ ] Note button shows 📝 emoji
- [ ] Tada creation has subcategory picker (home/work/personal)
- [ ] Tada entry has `type: "tada"`, `category: "accomplishment"`
- [ ] Dream entry has `type: "journal"`, `category: "journal"`, `subcategory: "dream"`
- [ ] Note entry has `type: "journal"`, `category: "journal"`, `subcategory: "note"`

### Timeline (Index Page)

- [ ] Each entry shows emoji badge
- [ ] Badge background uses category color
- [ ] Category and subcategory shown in entry metadata
- [ ] Entries display correctly for all types

### Journal Page

- [ ] Filter works for journal and tada entries
- [ ] Emoji badges display correctly
- [ ] Category filter (if added) works

### API

- [ ] POST /api/entries accepts category, subcategory, emoji
- [ ] GET /api/entries returns new fields
- [ ] PATCH /api/entries/[id] can update new fields

### Edge Cases

- [ ] Entry with unknown category displays with fallback (📌 gray)
- [ ] Entry without category/subcategory displays gracefully
- [ ] Old entries (if any exist) display without errors

---

## Implementation Order

1. **Schema changes** — foundation for everything else
2. **Category defaults config** — shared constants
3. **Timer page** — highest-traffic entry creation
4. **Add page** — other entry types
5. **Timeline** — primary display surface
6. **Journal page** — secondary display
7. **API updates** — filtering enhancements
8. **Habit matching** — can defer to v0.1.1 if needed

---

_Implementation plan for Tada v0.1.0 ontology feature. See [ontology.md](../../design/ontology.md) for design rationale._
