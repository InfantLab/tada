# Quick Entry Modal Improvements

## Overview

Updated QuickEntryModal to be more consistent with the entry editing screen and improve UX.

## Changes Made

### 1. Field Reordering

**Old Order:**

1. Mode toggle
2. Activity name (title)
3. Category (text input)
4. Duration/Count
5. When (timestamp)
6. Notes

**New Order:**

1. Mode toggle
2. Emoji picker (centered, clickable)
3. Activity name (title)
4. Notes (moved up)
5. Category & Subcategory (two selects)
6. Duration/Count (conditional)
7. When (timestamp)

### 2. Category/Subcategory Improvements

**Before:**

- Single text input for category
- Dropdown suggestions from recent usage
- No subcategory support

**After:**

- Two side-by-side `<select>` elements (matching entry edit screen)
- Categories show emoji + label (e.g., "🧘 Mindfulness")
- Subcategories filtered by selected category
- Subcategories also show emoji + label
- Respects user preferences (hidden categories)

### 3. Emoji Support

**Added:**

- Emoji picker button (large, centered, clickable like entry edit)
- Defaults to ✨ if no emoji selected
- Uses shared `EmojiPicker` component
- Emoji included in entry creation

### 4. Code Quality (DRY)

**Removed Duplication:**

- Uses `CATEGORY_DEFAULTS` from `~/utils/categoryDefaults`
- Uses `usePreferences()` composable for category visibility
- Uses same category/subcategory pattern as entry edit screen
- Removed custom category suggestion code
- Emoji picker uses same component as entry edit

**Shared Components:**

- `EmojiPicker` - Used by both QuickEntryModal and entry/[id].vue
- `DateTimePicker` - Shared datetime input
- `DurationPicker` - Shared duration input
- `QuickValuePicker` - Shared count input

## UX Consistency Between Screens

### QuickEntryModal (Add New Entry)

```
┌─────────────────────────┐
│  Ta-Da! | Moments | ... │  ← Mode toggle
├─────────────────────────┤
│         ✨              │  ← Emoji (clickable)
├─────────────────────────┤
│  What did you do?       │  ← Activity name
│  [Meditation]           │
├─────────────────────────┤
│  Notes (optional)       │  ← Notes (moved up)
│  [textarea]             │
├─────────────────────────┤
│  Category | Subcategory │  ← Two selects
│  [🧘 Mind] [⚪ Sitting] │
├─────────────────────────┤
│  When?                  │  ← Timestamp
│  [Sat] [Sun] [Yest]...  │
└─────────────────────────┘
```

### Entry Edit Screen

```
┌─────────────────────────┐
│         🧘              │  ← Large emoji (clickable)
├─────────────────────────┤
│  [Entry title]          │  ← Title input
├─────────────────────────┤
│  Date & Time            │  ← Timestamp
├─────────────────────────┤
│  Notes                  │  ← Notes
│  [textarea]             │
├─────────────────────────┤
│  Category | Subcategory │  ← Two selects
│  [🧘 Mind] [⚪ Sitting] │
└─────────────────────────┘
```

### Differences (Intentional)

1. **Mode toggle** - Only in QuickEntryModal (choose entry type)
2. **Timestamp position** - Later in QuickEntryModal (defaults to "now")
3. **Field order** - QuickEntryModal optimized for quick data entry
4. **Notes position** - Higher in QuickEntryModal (capture context immediately)

## Benefits

1. **Consistency** - Category/subcategory UX matches across screens
2. **Discoverability** - Users see all categories/subcategories in dropdowns
3. **Visual Clarity** - Emojis help identify categories at a glance
4. **Emoji Customization** - Can set emoji for any entry type
5. **Less Code** - Removed custom category suggestion logic
6. **Better Autocomplete** - ActivityAutocomplete can now set subcategory too

## Migration Notes

### Breaking Changes

None - the modal is backward compatible.

### API Changes

- `buildEntryInput()` now includes `subcategory` and `emoji` fields
- Draft restoration now preserves subcategory and emoji

### Component Dependencies

Requires:

- `usePreferences()` composable (for category visibility)
- `CATEGORY_DEFAULTS` and `getSubcategoriesForCategory()` utils
- `EmojiPicker` component

## Future Improvements

1. **Smart defaults** - Auto-select category based on activity name
2. **Recent categories** - Show most-used categories at top of dropdown
3. **Custom categories** - Allow users to create custom categories (v0.6.0+)
4. **Keyboard navigation** - Better keyboard support for category selects
5. **Mobile optimization** - Native select on mobile vs custom dropdown on desktop
