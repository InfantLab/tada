# Tada - Software Design Requirements (SDR)

**Version:** 0.1.0-draft  
**Date:** January 9, 2026  
**Status:** Draft for Review

---

## Table of Contents

1. [Overview](#1-overview)
2. [Licensing & Business Model](#2-licensing--business-model)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Plugin Architecture](#5-plugin-architecture)
6. [Data Standards Compliance](#6-data-standards-compliance)
7. [Security & Privacy](#7-security--privacy)
8. [Implementation Phases](#8-implementation-phases)
9. [Open Questions](#9-open-questions)
10. [References](#10-references)

---

## 1. Overview

### 1.1 Project Vision

Tada is a personal **lifelogger**—a tool for noticing and collecting the moments that make up a life. It unifies activity tracking, habit building, journaling, and accomplishment capture into a single, open platform.

Unlike commercial apps that monetize attention and data, Tada prioritizes **data ownership**, **open standards**, and **self-hosting**. It's not about productivity or optimization—it's about **remembering what you've done** and **seeing who you're becoming**.

See [philosophy.md](philosophy.md) for the full vision.

### 1.2 Name Origin

"Tada" is an inversion of the todo list—celebrating what you've accomplished rather than dreading what remains. It's the satisfying moment of completion. The exclamation of "I did it!"

### 1.3 Core Principles

1. **Data Ownership**: Your data belongs to you. Export everything, import from anywhere.
2. **Open Standards**: Follow quantified-self standards (Open mHealth, GPX) for interoperability.
3. **Unified Entry Model**: One flexible schema for all entry types—activities, experiences, thoughts.
4. **Habits as Aggregations**: Habits are views over entries, not separate data.
5. **Plugin Architecture**: Core is minimal; richness comes from plugins.
6. **Mobile-First PWA**: No app store dependency; works offline on any device.
7. **Simplicity First**: Start simple, extend later. Avoid premature complexity.

---

## 2. Licensing & Business Model

### 2.1 Open Source License

- **License:** AGPL-3.0 (ensures self-hosted modifications remain open)
- **Repository:** Public on GitHub
- **Self-Hosting:** Free forever with full functionality

### 2.2 Hosted Service (Tada Cloud)

Optional managed hosting with subscription tiers:

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/month | 1 user, 1 year history, community support |
| **Personal** | $5/month | 1 user, unlimited history, priority sync, backups |
| **Family** | $12/month | Up to 5 users, shared dashboards |

### 2.3 Monetization Boundaries

- Core features remain open source
- Hosted service adds convenience (managed backups, sync, notifications infrastructure)
- No feature paywalls for self-hosters
- Potential premium plugins (must also be open source, but hosted service includes them)

---

## 3. Functional Requirements

### 3.1 Unified Entry Model

Everything in Tada is an **Entry**—a moment worth recording. The schema is deliberately minimal and extensible.

#### Design Philosophy

- **Types are open**: The `type` field is a string, not an enum. Plugins can define new types.
- **Data is schemaless**: The `data` JSONB column holds type-specific fields. No rigid structure.
- **Core stays simple**: The Entry table has ~15 columns. Everything else lives in `data` or related tables.
- **We don't know yet**: The schema should accommodate uses we haven't imagined.

#### Built-in Entry Types

These are examples, not a closed set:

| Type | Description | Example |
|------|-------------|----------|
| `timed` | Duration-based activities | Meditation, music practice, tai chi |
| `reps` | Count-based activities | 20 press-ups, 3 sets of squats |
| `gps_tracked` | Activities with GPS route | Running, cycling, walking |
| `measurement` | Point-in-time values | Weight, heart rate, blood pressure |
| `journal` | Text entries | Dream journal, gratitude, reflection |
| `tada` | Accomplishments | "Fixed the leaky tap", "Called mum" |
| `experience` | Events attended | Film, concert, play, exhibition |
| `consumption` | Media consumed | Book, album, podcast, article |

#### Core Entry Schema

```typescript
interface Entry {
  id: string;                    // UUID
  type: string;                  // Open-ended: "timed", "journal", "experience", etc.
  name: string;                  // Human label: "meditation", "The Matrix", "press-ups"
  
  // Time handling (use whichever fits)
  timestamp?: string;            // ISO 8601 - instant events
  startedAt?: string;            // ISO 8601 - duration start
  endedAt?: string;              // ISO 8601 - duration end
  durationSeconds?: number;      // Computed or manual
  date?: string;                 // YYYY-MM-DD - date-only events
  
  // Type-specific payload (JSONB) - schema varies by type
  data: Record<string, unknown>;
  
  // Metadata
  tags: string[];                // Freeform tags
  notes?: string;                // Markdown supported
  
  // Import tracking
  source: string;                // "manual", "import", "strava", etc.
  externalId?: string;           // ID from source for deduplication
  
  // Sync support
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;            // Soft delete for sync
}
```

#### Connections (Future-Proofing)

Entries can link to other entries and entities:

```typescript
// Many-to-many links between entries (for "threads")
interface EntryLink {
  id: string;
  fromEntryId: string;
  toEntryId: string;
  linkType: string;              // "thread", "related", "follow-up"
  threadName?: string;           // e.g., "Learning Spanish"
}

// Links to reusable entities (people, places, media)
interface EntryEntity {
  entryId: string;
  entityId: string;
  role?: string;                 // "with", "at", "about"
}

// Reusable entities (optional, plugin-managed)
interface Entity {
  id: string;
  type: string;                  // "person", "place", "book", "film"
  name: string;
  data: Record<string, unknown>; // Type-specific: ISBN, TMDB ID, etc.
}
```

**Note:** Entities and links are optional extensions. The core MVP only needs the Entry table. Plugins can add entity support (Books plugin, People plugin, etc.).

#### Attachments

```typescript
interface Attachment {
  id: string;
  entryId: string;
  type: string;                  // "photo", "audio", "gpx", "file"
  filename: string;
  mimeType: string;
  storagePath: string;           // Filesystem path or blob reference
  metadata?: Record<string, unknown>;  // Dimensions, duration, etc.
}
```

Storage strategy:
- **Self-hosted**: Filesystem (`./data/attachments/{id}/{filename}`)
- **Cloud**: S3-compatible blob storage
- **Sync**: Attachments sync separately from entries (bandwidth consideration)

#### Type-Specific Payloads

```typescript
// Timed activities (meditation, music practice)
interface TimedData {
  category?: string;             // "sitting", "breathing", "tai_chi"
  bellConfig?: {
    startBell?: string;          // Audio file reference
    endBell?: string;
    intervalBells?: { minutes: number; sound: string }[];
  };
  qualityRating?: number;        // 1-5
}

// Rep-based activities
interface RepsData {
  count: number;
  sets?: number;
  exercise: string;              // "press-up", "squat", "pull-up"
  weightKg?: number;
  resistanceBand?: string;
}

// GPS-tracked activities
interface GpsData {
  distanceMeters: number;
  elevationGainMeters?: number;
  averagePaceSecPerKm?: number;
  averageHeartRateBpm?: number;
  maxHeartRateBpm?: number;
  calories?: number;
  summaryPolyline?: string;      // Encoded for map preview
}

// Measurements
interface MeasurementData {
  metric: string;                // "body_weight", "heart_rate", "blood_pressure"
  value: number;
  unit: string;                  // UCUM code preferred
  components?: Record<string, number>;  // e.g., {systolic: 120, diastolic: 80}
}

// Journal entries
interface JournalData {
  content: string;               // Markdown supported
  journalType: string;           // "dream", "gratitude", "reflection"
  mood?: number;                 // 1-5
  customTags?: Record<string, boolean>;  // {lucid: true, flying: true}
}

// Tada (accomplishments)
interface TadaData {
  content: string;
  category?: string;             // "home", "work", "personal"
  voiceTranscription?: string;   // Original voice input
  significance?: 'minor' | 'normal' | 'major';
}
```

### 3.2 Habit Tracking (Seinfeld Method)

Habits are **definitions** that aggregate underlying activities:

```typescript
interface Habit {
  id: string;
  name: string;                          // "Daily Meditation"
  description?: string;
  
  // What counts toward this habit
  activityMatchers: ActivityMatcher[];   // Match by name, tags, or type
  
  // Goal definition
  goalType: 'boolean' | 'duration' | 'count' | 'measurement';
  goalValue: number;                     // e.g., 6 (minutes), 1 (completion), 20 (reps)
  goalUnit?: string;                     // "minutes", "reps", "kg"
  
  // Frequency
  frequency: 'daily' | 'weekly' | 'monthly';
  frequencyTarget?: number;              // For weekly: 3 = 3 days per week
  
  // Streak tracking
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
  
  createdAt: string;
}

interface ActivityMatcher {
  field: 'name' | 'type' | 'tag' | 'category';
  operator: 'equals' | 'contains' | 'in';
  value: string | string[];
}
```

#### Streak Calculation Rules

- **Daily habits**: Chain continues if goal met every consecutive day
- **Weekly habits (X of Y)**: Chain continues if target days met each week (Mon-Sun)
- **Weekly habits (duration/count)**: Chain continues if weekly total meets threshold
- **Grace period**: Configurable (default: none). Optional 1-day grace for daily habits.

### 3.3 Meditation Timer

A specialized activity capture UI for timed mindfulness:

#### Features
- Configurable countdown OR open-ended timer
- Category selection (sitting, breathing, walking, tai chi, music, lesson, other)
- Bell configuration:
  - Start bell (optional)
  - End bell (optional)
  - Interval bells (e.g., every 5 minutes)
  - Silent mode
- Background audio (optional): ambient sounds, music
- Works offline (PWA with cached audio)
- Creates `timed` activity on completion

#### Timer Presets

Users can save timer configurations as presets:

```typescript
interface TimerPreset {
  id: string;
  name: string;                  // "Morning Sit"
  durationSeconds?: number;      // null = open-ended
  category: string;
  bellConfig: BellConfig;
  backgroundAudio?: string;
}
```

### 3.4 Dream Journal

Integration with existing Obsidian workflow:

#### Features
- Text entry with Markdown support
- Voice-to-text capture (Web Speech API)
- Tag system: `lucid`, `flying`, `nightmare`, `recurring`, custom tags
- Mood/vividness rating
- Export as Obsidian-compatible Markdown with YAML frontmatter

#### Obsidian Export Format

```markdown
---
date: 2026-01-09
type: dream
lucid: true
flying: true
mood: 4
tags: [dream, lucid, flying]
---

# Dream: Flying Over Mountains

I was soaring over snow-capped peaks...
```

### 3.5 Tada List (Inverted Todo)

Capture accomplishments after completion:

#### Features
- Quick text entry
- Voice capture with LLM transcription/enhancement
- Category tagging
- Significance level (minor/normal/major)
- Calendar view of accomplishments over time
- Weekly/monthly summaries

#### LLM Integration
- Voice → Whisper transcription → LLM cleanup
- Optional: LLM categorization suggestions
- Optional: Weekly reflection generation

### 3.6 Data Import

Priority import sources based on user's existing data:

| Source | Format | Priority |
|--------|--------|----------|
| Insight Timer | CSV export | High |
| Meditation Helper | SQLite database | High |
| Strava | GPX/FIT files, API | Medium |
| Apple Health | XML export | Medium |
| Garmin | FIT files | Medium |
| Obsidian (dreams) | Markdown + frontmatter | High |

#### Import Pipeline

```typescript
interface DataImporter {
  id: string;
  name: string;
  supportedFormats: string[];
  
  parseFile(file: File): Promise<Activity[]>;
  deduplicateKey(activity: Activity): string;  // For upsert logic
}
```

### 3.7 Data Export

Full data portability:

- **JSON**: Complete database export in Open mHealth-compatible format
- **CSV**: Tabular export for spreadsheet analysis
- **GPX**: GPS activities with full track data
- **Markdown**: Journal entries for Obsidian
- **SQLite**: Raw database file for self-hosters

---

## 4. Non-Functional Requirements

### 4.1 Platform & Deployment

| Requirement | Specification |
|-------------|---------------|
| **Primary Platform** | Progressive Web App (PWA) |
| **Mobile Support** | iOS Safari, Android Chrome (PWA install) |
| **Desktop Support** | Any modern browser |
| **Offline** | Full functionality offline, sync when connected |
| **Self-Hosting** | Single Docker container, CapRover compatible |
| **Database** | SQLite (self-hosted), PostgreSQL (cloud) |

### 4.2 Technology Stack

```
Frontend:     Nuxt 3 + Vue 3 + TypeScript
UI:           Nuxt UI (or Shadcn-Vue)
PWA:          @vite-pwa/nuxt + Workbox
Database:     Drizzle ORM → SQLite (local) / PostgreSQL (cloud)
Local Data:   IndexedDB via Dexie.js (offline-first)
Audio:        Web Audio API + Howler.js
Voice:        Web Speech API (recognition) + optional Whisper
LLM:          Ollama (local) or OpenAI/Anthropic API (configurable)
Auth:         Lucia Auth (self-hosted), multi-tenant for cloud
Container:    Docker → CapRover deployment
```

### 4.3 Offline-First Architecture

```
┌─────────────────────────────────────────────┐
│                   PWA                        │
│  ┌─────────────┐    ┌─────────────────────┐ │
│  │   Vue UI    │◄──►│  IndexedDB (Dexie)  │ │
│  └─────────────┘    └─────────────────────┘ │
│         │                    │              │
│         ▼                    ▼              │
│  ┌─────────────┐    ┌─────────────────────┐ │
│  │Service Worker│    │   Background Sync   │ │
│  └─────────────┘    └─────────────────────┘ │
└─────────────────────────────────────────────┘
                       │
                       ▼ (when online)
         ┌─────────────────────────────────┐
         │      Server (Nuxt API)          │
         │   ┌───────────────────────┐     │
         │   │  SQLite / PostgreSQL  │     │
         │   └───────────────────────┘     │
         └─────────────────────────────────┘
```

### 4.4 Notifications

| Method | Use Case | Requirement |
|--------|----------|-------------|
| **Web Push** | Habit reminders, streak warnings | HTTPS, VAPID keys, user opt-in |
| **PWA Badge** | Unread notifications count | Supported browsers |
| **Email** | Weekly summaries (cloud only) | SMTP integration |

### 4.5 Performance Targets

- First paint: < 1.5s on 3G
- Time to interactive: < 3s on 3G
- Offline startup: < 500ms
- Timer accuracy: ±100ms
- Sync latency: < 2s when online

---

## 5. Plugin Architecture

### 5.1 Plugin Interface

```typescript
interface TadaPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  
  // Lifecycle
  onLoad(app: TadaApp): Promise<void>;
  onUnload(): Promise<void>;
  
  // Extension points (all optional)
  registerEntryTypes?(): EntryTypeDefinition[];   // New types with schemas
  registerEntityTypes?(): EntityTypeDefinition[]; // People, places, media
  registerTimerPresets?(): TimerPreset[];
  registerImporters?(): DataImporter[];
  registerExporters?(): DataExporter[];
  registerInsights?(): InsightGenerator[];        // Pattern recognition
  registerViews?(): ViewDefinition[];             // Custom UI pages
  registerCommands?(): Command[];                 // Keyboard shortcuts, actions
  
  // Settings
  getSettings?(): PluginSettings;
}

// Entry type definition (for UI and validation)
interface EntryTypeDefinition {
  type: string;                    // e.g., "book", "film", "concert"
  label: string;                   // Human-readable name
  icon?: string;                   // Emoji or icon reference
  dataSchema?: object;             // JSON Schema for the data field (optional)
  quickEntryFields?: string[];     // Fields to show in quick-add UI
}
```

### 5.2 Example Plugins

#### Import/Sync
| Plugin | Function |
|--------|----------|
| **Insight Timer Import** | Parse Insight Timer CSV exports |
| **Meditation Helper Import** | Parse SQLite database |
| **Strava Sync** | OAuth + API sync for runs/rides |
| **Apple Health Sync** | Import from Apple Health XML exports |
| **Goodreads Import** | Import book history |
| **Letterboxd Import** | Import film diary |

#### Entities & Media
| Plugin | Function |
|--------|----------|
| **Books** | ISBN lookup, cover images, reading progress |
| **Films** | TMDB integration, cinema tracking |
| **Music** | Albums, concerts, practice sessions |
| **People** | "Last seen" tracking, relationship context |
| **Places** | Location tagging, venue memory |

#### Insights & Export
| Plugin | Function |
|--------|----------|
| **Weekly Digest** | LLM-powered weekly reflections |
| **Year in Review** | Annual statistics and highlights |
| **Obsidian Export** | Auto-export to Obsidian vault |
| **On This Day** | Random memory surfacing |
| **Correlation Finder** | Discover patterns across entry types |

### 5.3 Plugin Discovery

- Local plugins: `/plugins` directory in self-hosted install
- Cloud plugins: Curated registry (for hosted service)
- Community plugins: GitHub-based with manifest validation

---

## 6. Data Standards Compliance

### 6.1 Open mHealth Alignment

Activity data payloads follow [Open mHealth schemas](https://www.openmhealth.org/):

- `omh:physical-activity` for timed/GPS activities
- `omh:step-count` pattern for rep-based
- `omh:body-weight`, `omh:heart-rate` for measurements
- `omh:geoposition` for GPS points

### 6.2 Interoperability

| Standard | Usage |
|----------|-------|
| **GPX 1.1** | GPS track import/export |
| **ISO 8601** | All timestamps |
| **UCUM** | Unit codes where applicable |
| **Markdown** | Journal content, notes |
| **YAML** | Obsidian frontmatter |

---

## 7. Security & Privacy

### 7.1 Self-Hosted

- All data stored locally on user's server
- No telemetry or analytics
- User controls backup strategy
- Optional: End-to-end encryption for sync

### 7.2 Cloud Service

- Data encrypted at rest (AES-256)
- HTTPS only
- GDPR-compliant data export/deletion
- No data monetization, ever
- SOC 2 Type II (future goal)

---

## 8. Implementation Phases

**Guiding principle**: Each phase should produce something usable. Don't build infrastructure for features we might not need.

### Phase 1: Foundation (MVP)
- [ ] Project scaffolding (Nuxt 3, TypeScript, Docker)
- [ ] Entry model + database schema (SQLite)
- [ ] Basic entry CRUD UI (timeline view)
- [ ] Meditation timer (timed entry creation)
- [ ] PWA setup with offline support
- [ ] CapRover deployment
- [ ] Simple auth (optional password for self-hosted)

### Phase 2: Habits & Streaks
- [ ] Habit definitions (matchers, goals, frequency)
- [ ] Streak calculation engine
- [ ] Calendar heatmap visualization
- [ ] Basic data export (JSON, CSV)

### Phase 3: Import & Voice
- [ ] Plugin architecture foundation
- [ ] Insight Timer import plugin
- [ ] Tada list with voice input
- [ ] Dream journal entry type
- [ ] Tags and search

### Phase 4: Connections & Insights
- [ ] Entry linking (threads)
- [ ] Entity support (people, books, films via plugins)
- [ ] "On This Day" random surfacing
- [ ] Obsidian export plugin

### Phase 5: External Sync
- [ ] GPX import/display
- [ ] Strava sync plugin
- [ ] LLM integration (transcription, insights)
- [ ] Weekly digest generation

### Phase 6: Cloud & Polish
- [ ] Multi-tenant authentication
- [ ] Subscription billing
- [ ] Managed push notifications
- [ ] Plugin marketplace
- [ ] Year in Review feature

---

## 9. Open Questions

1. **LLM Provider**: Default to local Ollama for privacy, or offer OpenAI/Anthropic with clear consent?

2. **Sync Strategy**: Last-write-wins with soft-delete, or full CRDT for offline-first?

3. **Timer in Background**: Web Workers + notifications, or accept iOS limitations?

4. **Entity Scope**: Should core include basic entity support, or leave entirely to plugins?

5. **Threads**: Explicit linking UI, or infer from tags/names?

6. **Attachments**: Filesystem vs blob storage? Sync separately from entries?

7. **Schema Evolution**: How do we migrate `data` JSONB fields as types evolve?

---

## 10. References

### Open Source Projects
- [beaverhabits](https://github.com/daya0576/beaverhabits) - Self-hosted habit tracker
- [benji6/meditation-timer](https://github.com/benji6/meditation-timer) - PWA timer reference
- [HPI](https://github.com/karlicoss/HPI) - Human Programming Interface
- [Loop Habit Tracker](https://github.com/iSoron/uhabits) - Streak algorithm reference
- [obsidian-oneirometrics](https://github.com/banisterious/obsidian-oneirometrics) - Dream tracking

### Standards
- [Open mHealth Schemas](https://github.com/openmhealth/schemas)
- [GPX 1.1 Specification](https://www.topografix.com/GPX/1/1/)
- [FHIR Observation](https://www.hl7.org/fhir/observation.html)

---

*This document is a living draft. Update version and date with each revision.*
