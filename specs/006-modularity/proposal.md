# Feature Specification: Modular Architecture

**Feature Branch**: `006-modularity`
**Created**: 2026-02-15
**Status**: Draft - Placeholder
**Phase**: Planning

## Overview

Transform Ta-da's architecture from page-based organization to module-based organization, where each major feature (Ta-da, Tally, Timer, Moments, Rhythms, Timeline) is a self-contained module with clear boundaries and responsibilities.

This enables:
- Better code organization and maintainability
- Consistent patterns across all entry types
- Foundation for potential plugin system in the future
- Easier onboarding for contributors

## Philosophy

**Current state**: Features are organized as pages with shared composables and components scattered throughout the codebase.

**Target state**: Features organized as modules, each containing everything needed for that feature:
- Page routes
- Composables (business logic)
- Components (UI)
- API integration
- Configuration/metadata

**Ground rules for modularity**:
1. Modules can read any entry type via API (for analytics, correlations)
2. Modules can only create/modify entry types they declare ownership of
3. Shared infrastructure (auth, database, API) remains in core
4. No module-to-module dependencies (only core dependencies)

## Proposed Module Structure

```
app/
  modules/
    core/                    # Shared infrastructure
      composables/
        useEntryEngine.ts   # Central entry creation
        useAuth.ts
        useToast.ts
      components/
        DateTimePicker.vue
        EmojiPicker.vue

    tada/                    # Ta-da accomplishments module
      index.ts              # Module manifest
      pages/
        index.vue           # Main entry page (add form + recent)
      composables/
        useTada.ts          # Ta-da-specific logic
      components/
        TadaForm.vue
        TadaCelebration.vue

    tally/                   # Count tracking module
      index.ts
      pages/
        index.vue
      composables/
        useTally.ts
      components/
        TallyCounter.vue
        VoiceTallyRecorder.vue

    timer/                   # Timed sessions module
      index.ts
      pages/
        index.vue
      composables/
        useTimer.ts
      components/
        TimerDisplay.vue

    moments/                 # Quick notes module
      index.ts
      pages/
        index.vue
      composables/
        useMoments.ts

    rhythms/                 # Analytics module
      index.ts
      pages/
        index.vue
      composables/
        useRhythms.ts
      components/
        RhythmBarChart.vue
        RhythmMonthCalendar.vue

    timeline/                # Timeline view module
      index.ts
      pages/
        index.vue
      composables/
        useTimeline.ts
      components/
        VirtualTimeline.vue
        MonthView.vue
```

## Module Manifest Example

```typescript
// modules/tada/index.ts
export default defineModule({
  id: 'tada',
  name: 'Ta-Da!',
  version: '1.0.0',

  // Navigation
  navigation: {
    label: 'Ta-Da!',
    href: '/tada',
    icon: 'i-heroicons-bolt',
    order: 2,
  },

  // What this module creates/owns
  entryTypes: ['tada'],

  // What this module can read (for analytics, etc)
  readPermissions: ['*'],  // All entries

  // Lifecycle hooks (optional)
  onEntryCreated?(entry: Entry): void,
  onInstall?(): void,
})
```

## Migration Strategy

