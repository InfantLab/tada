# Ta-Da! Entry Ontology

**Version:** 0.4.0
**Last Updated:** February 2026
**Status:** Current

_Defines the category hierarchy, type system, and emoji conventions for all Ta-Da! entries._

---

## Table of Contents

1. [Overview](#overview)
2. [Type System](#type-system)
3. [Category Hierarchy](#category-hierarchy)
4. [Subcategory Definitions](#subcategory-definitions)
5. [Emoji Conventions](#emoji-conventions)
6. [Color Palette](#color-palette)
7. [Schema Representation](#schema-representation)
8. [Display Logic](#display-logic)
9. [Future Considerations](#future-considerations)

---

## Overview

Tada uses a **unified Entry model** where every piece of life data is stored as a single entry type with flexible metadata. This ontology defines how entries are classified across three dimensions:

| Dimension       | Purpose           | Examples                           | Editable        |
| --------------- | ----------------- | ---------------------------------- | --------------- |
| **Type**        | Capture behavior  | `timed`, `tada`, `moment`, `tally` | System-defined  |
| **Category**    | Life domain       | `mindfulness`, `life_admin`        | User-extensible |
| **Subcategory** | Specific activity | `sitting`, `work`, `piano`         | User-extensible |

### Design Principles

1. **Open strings, sensible defaults** — Categories and subcategories are open text fields with curated defaults, not rigid enums
2. **Type determines behavior** — Entry type defines what data is captured and how the UI behaves
3. **Category enables grouping** — Categories provide cross-type organization for filtering and visualization
4. **Emoji as visual language** — Every category and subcategory has a default emoji for instant recognition
5. **Inspired by standards** — Informed by Apple HealthKit activity types, Strava sport types, and Daylio's category model

### Why Three Levels?

- **Type alone** conflates structure with domain (is "meditation" a timer behavior or a mindfulness practice?)
- **Category alone** loses behavioral distinction (tada celebrations need different UI than moment reflections)
- **Three levels** provide: consistent behavior (type) + domain grouping (category) + specificity (subcategory)

---

## Type System

Types define **how an entry is captured** — the behavior mode. Each type has a specific data schema and UI treatment.

### Core Types (v0.3.0)

| Type     | Behavior            | Verb      | Data Schema  | Primary Use                             |
| -------- | ------------------- | --------- | ------------ | --------------------------------------- |
| `timed`  | Duration-based      | Practice  | `TimedData`  | Meditation, exercise, practice sessions |
| `tada`   | Celebration capture | Celebrate | `TadaData`   | Celebrating wins, gratitude, milestones |
| `moment` | Reflective text     | Reflect   | `MomentData` | Dreams, notes, reflections, memories    |
| `tally`  | Count-based         | Count     | `TallyData`  | Push-ups, glasses of water, reps        |

### Planned Types (v0.4.0+)

| Type          | Behavior                  | Data Schema       | Primary Use                         |
| ------------- | ------------------------- | ----------------- | ----------------------------------- |
| `measurement` | Point-in-time value       | `MeasurementData` | Weight, blood pressure, sleep hours |
| `experience`  | Event attended            | `ExperienceData`  | Concerts, movies, exhibitions       |
| `consumption` | Media consumed            | `ConsumptionData` | Books, podcasts, articles           |
| `gps_tracked` | Location-tracked activity | `GpsData`         | Runs, walks, bike rides with route  |

### Type Data Schemas

```typescript
// Timed activities (meditation, exercise, practice)
interface TimedData {
  duration: number; // seconds
  startedAt: string; // ISO timestamp
  endedAt: string; // ISO timestamp
  targetDuration?: number; // planned duration in seconds
}

// Celebrations (the app's namesake!)
interface TadaData {
  content: string;
  significance?: "minor" | "normal" | "major";
  voiceTranscription?: string; // original if voice-captured
}

// Moments (inner life reflections)
interface MomentData {
  content: string;
  mood?: number; // 1-5 scale
  themes?: string[]; // e.g., ["lucid", "flying"] for dreams
}

// Tallies (count-based activities)
interface TallyData {
  count: number; // the number recorded
  unit?: string; // e.g., "reps", "glasses", "pages"
}
```

### Why Tada is a Type, Not a Category

**Tada is the philosophical foundation of this app** — the inversion of the anxiety-inducing todo list into a celebration of life. It deserves first-class type status because:

1. **Unique behavior**: Quick capture, voice input, significance levels, calendar visualization
2. **Different data schema**: `TadaData` has fields (significance, voiceTranscription) that don't belong in moments
3. **Namesake status**: The app is literally named after this concept
4. **Philosophical distinction**: Tadas are _celebratory_ (noticing what matters) — they can be accomplishments, gratitude, or any moment worth celebrating

---

## Category Hierarchy

Categories represent **life domains** — broad areas of human activity that entries belong to. They enable cross-type grouping and provide visual consistency through shared colors and emojis.

### Core Categories (v0.4.0)

| Category      | Emoji | Color              | Description                                    |
| ------------- | ----- | ------------------ | ---------------------------------------------- |
| `mindfulness` | 🧘    | `#7C3AED` (purple) | Meditation, breathing, contemplative practices |
| `movement`    | 🏃    | `#059669` (green)  | Physical exercise, sports, body practices      |
| `creative`    | 🎨    | `#D97706` (amber)  | Music, art, writing, making things             |
| `learning`    | 📚    | `#2563EB` (blue)   | Study, courses, skill acquisition              |
| `health`      | 💚    | `#14B8A6` (teal)   | Wellness, sleep, nutrition, self-care          |
| `work`        | 💼    | `#64748B` (slate)  | Career, professional, job achievements         |
| `social`      | 👥    | `#F43F5E` (rose)   | Relationships, community, connection           |
| `life_admin`  | 🏠    | `#78716C` (stone)  | Chores, errands, household maintenance         |
| `moments`     | 💭    | `#6366F1` (indigo) | Inner life: dreams, ideas, memories            |
| `events`      | 🎭    | `#EC4899` (pink)   | Concerts, movies, attended experiences         |

> **Tadas use these categories**: The `tada` type marks celebrations; the category tells you what life domain. "Ran a marathon!" is `type: tada, category: movement, subcategory: running`.

### Category-Type Relationships

Categories can span multiple types. The relationship is suggestive, not restrictive:

| Category      | Primary Types                   | Example Entries                          |
| ------------- | ------------------------------- | ---------------------------------------- |
| `mindfulness` | `timed`, `tada`                 | 10-minute sit, "30-day streak!" 🧘       |
| `movement`    | `timed`, `tally`, `tada`        | Yoga session, 50 push-ups, "Ran a marathon!" 🏃 |
| `creative`    | `timed`, `tada`                 | Piano practice, "Finished the painting!" 🎨 |
| `learning`    | `timed`, `tada`                 | Language lesson, "Passed the exam!" 📚   |
| `health`      | `tada`, `tally`, `measurement`  | "Slept 8 hours!", water intake, weight   |
| `work`        | `tada`                          | "Got promoted!", "Shipped the feature!" 💼 |
| `social`      | `tada`                          | "Called mom for an hour!", "Made a new friend!" 👥 |
| `life_admin`  | `tada`, `timed`                 | "Vacuumed the house!" 🧹, meal prep      |
| `moments`     | `moment`                        | Dream record, idea capture, journal      |
| `events`      | `experience`, `tada`            | Concert, "Saw Radiohead live!" 🎭        |

> **Tadas leverage categories**: Every celebration belongs to a life domain. The `type: tada` marks it as celebratory; the category provides grouping and visualization.

### User Extension

Users can use any string as a category. The defaults above provide sensible starting points, but entries with `category: "magick"` or `category: "parenting"` work immediately. Custom categories inherit a neutral default (📌 gray) until user assigns emoji/color in settings (v0.20).

---

## Subcategory Definitions

Subcategories provide **specific activity identification** within a category. They enable precise filtering, rhythm matching, and meaningful defaults.

### Mindfulness Subcategories

| Subcategory       | Emoji | Description                 |
| ----------------- | ----- | --------------------------- |
| `sitting`         | 🧘    | Seated meditation (default) |
| `breathing`       | 🫁    | Breath-focused exercises    |
| `walking`         | 🚶    | Walking meditation          |
| `body_scan`       | 🫀    | Body awareness practice     |
| `loving_kindness` | 💗    | Metta/compassion meditation |
| `prayer`          | 🙏    | Contemplative prayer        |
| `visualization`   | 🌈    | Guided imagery              |
| `manifesting`     | ✨    | Intention-setting, affirming |


### Movement Subcategories

| Subcategory     | Emoji | Description                 |
| --------------- | ----- | --------------------------- |
| `yoga`          | 🧘‍♀️    | Yoga practice               |
| `tai_chi`       | 🥋    | Tai chi, qigong             |
| `running`       | 🏃    | Running, jogging            |
| `walking`       | 🚶    | Fitness walking             |
| `cycling`       | 🚴    | Biking                      |
| `strength`      | 💪    | Weight training, resistance |
| `gym`           | 🏋️    | General gym workout         |
| `swimming`      | 🏊    | Swimming                    |
| `dance`         | 💃    | Dance practice              |
| `climbing`      | 🧗    | Bouldering, rock climbing   |
| `sport`         | ⚽    | Team sports, tennis, etc.   |
| `martial_arts`  | 🥊    | Boxing, BJJ, karate         |

### Creative Subcategories

| Subcategory | Emoji | Description                   |
| ----------- | ----- | ----------------------------- |
| `music`     | 🎵    | General music practice        |
| `piano`     | 🎹    | Piano/keyboard                |
| `guitar`    | 🎸    | Guitar                        |
| `singing`   | 🎤    | Vocal practice                |
| `art`       | 🎨    | Visual art, drawing, painting |
| `writing`   | ✍️    | Creative writing              |
| `coding`    | 💻    | Programming projects          |
| `crafts`    | 🧶    | Handcrafts, making            |

### Learning Subcategories

| Subcategory | Emoji | Description               |
| ----------- | ----- | ------------------------- |
| `lesson`    | 📚    | Formal lesson or course   |
| `reading`   | 📖    | Reading for learning      |
| `language`  | 🗣️    | Language practice         |
| `course`    | 🎓    | Online course, MOOC       |
| `practice`  | 🎯    | Deliberate skill practice |
| `podcast`   | 🎧    | Educational listening     |
| `research`  | 🔍    | Deep-dive investigation   |
| `workshop`  | 🛠️    | Hands-on learning session |
| `mentoring` | 👥    | Learning through guidance |

### Moments Subcategories

Content-focused: "What am I capturing?"

| Subcategory  | Emoji | Description                                    |
| ------------ | ----- | ---------------------------------------------- |
| `magic`      | 🪄    | Serendipity, pronoia, wonder, pure joy         |
| `dream`      | 🌙    | Dream recording with lucidity and vividness    |
| `gratitude`  | 🙏    | Something you're thankful for                  |
| `journal`    | 🪶    | Daily thoughts, freeform reflection            |

### Life Admin Subcategories

| Subcategory   | Emoji | Description                   |
| ------------- | ----- | ----------------------------- |
| `cleaning`    | 🧹    | Tidying, vacuuming, organizing |
| `laundry`     | 🧺    | Washing, folding, ironing     |
| `cooking`     | 🍳    | Meal prep, cooking            |
| `errands`     | 🛒    | Shopping, pickups, drop-offs  |
| `finances`    | 💳    | Bills, budgeting, paperwork   |
| `maintenance` | 🔧    | Home repairs, car care        |
| `admin`       | 📋    | Appointments, forms, emails   |

### Health Subcategories

| Subcategory  | Emoji | Description                  |
| ------------ | ----- | ---------------------------- |
| `sleep`      | 😴    | Sleep wins                   |
| `nutrition`  | 🥗    | Eating well                  |
| `hydration`  | 💧    | Drinking water               |
| `medical`    | 🏥    | Appointments, checkups, meds |
| `mental`     | 🧠    | Mental health, therapy       |
| `recovery`   | 🩹    | Rest, healing                |
| `self_care`  | 🛁    | Pampering, relaxation        |

### Work Subcategories

| Subcategory  | Emoji | Description              |
| ------------ | ----- | ------------------------ |
| `project`    | 📊    | Project milestones       |
| `meeting`    | 🤝    | Productive meetings      |
| `deadline`   | ⏰    | Hitting deadlines        |
| `win`        | 🏆    | Recognition, promotions  |
| `growth`     | 📈    | Professional development |

### Social Subcategories

| Subcategory  | Emoji | Description              |
| ------------ | ----- | ------------------------ |
| `family`     | 👨‍👩‍👧    | Family connection        |
| `friends`    | 👯    | Friend time              |
| `community`  | 🏘️    | Community involvement    |
| `connection` | 💕    | New or deepened bonds    |

### Events Subcategories

| Subcategory  | Emoji | Description              |
| ------------ | ----- | ------------------------ |
| `concert`    | 🎵    | Live music               |
| `movie`      | 🎬    | Film viewing             |
| `theatre`    | 🎭    | Stage performance        |
| `exhibition` | 🖼️    | Art/museum exhibition    |
| `talk`       | 🎤    | Lecture, conference talk |
| `sports`     | 🏟️    | Sporting event           |
| `festival`   | 🎪    | Multi-day events         |
| `dining`     | 🍽️    | Special meals, restaurants |
| `travel`     | ✈️    | Trips, holidays          |
| `gathering`  | 🎉    | Parties, celebrations    |

### Subcategory Overlap

Some subcategories appear in multiple categories (e.g., `walking` in mindfulness and movement). This is intentional — the category provides context:

- `category: "mindfulness", subcategory: "walking"` → walking meditation 🚶
- `category: "movement", subcategory: "walking"` → fitness walking 🚶

Same activity, different intention and framing.

### Tada Type Leverages All Categories

Every `tada` belongs to a life domain category. Examples:

| Celebration | Category | Subcategory |
|-------------|----------|-------------|
| "Ran a marathon!" | `movement` | `running` |
| "30-day meditation streak!" | `mindfulness` | `sitting` |
| "Finished the painting!" | `creative` | `art` |
| "Passed the exam!" | `learning` | `course` |
| "Slept 8 hours!" | `health` | `sleep` |
| "Got promoted!" | `work` | `win` |
| "Called mom for an hour" | `social` | `family` |
| "Vacuumed the house!" | `life_admin` | `cleaning` |
| "Saw Radiohead live!" | `events` | `concert` |

The **type** (`tada`) marks it as celebratory. The **category** tells you what life domain it belongs to. Together they enable filtering like "show me all my movement celebrations" or "show me everything I did this week in health".

---

## Emoji Conventions

Emojis provide **instant visual recognition** throughout the app. They appear in timelines, timers, calendars, and rhythm views.

### Emoji Architecture

There are THREE levels of emojis in the system:

| Level           | Scope             | Editability                          | Example                      |
| --------------- | ----------------- | ------------------------------------ | ---------------------------- |
| **Category**    | Life domain       | Defaults + user customization global | `mindfulness` → 🧘           |
| **Subcategory** | Specific activity | Defaults + user customization global | `sitting` → 🧘, `piano` → 🎹 |
| **Entry**       | Individual record | Set at creation, editable later      | A specific meditation → 🧘   |

### Emoji Flow: Creation → Display → Edit

**1. CREATING an entry:**

- When a new entry is created, it is assigned the **subcategory's emoji** (or category emoji if no subcategory)
- This emoji is stored in `entry.emoji` as the entry's personal emoji
- The emoji comes from: user's custom subcategory emoji → default subcategory emoji → category emoji

**2. DISPLAYING an entry:**

- Timeline and other views display the **entry's own emoji** (`entry.emoji`)
- If entry has no emoji (legacy data), fall back to subcategory → category → 📌

**3. EDITING an entry:**

- User can override the entry's emoji to any emoji they want
- This only affects that specific entry, not the category/subcategory defaults

### Why Store Emoji Per-Entry?

1. **Historical accuracy** — If user changes subcategory emoji, old entries keep their original emoji
2. **Personalization** — Each entry can have its own emoji (e.g., different meditation emojis for different sessions)
3. **Import flexibility** — Imported entries can preserve source-specific emojis
4. **Simple display logic** — Timeline just shows `entry.emoji`, no complex lookups

### Global Emoji Customization

Users can customize category and subcategory emojis globally in Settings:

- **Category emoji override**: Changes the default emoji for all future entries in that category
- **Subcategory emoji override**: Changes the default emoji for all future entries with that subcategory
- Stored in `userPreferences.customEmojis` with keys like:
  - `"mindfulness"` for category
  - `"mindfulness:sitting"` for subcategory

### Emoji Resolution (for new entries)

When creating a new entry, resolve the emoji to assign:

```typescript
function resolveEmojiForNewEntry(
  category: string,
  subcategory: string,
  userCustomEmojis: Record<string, string>,
): string {
  // 1. Check user's custom subcategory emoji
  const customSubcatKey = `${category}:${subcategory}`;
  if (userCustomEmojis[customSubcatKey]) {
    return userCustomEmojis[customSubcatKey];
  }

  // 2. Check user's custom category emoji
  if (userCustomEmojis[category]) {
    return userCustomEmojis[category];
  }

  // 3. Default subcategory emoji
  const subcatEmoji = SUBCATEGORY_DEFAULTS[subcategory]?.emoji;
  if (subcatEmoji) return subcatEmoji;

  // 4. Default category emoji
  const catEmoji = CATEGORY_DEFAULTS[category]?.emoji;
  if (catEmoji) return catEmoji;

  // 5. Fallback
  return "📌";
}
```

### Emoji Resolution (for display, legacy support)

When displaying an entry that may not have an emoji stored:

```typescript
function getEntryEmoji(entry: Entry): string {
  // Entry's own emoji (the canonical source)
  if (entry.emoji) return entry.emoji;

  // Legacy fallback for entries without stored emoji
  const subcatEmoji = SUBCATEGORY_DEFAULTS[entry.subcategory]?.emoji;
  if (subcatEmoji) return subcatEmoji;

  const catEmoji = CATEGORY_DEFAULTS[entry.category]?.emoji;
  if (catEmoji) return catEmoji;

  return "📌";
}
```

### Category Emoji Defaults

| Category      | Emoji | Rationale                      |
| ------------- | ----- | ------------------------------ |
| `mindfulness` | 🧘    | Universal meditation symbol    |
| `movement`    | 🏃    | Active motion                  |
| `creative`    | 🎨    | Art palette = making things    |
| `learning`    | 📚    | Books = knowledge              |
| `health`      | 💚    | Green heart = wellness         |
| `work`        | 💼    | Briefcase = professional       |
| `social`      | 👥    | People = connection            |
| `life_admin`  | 🏠    | Home = domestic life           |
| `moments`     | 💭    | Thought bubble = inner life    |
| `events`      | 🎭    | Theatre masks = experiences    |

### Emoji Design Principles

1. **Distinctive at small sizes** — Must be recognizable in calendar cells and compact lists
2. **Semantically clear** — Should evoke the activity without explanation
3. **Cross-platform consistent** — Prefer emojis that render well on iOS, Android, and web
4. **Colorful variety** — Different categories should have visually distinct emoji colors

---

## Color Palette

Each category has an assigned color for consistent UI treatment across timeline badges, chart segments, and rhythm calendars.

### Category Colors

| Category      | Color  | Hex       | Tailwind Class |
| ------------- | ------ | --------- | -------------- |
| `mindfulness` | Purple | `#7C3AED` | `violet-600`   |
| `movement`    | Green  | `#059669` | `emerald-600`  |
| `creative`    | Amber  | `#D97706` | `amber-600`    |
| `learning`    | Blue   | `#2563EB` | `blue-600`     |
| `health`      | Teal   | `#14B8A6` | `teal-500`     |
| `work`        | Slate  | `#64748B` | `slate-500`    |
| `social`      | Rose   | `#F43F5E` | `rose-500`     |
| `life_admin`  | Stone  | `#78716C` | `stone-500`    |
| `moments`     | Indigo | `#6366F1` | `indigo-500`   |
| `events`      | Pink   | `#EC4899` | `pink-500`     |

### Color Usage

- **Timeline badges**: Background color with white/dark text
- **Chart segments**: Fill color for pie/bar charts
- **Rhythm calendars**: Cell background or dot color
- **Category pills**: Border or background accent

### Accessibility

All category colors meet WCAG AA contrast requirements when paired with white text. For light backgrounds, use the color as text or border instead of background.

### Custom Category Color

Unknown categories default to gray (`#6B7280` / `gray-500`). Users can assign custom colors in settings (v0.2.0).

---

## Schema Representation

### Entries Table

```typescript
export const entries = sqliteTable("entries", {
  // ... existing fields ...

  // Classification
  type: text("type").notNull(), // "timed", "tada", "moment", "tally"
  category: text("category"), // "mindfulness", "work", "health", "social", etc.
  subcategory: text("subcategory"), // "sitting", "project", "sleep", "family"
  emoji: text("emoji"), // Per-entry override (nullable)

  // ... other fields ...
});
```

### Category Settings Table

System-level customization of category/subcategory display (v0.2.0 editing, but schema in v0.1.0):

```typescript
export const categorySettings = sqliteTable("category_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),

  // What this setting applies to
  category: text("category").notNull(),
  subcategory: text("subcategory"), // null = category-level setting

  // Customization
  emoji: text("emoji"), // Override default emoji
  color: text("color"), // Override default color (hex)

  // Timestamps
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

### Timer Presets Table Update

Rename `category` → `subcategory` for consistency:

```typescript
export const timerPresets = sqliteTable("timer_presets", {
  // ...
  subcategory: text("subcategory"), // was: category
  // ...
});
```

### Rhythm Matching Update

Rhythms can now match on top-level fields:

```typescript
// Before: match on data.category (JSON)
// After: match on category or subcategory directly

export const rhythms = sqliteTable("rhythms", {
  // ...
  matchCategory: text("match_category"), // e.g., "mindfulness"
  matchSubcategory: text("match_subcategory"), // e.g., "sitting"
  // ...
});
```

---

## Display Logic

### Resolving Display Properties

```typescript
import {
  CATEGORY_DEFAULTS,
  SUBCATEGORY_DEFAULTS,
} from "~/utils/categoryDefaults";

interface DisplayProps {
  emoji: string;
  color: string;
  label: string;
}

function getEntryDisplayProps(
  entry: Entry,
  userSettings?: CategorySettings[],
): DisplayProps {
  // Check user overrides first (v0.20)
  const userSubcatSetting = userSettings?.find(
    (s) => s.category === entry.category && s.subcategory === entry.subcategory,
  );
  const userCatSetting = userSettings?.find(
    (s) => s.category === entry.category && !s.subcategory,
  );

  // Resolve emoji: entry → user subcategory → user category → default subcategory → default category → fallback
  const emoji =
    entry.emoji ||
    userSubcatSetting?.emoji ||
    userCatSetting?.emoji ||
    SUBCATEGORY_DEFAULTS[entry.subcategory]?.emoji ||
    CATEGORY_DEFAULTS[entry.category]?.emoji ||
    "📌";

  // Resolve color: user category → default category → fallback
  const color =
    userCatSetting?.color ||
    CATEGORY_DEFAULTS[entry.category]?.color ||
    "#6B7280";

  // Label from subcategory or category
  const label =
    SUBCATEGORY_DEFAULTS[entry.subcategory]?.label ||
    CATEGORY_DEFAULTS[entry.category]?.label ||
    entry.subcategory ||
    entry.category ||
    "Entry";

  return { emoji, color, label };
}
```

### Timeline Display

```
┌─────────────────────────────────────────┐
│ 🧘 Morning Sit                   6m  │ ← timed, mindfulness
│    mindfulness • sitting              │
├─────────────────────────────────────────┤
│ 🏆 Got promoted!                        │ ← tada, work
│    work • win                           │
├─────────────────────────────────────────┤
│ 🏃 Ran a marathon!                      │ ← tada, movement
│    movement • running                   │
├─────────────────────────────────────────┤
│ 🌙 Flying dream                         │ ← moment, moments
│    moments • dream                      │
└─────────────────────────────────────────┘
```

### Timer Display

```
       🧘                    ← Large emoji (from subcategory)
     06:00                   ← Timer countdown
  ────────────────           ← Progress bar in category color

  [Sitting ▾]                ← Subcategory picker with emoji
```

---

## Future Considerations

### v0.2.0: Category Editing

- **Settings page** for customizing category/subcategory emojis and colors
- **Subcategory auto-complete** that remembers user-added subcategories (e.g., "metta" for meditation)
- **Per-entry emoji picker** for overriding default on individual entries

### v0.2.0+: Multi-Category Support

Some entries naturally belong to multiple categories:

- Performing at a concert → `creative` + `events`
- Yoga class → `mindfulness` + `movement`
- Coding tutorial → `creative` + `learning`

Options:

- **Primary + secondary category** fields
- **Tags as implicit categories** (less structured)
- **Multiple category array** (more complex queries)

Defer decision until real usage patterns emerge.

### v0.3.0+: Custom Entry Types

Modular entry type system allowing users to define:

- Custom data schemas
- Input UI components
- Visualization widgets

This enables domain-specific entry types without core schema changes.

### Standards Alignment

The ontology is informed by but not strictly compliant with:

- **Apple HealthKit** workout activity types
- **Strava** sport types
- **Open mHealth** activity schemas

If export to these standards is needed, mapping functions can translate categories to standard activity type codes.

---

_This document defines the ontology for Tada v0.4.0. It will evolve as the app grows into a broader lifelogging platform._
