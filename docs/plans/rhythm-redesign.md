# Rhythm UI Redesign — Handoff Brief

**Date:** February 2026
**Status:** Ready for planning and implementation
**Version target:** v0.4.1

---

## Context

The rhythm cards on the Rhythms page currently show confusing labels. A meditation rhythm with no activity this week shows "Starting" — which looks like something is loading/pending. A kettlebells tally rhythm with 1-2 days shows "At least once". These are **frequency tier** labels (how often you practiced this week) but users expect to see **journey stage** labels (Beginning/Building/Becoming/Being).

Two separate systems exist in the codebase but are conflated in the UI:

- **Frequency tiers** (`tierCalculator.ts`): Starting, At Least Once, Several Times, Most Days, Every Day — based on days completed this week
- **Journey stages** (`rhythmCalculator.ts`): Beginning, Building, Becoming, Being — based on total hours invested

The word "Starting" should never appear in the UI — it looks like we're waiting for something to happen.

---

## What the Collapsed Rhythm Card Should Show

Three distinct pieces of information at a glance:

### 1. Journey Stage (Beginning → Being)
Your identity-level progress. "You ARE a meditator" not "you did some meditation".

### 2. Best Chain This Week
What are you on track for this week? On pace for your daily goal, or trending lower? This replaces the current tier label.

### 3. Longest Current Best Chain
E.g., "10 weeks of daily practice" — if someone has a great streak going, surface it prominently.

---

## Tally Rhythm Support

Currently journey stages use total hours, which doesn't work for tallies (push-ups don't have duration).

### Decision: Dual threshold system
When creating a tally rhythm, the user chooses whether it's **session-based** or **count-based** (default: count-based).

- **Count-based:** Journey stages based on total reps/count accumulated
- **Session-based:** Journey stages based on number of sessions logged

A toggle should also be available after creation to switch between modes.

### Default by entry type:
| Entry Type | Default Threshold | Rationale |
|------------|------------------|-----------|
| Timed (meditation, etc.) | Hours | Natural measure of practice |
| Tally (push-ups, etc.) | Count | "1000 push-ups" is meaningful |
| Moment (journal, dream) | Sessions | "100 journal entries" is meaningful |
| Ta-da | Sessions | "50 celebrations" is meaningful |

---

## Revised Journey Stage Thresholds

### For session-based rhythms (and potentially all types)
Based on the "21 days to form a habit" principle:

| Stage | Threshold | Meaning |
|-------|-----------|---------|
| Beginning | < 21 sessions | Exploring, finding your rhythm |
| Building | 21–100 sessions | Habit forming, consistency growing |
| Becoming | 100–365 sessions | Deep practice, identity shifting |
| Being | 365+ sessions | This is who you are |

### For hours-based rhythms (timed entries)
Current thresholds (may want to revisit):

| Stage | Threshold |
|-------|-----------|
| Beginning | < 10 hours |
| Building | 10–100 hours |
| Becoming | 100–1000 hours |
| Being | 1000+ hours |

### For count-based rhythms (tallies)
Needs definition — suggested starting point:

| Stage | Threshold |
|-------|-----------|
| Beginning | < 100 reps |
| Building | 100–1,000 reps |
| Becoming | 1,000–10,000 reps |
| Being | 10,000+ reps |

**Important:** Users should be able to adjust these thresholds per rhythm.

---

## New Rhythm Types

People should be able to create rhythms for:
- **Journalling** (moment entries, subcategory: journal)
- **Dream logging** (moment entries, subcategory: dream)
- **Ta-da celebrations** (tada entries)
- Any entry type, really

These default to session-based thresholds.

---

## Rhythm Settings — Editable After Creation

Currently rhythm settings (chain type, thresholds, etc.) are only configurable at creation time. This needs to change:

- [ ] Edit rhythm settings page/modal accessible from rhythm detail
- [ ] Adjustable journey stage thresholds (per-rhythm override)
- [ ] Toggle between session-based and count-based (for tallies)
- [ ] Change chain type (daily, weekly, etc.)
- [ ] Rename rhythm activity

---

## Key Files to Modify

### Tier system (the "Starting" label source)
- `app/utils/tierCalculator.ts` — `TIERS` array (lines 184-225), `getTierForDaysCompleted()`, `getTierLabel()`

### Journey stage calculation
- `app/server/utils/rhythmCalculator.ts` — `JourneyStage` type (line 63), `getJourneyStage()` (lines 606-611)

### Rhythm card display
- `app/pages/rhythms.vue` — Line 307: `rhythm.currentTierLabel` is what shows "Starting"/"At least once"

### Rhythm API
- `app/server/api/rhythms/index.get.ts` — Lines 100-101: returns `currentTier` and `currentTierLabel`
- `app/server/api/rhythms/[id]/progress.get.ts` — Line 250: returns journey stage (but only on detail endpoint, not list)

### Journey stage display (correct usage to reference)
- `app/components/RhythmEncouragement.vue` — Lines 62-70: correctly maps journey stages to friendly labels with emoji

### Rhythm creation
- `app/server/api/rhythms/index.post.ts` — Where new rhythms are created
- `app/pages/rhythms.vue` — Rhythm creation UI

---

## Summary of Changes Needed

1. **Collapsed rhythm card:** Show journey stage + best chain this week + longest current chain (3 clear pieces of info)
2. **Remove "Starting" from UI entirely** — replace with journey stage names
3. **Add session-based and count-based journey stages** for non-timed rhythms
4. **Revise Beginning threshold** to < 21 sessions (habit formation research)
5. **Allow journal/dream/tada rhythms** (session-based by default)
6. **Make rhythm settings editable** after creation (especially thresholds)
7. **Add threshold type toggle** (session vs count) for tally rhythms

---

## DRY Refactoring Already Done (This Session)

For context, this session also completed three DRY refactorings:

1. **`CategorySubcategoryPicker.vue`** — Extracted shared category/subcategory picker from QuickEntryModal and entry editor
2. **`useEntryForm.ts` composable** — Shared categoryOptions/subcategoryOptions logic
3. **Unified `DurationPicker.vue`** — Merged DurationInput (precise min/sec) and DurationPicker (smart natural language) into one component with `variant` prop. Deleted `DurationInput.vue`.

And fixed **double toast notifications** across all entry creation flows (QuickEntryModal, moments, tally batch, entry restore) by using `skipSuccessToast: true`.
