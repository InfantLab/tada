# Tally

<p align="center">
  <img src="../../design/screens/tada-screen-tally.png" alt="Tally counter" width="300" />
</p>

**Count anything.**

Some activities are better counted than timed. Push-ups, glasses of water, pages read, coffees consumed — Tally provides a simple tap-to-increment interface for any discrete activity.

## What it does

- **Tap to count** — Minimal friction counter interface
- **Custom units** — Reps, glasses, pages, or any unit you define
- **Voice input** — "Did 30 push-ups and drank 8 glasses of water"
- **Timeline integration** — Tallies appear alongside sessions and ta-das
- **Rhythms integration** — Count-based activities participate in rhythm tracking

## Philosophy

Tally exists because not everything is about time. Reading 50 pages, doing 100 push-ups, drinking 8 glasses of water — these are accomplishments measured in counts, not minutes. Tally gives them first-class support without overcomplicating the interface.

## Module definition

| Field | Value |
|-------|-------|
| Type | `tally` |
| Label | Tally |
| Emoji | 🔢 |
| Requires | `count` |
| Quick Add | Order 3, amber |

## Code

| Path | Purpose |
|------|---------|
| `app/modules/entry-types/tally/index.ts` | Module definition & registration |
| `app/modules/entry-types/tally/TallyInput.vue` | Input component |
| `app/pages/tally.vue` | Convenience route |

---

[Back to modules](./README.md)
