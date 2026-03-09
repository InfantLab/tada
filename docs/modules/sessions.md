# Sessions

<p align="center">
  <img src="../../design/screens/tada-screen-timer.png" alt="Sessions timer" width="300" />
</p>

**A timer where every second counts.**

Sessions is a timer for meditation and focused practices. It counts up rather than down — a design choice that subtly changes the experience. Instead of watching time drain away, you see your practice accumulate. Every second is yours.

## What it does

- **Count-up timer** — Shows elapsed time so every second of practice is visible
- **Unlimited mode** — No target, just practice for as long as feels right
- **Fixed mode** — Set a target duration, but keep going if you're in the flow — six minutes becomes ten when the moment is right
- **Interval bells** — Periodic chimes at configurable intervals
- **Customizable presets** — Save your favourite timer configurations
- **Session recovery** — If the app closes mid-session, your progress is preserved
- **Post-session reflection** — Optional voice note after completing a session
- **Quality rating** — 1-5 stars to track session quality over time

## Philosophy

The timer counts up because every second of practice matters — whether that's 45 seconds before the baby wakes, or an hour of deep focus. There's no minimum duration and no failure state.

Counting up also encourages you to keep going. In fixed mode, when you reach your target and you're in a good state, you can simply carry on. The timer doesn't stop you — it just keeps counting. A six-minute target becomes ten minutes when you're in the right headspace, and that feels like a gift rather than an obligation.

Sessions doesn't have a minimum duration. If you sat for 45 seconds and then got interrupted — that still counts. You showed up.

## Module definition

| Field | Value |
|-------|-------|
| Type | `timed` |
| Label | Sessions |
| Emoji | ⏱️ |
| Requires | `duration` |
| Quick Add | Order 2, emerald |

## Code

| Path | Purpose |
|------|---------|
| `app/modules/entry-types/timed/index.ts` | Module definition & registration |
| `app/modules/entry-types/timed/TimedInput.vue` | Timer & input component |
| `app/pages/sessions.vue` | Convenience route |

---

[Back to modules](./README.md)
