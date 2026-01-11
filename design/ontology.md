# Tada Entry Ontology

_Defining the category hierarchy, type system, and emoji conventions for lifelogging entries._

**Status:** v0.1.0 Initial Design  
**Last Updated:** 2026-01-11

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

| Dimension       | Purpose                   | Examples                        | Editable        |
| --------------- | ------------------------- | ------------------------------- | --------------- |
| **Type**        | Data structure + behavior | `timed`, `tada`, `journal`      | System-defined  |
| **Category**    | Life domain               | `mindfulness`, `accomplishment` | User-extensible |
| **Subcategory** | Specific activity         | `sitting`, `work`, `piano`      | User-extensible |

### Design Principles

1. **Open strings, sensible defaults** — Categories and subcategories are open text fields with curated defaults, not rigid enums
2. **Type determines behavior** — Entry type defines what data is captured and how the UI behaves
3. **Category enables grouping** — Categories provide cross-type organization for filtering and visualization
4. **Emoji as visual language** — Every category and subcategory has a default emoji for instant recognition
5. **Inspired by standards** — Informed by Apple HealthKit activity types, Strava sport types, and Daylio's category model

### Why Three Levels?

- **Type alone** conflates structure with domain (is "meditation" a timer behavior or a mindfulness practice?)
- **Category alone** loses behavioral distinction (tada accomplishments need different UI than journal entries)
- **Three levels** provide: consistent behavior (type) + domain grouping (category) + specificity (subcategory)

---

## Type System

Types define **how an entry is recorded** and **what behavior it exhibits**. Each type has a specific data schema and UI treatment.

### Core Types (v0.10)

| Type      | Behavior                | Data Schema   | Primary Use                             |
| --------- | ----------------------- | ------------- | --------------------------------------- |
| `timed`   | Duration-based activity | `TimedData`   | Meditation, exercise, practice sessions |
| `tada`    | Accomplishment capture  | `TadaData`    | Celebrating wins, productivity logging  |
| `journal` | Reflective text entry   | `JournalData` | Dreams, gratitude, notes, reflections   |

### Planned Types (v0.20+)

| Type          | Behavior                  | Data Schema       | Primary Use                            |
| ------------- | ------------------------- | ----------------- | -------------------------------------- |
| `reps`        | Count-based activity      | `RepsData`        | Push-ups, squats, repetitive exercises |
| `measurement` | Point-in-time value       | `MeasurementData` | Weight, blood pressure, sleep hours    |
| `experience`  | Event attended            | `ExperienceData`  | Concerts, movies, exhibitions          |
| `consumption` | Media consumed            | `ConsumptionData` | Books, podcasts, articles              |
| `gps_tracked` | Location-tracked activity | `GpsData`         | Runs, walks, bike rides with route     |

### Type Data Schemas

```typescript
// Timed activities (meditation, exercise, practice)
interface TimedData {
  duration: number; // seconds
  startedAt: string; // ISO timestamp
  endedAt: string; // ISO timestamp
  targetDuration?: number; // planned duration in seconds
}

// Accomplishments (the app's namesake!)
interface TadaData {
  content: string;
  significance?: "minor" | "normal" | "major";
  voiceTranscription?: string; // original if voice-captured
}

// Journal entries (dreams, gratitude, notes)
interface JournalData {
  content: string;
  mood?: number; // 1-5 scale
  themes?: string[]; // e.g., ["lucid", "flying"] for dreams
}
```

### Why Tada is a Type, Not a Category

**Tada is the philosophical foundation of this app** — the inversion of the anxiety-inducing todo list into a celebration of accomplishment. It deserves first-class type status because:

1. **Unique behavior**: Quick capture, voice input, significance levels, calendar visualization
2. **Different data schema**: `TadaData` has fields (significance, voiceTranscription) that don't belong in journal
3. **Namesake status**: The app is literally named after this concept
4. **Philosophical distinction**: Tadas are _extrospective_ (what I did to the world) vs journals are _introspective_ (what happened in me)

---

## Category Hierarchy

Categories represent **life domains** — broad areas of human activity that entries belong to. They enable cross-type grouping and provide visual consistency through shared colors and emojis.

### Core Categories (v0.10)

