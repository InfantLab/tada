# Quickstart: v0.2.0 Core Experience Completion

**Date**: 2026-01-14

## Prerequisites

- Bun installed
- Repository cloned
- In `app/` directory

## Setup

```bash
cd app
bun install
bun run db:migrate  # Apply any new migrations
bun run dev         # Start dev server on :3000
```

## Feature Implementation Order

Recommended order based on dependencies:

### Phase 1: Foundation (no new DB tables)

1. **Toast Integration** — Wire existing useToast into layout, replace alerts
2. **Logger Test Fix** — Fix 7 failing tests
3. **Subcategory Auto-complete** — Query existing data

### Phase 2: Database Extensions

4. **Schema Changes** — Add timer_presets, user_preferences tables, entry.emoji
5. **Run migrations** — `bun run db:generate && bun run db:migrate`

### Phase 3: Core Features

6. **Timer Presets** — CRUD API + UI
7. **User Preferences** — CRUD API + Settings UI
8. **Universal Entry Editing** — Edit page + API updates
9. **Custom Emojis** — Emoji picker in settings + display logic

### Phase 4: Celebration & Polish

10. **Ta-Da Page** — New /tada/add with sound + animation
11. **Undo Support** — Client-side buffer + toast action
12. **Hide Categories** — Filter logic in pickers
13. **Delete Category Data** — Bulk delete API + confirmation UI

## Key Files to Modify

| Feature     | Files                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| Toast       | `layouts/default.vue`, various pages                                       |
| Logger      | `utils/logger.ts`, `utils/logger.test.ts`                                  |
| Presets     | `server/db/schema.ts`, `server/api/presets/*.ts`, `pages/timer.vue`        |
| Preferences | `server/db/schema.ts`, `server/api/preferences/*.ts`, `pages/settings.vue` |
| Entry Edit  | `pages/entry/[id].vue`, `server/api/entries/[id].*.ts`                     |
| Ta-Da       | `pages/tada/add.vue`, `public/sounds/tada.mp3`                             |

## Testing

```bash
cd app
bun run test                    # Run all tests
bun run test utils/logger       # Run specific test file
bun run typecheck               # Check types
bun run lint:fix                # Fix lint issues
```

## Verification Checklist

- [ ] All 140+ tests pass (including logger tests)
- [ ] Toast notifications appear on save/delete/error
- [ ] Timer presets can be created and used
- [ ] Entry emojis can be customized
- [ ] Ta-Da page plays sound and shows animation
- [ ] Undo works for entry deletion
- [ ] No browser alert() dialogs in normal usage
