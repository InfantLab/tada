# tada Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-22

## Active Technologies

- TypeScript 5.9.3, Vue 3 (Nuxt 4.4.2) + Vue 3, Tailwind CSS 3.4.17, existing `categoryDefaults.ts` palette (011-daily-timelines)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.9.3, Vue 3 (Nuxt 4.4.2): Follow standard conventions

## Recent Changes

- 011-daily-timelines: Added TypeScript 5.9.3, Vue 3 (Nuxt 4.4.2) + Vue 3, Tailwind CSS 3.4.17, existing `categoryDefaults.ts` palette

<!-- MANUAL ADDITIONS START -->
## Database Table Names (key decisions)

- `system_messages` — system-generated user-facing messages (celebrations, encouragements, future types). Previously `weekly_messages`; renamed to be non-weekly-specific.
- `system_message_deliveries` — channel-level delivery audit trail. Previously `weekly_delivery_attempts`.
- Drizzle exports: `systemMessages`, `systemMessageDeliveries`
- TS types: `SystemMessage`, `NewSystemMessage`, `SystemMessageDelivery`, `NewSystemMessageDelivery`

## Weekly Rhythms — Celebration UX decisions

- Celebrations and encouragements are dismissed (soft delete via `dismissedAt`), never hard-deleted — history is preserved in `system_messages`
- Dismissed messages remain accessible via `GET /api/weekly-rhythms/history`
- Celebrations do NOT appear in the main entry timeline — they live in `system_messages` only
- Encouragements are ephemeral; celebrations are archivable (future history UI)
- `tierApplied` is surfaced on the in-app card with a subtle "Richer celebrations available →" nudge for `stats_only` users
<!-- MANUAL ADDITIONS END -->