**Phase 1**: Establish pattern with one module (PILOT)
- Choose one feature (suggest: Tally - it's clean and well-structured)
- Move to module structure
- Verify everything works
- Document the pattern

**Phase 2**: Migrate remaining modules one-by-one
- Ta-da
- Timer/Sessions
- Moments
- Rhythms
- Timeline

**Phase 3**: Centralize module loading
- Module registry
- Dynamic route generation
- Dynamic navigation generation

**Phase 4**: External modules (FUTURE - only if needed)
- Load modules from `/custom-modules` directory
- Build-time only (no runtime code execution)
- Requires rebuild to add new modules

## Success Criteria

- [ ] All features organized as modules
- [ ] Clear module boundaries and responsibilities
- [ ] Module manifest declares all routes, permissions, navigation
- [ ] No circular dependencies between modules
- [ ] Documentation for creating new modules
- [ ] Core infrastructure separated from module code

## Out of Scope (For Now)

- Runtime plugin loading
- Plugin marketplace
- User-installable plugins via UI
- Sandboxed code execution
- Plugin API versioning

These may be considered in future iterations if there's demand, but represent significant complexity and security considerations.

---

## Learnings from Quick Wins (2026-02-15)

### ✅ Implemented: Golden + Button Menu

**What we built**: [QuickAddMenu.vue](../../app/components/QuickAddMenu.vue)
- Floating menu above FAB with 4 entry type options (Ta-da, Moment, Session, Tally)
- Opens QuickEntryModal with selected mode
- Integrated with keyboard shortcuts

**Key insight**: **Cross-module coordination already works well!**
- The `QuickEntryModal` component is already shared infrastructure
- The `EntryTypeToggle` component switches modes dynamically
- Different entry types use the same modal with different configs
- **No module-to-module dependencies needed** - everything goes through shared core components

**Implication for modularity**:
- Shared UI components (QuickEntryModal, QuickAddMenu) belong in `core/components/`
- Each module can register its entry type with metadata (icon, color, description)
- Module registry can populate the menu dynamically

### ✅ Implemented: History Consolidation

**What we did**:
- Updated [/pages/tada/index.vue](../../app/pages/tada/index.vue) to show recent entries below add form
- Added info banner to [/pages/tada/history.vue](../../app/pages/tada/history.vue) directing users to main page
- Verified pattern consistency across all entry types:
  - ✅ Tally: add form + recent entries (already existed)
  - ✅ Moments: add form + recent entries with filter (already existed)
  - ✅ Ta-da: add form + recent entries (just added)
  - ✅ Sessions: timer-focused (history via timeline/quick add)

**Key insight**: **The pattern is already 90% consistent!**
- Each entry type page follows: **Add Form → Recent Entries**
- All use the unified `useEntryEngine()` composable
- All fetch via same API: `/api/entries?type=<type>`
- Historical data naturally emerges from filtering entries by type

**Implication for modularity**:
- Each module owns ONE route: `/[module-name]`
- No need for separate `/[module-name]/history` routes
- Pattern already proven: form at top, recent entries below
- Modules can optionally add filters (like moments does with type filter)

### Updated Module Interface

Based on learnings, here's a refined module manifest:

```typescript
// modules/tada/index.ts
export default defineModule({
  id: 'tada',
  name: 'Ta-Da!',
  version: '1.0.0',

  // Navigation entry (appears in menu + QuickAddMenu)
  navigation: {
    label: 'Ta-Da!',
    href: '/tada',
    icon: 'i-heroicons-bolt',
    order: 2,
  },

  // Quick add menu entry (appears in FAB menu)
  quickAdd: {
    mode: 'tada' as EntryMode,
    label: 'Ta-Da!',
    icon: '⚡',
    description: 'Celebrate an accomplishment',
    color: 'bg-amber-500 hover:bg-amber-600',
  },

  // Entry types this module creates
  entryTypes: ['tada'],

  // Page component
  page: () => import('./pages/index.vue'),

  // Optional: Custom components this module provides
  components: {
    celebration: () => import('./components/CelebrationOverlay.vue'),
  },

  // Optional: Module-specific composables
  composables: {
    useTada: () => import('./composables/useTada.ts'),
  },
})
```

### Pattern for Module Pages

All module pages should follow this structure:

```vue
<template>
  <div>
    <!-- Header with voice button -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1>{{ moduleName }}</h1>
        <p>{{ moduleDescription }}</p>
      </div>
      <button @click="showVoice = true">🎤</button>
    </div>

    <!-- Add Form -->
    <div class="mb-6">
      <!-- Module-specific entry form -->
    </div>

    <!-- Recent Entries -->
    <div>
      <h2>Recent {{ moduleName }}</h2>
      <!-- Optional: Filter tabs -->
      <!-- List of entries -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEntryEngine } from '~/composables/useEntryEngine'

const { createEntry, isLoading } = useEntryEngine()
const entries = ref<Entry[]>([])

onMounted(async () => {
  const data = await $fetch('/api/entries', {
    query: { type: 'module-type', limit: 10 }
  })
  entries.value = data.entries
})
</script>
```

### Recommended Next Steps

**Phase 1: Establish Core Infrastructure** (1 week)
1. Create `/app/modules/core/` directory
2. Move shared components to core:
   - QuickAddMenu
   - QuickEntryModal
   - EntryTypeToggle
   - DateTimePicker, EmojiPicker, etc.
3. Move shared composables to core:
   - useEntryEngine
   - useToast
   - usePreferences
4. Create module registry system

**Phase 2: Migrate One Module (Pilot)** (1 week)
1. Choose Tally (cleanest, most self-contained)
2. Create `/app/modules/tally/` structure
3. Create `modules/tally/index.ts` manifest
4. Verify everything works
5. Document the pattern

**Phase 3: Migrate Remaining Modules** (2-3 weeks)
1. Ta-da
2. Moments
3. Timer/Sessions
4. Rhythms (read-only, no entry creation)
5. Timeline (read-only, cross-module view)

**Phase 4: Dynamic Module Loading** (1 week)
1. Implement module registry
2. Auto-generate navigation from modules
3. Auto-generate QuickAddMenu from modules
4. Route registration from modules

## Conclusion

The quick wins proved that:
1. ✅ **Shared infrastructure works great** - QuickEntryModal, useEntryEngine already unified
2. ✅ **Pattern is consistent** - All entry types follow same structure
3. ✅ **API is flexible** - Filtering by type is trivial
4. ✅ **No DRY violations** - History is just filtered recent entries

**The codebase is already ~70% modular!** We just need to reorganize files and add a registry system.

**Risk level**: LOW - This is primarily organizational, not architectural