| Category         | Emoji | Color              | Description                                    |
| ---------------- | ----- | ------------------ | ---------------------------------------------- |
| `mindfulness`    | 🧘    | `#7C3AED` (purple) | Meditation, breathing, contemplative practices |
| `movement`       | 🏃    | `#059669` (green)  | Physical exercise, sports, body practices      |
| `creative`       | 🎵    | `#D97706` (amber)  | Music, art, writing, making things             |
| `learning`       | 📚    | `#2563EB` (blue)   | Study, courses, skill acquisition              |
| `journal`        | 📝    | `#6366F1` (indigo) | Dreams, reflections, personal notes            |
| `accomplishment` | ⚡    | `#F59E0B` (yellow) | Tadas, wins, completed tasks                   |
| `events`         | 🎭    | `#EC4899` (pink)   | Concerts, movies, attended experiences         |

### Category-Type Relationships

Categories can span multiple types. The relationship is suggestive, not restrictive:

| Category         | Primary Types                  | Example Entries                   |
| ---------------- | ------------------------------ | --------------------------------- |
| `mindfulness`    | `timed`                        | 10-minute sitting meditation      |
| `movement`       | `timed`, `reps`, `gps_tracked` | Yoga session, 50 push-ups, 5k run |
| `creative`       | `timed`                        | 30-minute piano practice          |
| `learning`       | `timed`                        | Language lesson, reading session  |
| `journal`        | `journal`                      | Dream record, gratitude entry     |
| `accomplishment` | `tada`                         | "Fixed the leaky tap" ⚡          |
| `events`         | `experience`                   | Concert at Royal Albert Hall      |

### User Extension

Users can use any string as a category. The defaults above provide sensible starting points, but entries with `category: "magick"` or `category: "parenting"` work immediately. Custom categories inherit a neutral default (📌 gray) until user assigns emoji/color in settings (v0.20).

---

## Subcategory Definitions

Subcategories provide **specific activity identification** within a category. They enable precise filtering, habit matching, and meaningful defaults.

### Mindfulness Subcategories

| Subcategory       | Emoji | Description                 |
| ----------------- | ----- | --------------------------- |
| `sitting`         | 🧘    | Seated meditation (default) |
| `breathing`       | 🫁    | Breath-focused exercises    |
| `walking`         | 🚶    | Walking meditation          |
| `body_scan`       | 🫀    | Body awareness practice     |
| `loving_kindness` | 💗    | Metta/compassion meditation |
| `prayer`          | 🙏    | Contemplative prayer        |
| `visualization`   | 🌈    | Guided imagery, manifesting |

### Movement Subcategories

| Subcategory | Emoji | Description                 |
| ----------- | ----- | --------------------------- |
| `yoga`      | 🧘‍♀️    | Yoga practice               |
| `tai_chi`   | 🥋    | Tai chi, qigong             |
| `running`   | 🏃    | Running, jogging            |
| `walking`   | 🚶    | Fitness walking             |
| `cycling`   | 🚴    | Biking                      |
| `strength`  | 💪    | Weight training, resistance |
| `gym`       | 🏋️    | General gym workout         |
| `swimming`  | 🏊    | Swimming                    |
| `dance`     | 💃    | Dance practice              |

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

### Journal Subcategories

| Subcategory   | Emoji | Description            |
| ------------- | ----- | ---------------------- |
| `dream`       | 🌙    | Dream journal          |
| `gratitude`   | 🙏    | Gratitude entries      |
| `reflection`  | 💭    | Personal reflection    |
| `note`        | 📝    | Quick notes            |
| `serendipity` | ✨    | Unexpected discoveries |
| `memory`      | 📸    | Memory capture         |

### Accomplishment Subcategories

| Subcategory | Emoji | Description                 |
| ----------- | ----- | --------------------------- |
| `home`      | 🏠    | Household accomplishments   |
| `work`      | 💼    | Professional wins           |
| `personal`  | 🎯    | Personal goals achieved     |
| `hobby`     | 🎨    | Hobby milestones            |
| `social`    | 👫    | Relationship investments    |
| `health`    | 💚    | Health-related achievements |

### Events Subcategories

| Subcategory  | Emoji | Description              |
| ------------ | ----- | ------------------------ |
| `concert`    | 🎵    | Live music               |
| `movie`      | 🎬    | Film viewing             |
| `theatre`    | 🎭    | Stage performance        |
| `exhibition` | 🖼️    | Art/museum exhibition    |
| `talk`       | 🎤    | Lecture, conference talk |
| `sports`     | 🏟️    | Sporting event           |

