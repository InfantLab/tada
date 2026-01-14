# Research: v0.2.0 Core Experience Completion

**Date**: 2026-01-14  
**Status**: Complete

## Audio Playback for Celebration Sound

**Decision**: Use HTML5 Audio API via a composable

**Rationale**:

- Nuxt 3/Vue already uses this pattern for existing bell sounds in timer
- No additional dependencies needed
- Works offline (PWA compatible)
- Simple: `new Audio('/sounds/tada.mp3').play()`

**Alternatives Considered**:

- Howler.js — overkill for single sound effect
- Web Audio API — more complex, no benefit for simple playback

## Celebration Animation

**Decision**: CSS animations with optional confetti library

**Rationale**:

- CSS keyframes for simple scale/opacity effects (lightweight)
- Consider canvas-confetti (2KB) for particle effects if needed
- Matches existing app aesthetic (subtle, not overwhelming)

**Alternatives Considered**:

- Lottie animations — requires JSON assets, heavier
- GSAP — powerful but overkill

## Toast Notification System

**Decision**: Use existing `useToast.ts` composable and `ToastContainer.vue`

**Rationale**:

- Already implemented in codebase (composables/useToast.ts)
- Just needs integration into layout and replacing alert() calls
- Supports stacking, auto-dismiss, manual dismiss

**Alternatives Considered**:

- vue-toastification — external dependency, existing solution sufficient
- Nuxt UI toasts — would require adding Nuxt UI dependency

## Undo Buffer Implementation

**Decision**: Client-side soft delete with timeout restoration

**Rationale**:

- Store deleted entries in memory/localStorage for 10-30 seconds
- On undo, restore from buffer
- On timeout expiry, permanently delete via API
- Simpler than server-side soft delete columns

**Alternatives Considered**:

- Database soft delete (deleted_at column) — adds complexity to all queries
- Server-side undo queue — requires additional API endpoints and state

## Timer Presets Storage

**Decision**: New `timer_presets` table in SQLite

**Rationale**:

- Presets are user data that should persist across sessions
- Need to store: name, duration, category, subcategory, bell config (JSON)
- Follows existing pattern for user-specific data

**Alternatives Considered**:

- localStorage only — lost on device switch, not backed up
- JSON field in users table — messier, harder to query

## User Preferences Storage

**Decision**: New `user_preferences` table with JSON fields

**Rationale**:

- Single row per user with JSON columns for:
  - `hidden_categories`: string[]
  - `hidden_entry_types`: string[]
  - `custom_emojis`: Record<string, string>
  - `custom_entry_types`: {name, emoji}[]
- Flexible schema for future preferences

**Alternatives Considered**:

- Separate tables per preference type — over-normalized
- localStorage — not synced, not backed up

## Subcategory Auto-complete

**Decision**: Query existing entries for distinct subcategories

**Rationale**:

- `SELECT DISTINCT subcategory FROM entries WHERE userId = ? AND category = ?`
- Cache in composable for session
- No new storage needed

**Alternatives Considered**:

- Dedicated subcategories table — over-engineered for auto-complete
- Full-text search — overkill for short strings

## Logger Test Failures

**Decision**: Investigate and fix JSON format assertions

**Rationale**:

- 7 tests failing due to format mismatch
- Need to examine test expectations vs actual output
- Likely timestamp format or field ordering issue

**Next Steps**:

- Run tests to see exact failures
- Compare expected vs actual JSON structure
- Update logger or tests to align
