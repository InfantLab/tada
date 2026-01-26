# Home Screen Design Proposal

> **Status:** Draft  
> **Target:** v0.3.0

## Vision

The Home screen is a **personal dashboard** that gives users:

1. **Quick actions** – One-tap access to their most common activities
2. **Activity overview** – At-a-glance summaries of recent progress
3. **Rhythm awareness** – Current streak/chain status for active rhythms

The ta-da logotype serves as the home link – no separate "Home" icon needed.

---

## Navigation Structure

| Route       | Name       | Icon     | Purpose                                 |
| ----------- | ---------- | -------- | --------------------------------------- |
| `/`         | (Home)     | logotype | Configurable dashboard (future)         |
| `/timeline` | Timeline   | 📅       | Chronological view (currently at `/`)   |
| `/sessions` | Sessions   | ⏱️       | Timed activities (meditation, practice) |
| `/tada`     | **Ta-Da!** | ⚡       | **Accomplishments & wins (USP!)**       |
| `/tally`    | Tally      | #        | Counted activities (reps, sets)         |
| `/moments`  | Moments    | ✨       | Dreams, notes, reflections              |
| `/rhythms`  | Rhythms    | 📊       | Habit tracking/streaks                  |
| `/settings` | Settings   | ⚙️       | Config (header only, not bottom nav)    |

**Mobile bottom nav (6 items):** Timeline | Sessions | **Ta-Da!** | Tally | Moments | Rhythms

---

## Home Screen Layout

```
┌─────────────────────────────────────────────────┐
│  [ta-da! logotype]                    ⚙️        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │           Quick Actions Grid             │    │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐     │    │
│  │  │ 🧘  │  │ 🎸  │  │ 💪  │  │  +  │     │    │
│  │  │ Sit │  │Music│  │ 50  │  │ Add │     │    │
│  │  └─────┘  └─────┘  └─────┘  └─────┘     │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │           Today's Activity               │    │
│  │  ⏱️ 45min sessions  │  🔢 120 reps       │    │
│  │  ✨ 3 moments                            │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │           Active Rhythms                 │    │
│  │  🧘 Meditation       ████████░░  23 days │    │
│  │  🎸 Guitar Practice  ███████░░░  18 days │    │
│  │  💪 Exercise         █████░░░░░  12 days │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │           Weekly Summary                 │    │
│  │  [Mini bar chart: M T W T F S S]        │    │
│  │  This week: 4h 32m across 12 sessions   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Quick Actions

### What They Do

| Action Type      | Example  | Behavior                                                |
| ---------------- | -------- | ------------------------------------------------------- |
| Session shortcut | "🧘 Sit" | Opens `/sessions` with preset pre-selected, timer ready |
| Tally shortcut   | "💪 50"  | Instantly adds 50 reps entry with one tap, shows toast  |
| Moment shortcut  | "☕ Tea" | Opens moment capture with pre-filled activity           |
| Add new          | "+"      | Opens action picker to create new shortcut              |

### Configuration

Shortcuts are stored in user preferences (localStorage + API sync):

```typescript
interface QuickAction {
  id: string;
  type: "session" | "tally" | "moment";
  emoji: string;
  label: string;
  // For session shortcuts
  presetId?: string;
  // For tally shortcuts
  activity?: string;
  defaultCount?: number;
  // For moment shortcuts
  momentType?: "tada" | "dream" | "note" | "gratitude";
}
```

**Default shortcuts** (for new users):

1. 🧘 "Sit" – Launches default meditation timer
2. 💪 "Workout" – Opens tally page
3. ⚡ "Ta-Da!" – Opens moment capture in tada mode
4. ➕ "Add" – Configure new shortcut

Users can:

- **Long-press** to edit/delete a shortcut
- **Drag** to reorder
- Add up to 8 shortcuts (2 rows of 4)

---

## Summary Cards

### Today's Activity

- Sessions count + total duration
- Tally count + total reps
- Moments count
- Tapping navigates to Timeline filtered to today

### Active Rhythms

- Shows top 3-5 rhythms by current streak
- Mini progress bar showing days in current chain
- Tapping navigates to `/rhythms`

### Weekly Summary

- Tiny bar chart (7 days)
- Total time + session count
- Comparison to previous week ("↑ 20% from last week")

---

## Card Configuration

Future enhancement: Users can show/hide and reorder cards:

```typescript
interface HomeConfig {
  quickActions: QuickAction[];
  visibleCards: ("today" | "rhythms" | "weekly" | "journey")[];
  cardOrder: string[];
}
```

---

## Implementation Phases

### Phase 1: Basic Home (MVP)

- [ ] Move current timeline to `/timeline`
- [ ] Create new `/` home page with static layout
- [ ] Quick actions grid (session/tally/moment links)
- [ ] Today's activity card
- [ ] Active rhythms card (link to existing component)

### Phase 2: Quick Actions

- [ ] Tally instant-add (one tap = entry created)
- [ ] Session preset launch
- [ ] Quick action configuration UI
- [ ] Long-press to edit

### Phase 3: Rich Cards

- [ ] Weekly summary with mini chart
- [ ] Journey badge integration
- [ ] Card visibility settings
- [ ] Card reordering (drag)

---

## Technical Notes

### State Management

- Quick actions: `usePreferences()` composable
- Activity stats: New `useHomeStats()` composable
- Rhythm status: Existing `useRhythms()` composable

### API Endpoints

- `GET /api/stats/today` – Today's counts
- `GET /api/stats/weekly` – Weekly summary
- `GET /api/rhythms/active` – Current streak status (existing)

### Mobile Considerations

- Quick actions should be large tap targets (min 48px)
- Cards should stack vertically on mobile
- Bottom sheet for shortcut configuration

---

## Open Questions

1. **Should Home replace Timeline in nav, or coexist?**  
   Proposal: Coexist. Home = dashboard, Timeline = chronological history.

2. **How many quick actions before it feels cluttered?**  
   Proposal: Max 8 (2 rows). "Add" button always visible.

3. **Should tally shortcuts require confirmation?**  
   Proposal: Instant-add with undo toast (3 seconds). Power users want speed.

4. **Offline support for quick actions?**  
   Proposal: Queue entries when offline, sync when reconnected.

---

## Related Pages

- [Sessions](../sessions.md) – Timed activity tracking (née Timer)
- [Tally](../tally.md) – Rep/count tracking (new)
- [Moments](../moments.md) – Freeform entries (née Journal)
- [Rhythms](../../design/roadmap.md) – Habit chains