### Subcategory Overlap

Some subcategories appear in multiple categories (e.g., `walking` in mindfulness and movement). This is intentional — the category provides context:

- `category: "mindfulness", subcategory: "walking"` → walking meditation 🚶
- `category: "movement", subcategory: "walking"` → fitness walking 🚶

Same activity, different intention and framing.

---

## Emoji Conventions

Emojis provide **instant visual recognition** throughout the app. They appear in timelines, timers, calendars, and habit views.

### Emoji Hierarchy

Emojis are resolved in priority order:

1. **Entry-level override** (`entry.emoji`) — User picked a specific emoji for this entry
2. **Subcategory default** — Defined emoji for the subcategory
3. **Category default** — Defined emoji for the category
4. **Fallback** — 📌 (pushpin) for unrecognized categories

### Resolution Example

```typescript
function getEntryEmoji(entry: Entry): string {
  if (entry.emoji) return entry.emoji;

  const subcatEmoji = SUBCATEGORY_DEFAULTS[entry.subcategory]?.emoji;
  if (subcatEmoji) return subcatEmoji;

  const catEmoji = CATEGORY_DEFAULTS[entry.category]?.emoji;
  if (catEmoji) return catEmoji;

  return "📌";
}
```

### Category Emoji Defaults

| Category         | Emoji | Rationale                      |
| ---------------- | ----- | ------------------------------ |
| `mindfulness`    | 🧘    | Universal meditation symbol    |
| `movement`       | 🏃    | Active motion                  |
| `creative`       | 🎵    | Music as archetypal creativity |
| `learning`       | 📚    | Books = knowledge              |
| `journal`        | 📝    | Writing/notes                  |
| `accomplishment` | ⚡    | Energy, spark, "tada!"         |
| `events`         | 🎭    | Theatre masks = performance    |

### Emoji Design Principles

1. **Distinctive at small sizes** — Must be recognizable in calendar cells and compact lists
2. **Semantically clear** — Should evoke the activity without explanation
3. **Cross-platform consistent** — Prefer emojis that render well on iOS, Android, and web
4. **Colorful variety** — Different categories should have visually distinct emoji colors

---

## Color Palette

Each category has an assigned color for consistent UI treatment across timeline badges, chart segments, and habit calendars.

### Category Colors

| Category         | Color  | Hex       | Tailwind Class |
| ---------------- | ------ | --------- | -------------- |
| `mindfulness`    | Purple | `#7C3AED` | `violet-600`   |
| `movement`       | Green  | `#059669` | `emerald-600`  |
| `creative`       | Amber  | `#D97706` | `amber-600`    |
| `learning`       | Blue   | `#2563EB` | `blue-600`     |
| `journal`        | Indigo | `#6366F1` | `indigo-500`   |
| `accomplishment` | Yellow | `#F59E0B` | `amber-500`    |
| `events`         | Pink   | `#EC4899` | `pink-500`     |

### Color Usage

- **Timeline badges**: Background color with white/dark text
- **Chart segments**: Fill color for pie/bar charts
- **Habit calendars**: Cell background or dot color
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
  type: text("type").notNull(), // "timed", "tada", "journal"
  category: text("category"), // "mindfulness", "accomplishment"
  subcategory: text("subcategory"), // "sitting", "work"
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

### Habit Matching Update

Habits can now match on top-level fields:

```typescript
// Before: match on data.category (JSON)
// After: match on category or subcategory directly

export const habits = sqliteTable("habits", {
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
  userSettings?: CategorySettings[]
): DisplayProps {
  // Check user overrides first (v0.20)
  const userSubcatSetting = userSettings?.find(
    (s) => s.category === entry.category && s.subcategory === entry.subcategory
  );
  const userCatSetting = userSettings?.find(
    (s) => s.category === entry.category && !s.subcategory
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
│ 🧘 Morning Sit                   6m  │ ← emoji from subcategory "sitting"
│    mindfulness • sitting              │ ← category • subcategory
├─────────────────────────────────────────┤
│ ⚡ Fixed the leaky tap                  │ ← emoji from category "accomplishment"
│    accomplishment • home                │
├─────────────────────────────────────────┤
│ 🌙 Flying dream                         │ ← emoji from subcategory "dream"
│    journal • dream                      │
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

_This document defines the ontology for Tada v0.1.0. It will evolve as the app grows into a broader lifelogging platform._
