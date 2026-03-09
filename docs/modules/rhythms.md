# Rhythms

<p align="center">
  <img src="../../design/screens/tada-screen-rhythm.png" alt="Rhythms tracker" width="300" />
</p>

**Graceful chains, not brittle streaks.**

Rhythms reimagines habit tracking. Instead of all-or-nothing streaks that snap on a single missed day, Rhythms tracks natural patterns with five flexible chain types — finding the rhythm that matches your real life.

## What it does

- **Five chain types:**
  - **Daily** — Consecutive days (for those who want it)
  - **Weekly High (5x)** — 5+ days per week (most days)
  - **Weekly Regular (3x)** — 3+ days per week (several times)
  - **Weekly Target** — Cumulative minutes per week
  - **Monthly Target** — Cumulative minutes per month
- **Year tracker heatmap** — Visual overview of your year
- **Journey stages** — Beginning → Building → Becoming → Being
- **Identity-based messaging** — "You're becoming a meditator" not "You meditated 5 times"
- **Multi-week visualization** — See consistency patterns over extended periods
- **Graceful degradation** — When you're struggling, Rhythms tracks a more sustainable chain type

## Philosophy

> "A chain that bends is stronger than one that snaps."

Traditional streak tracking creates a paradox: the longer your streak, the more anxious you become about breaking it. One missed day destroys weeks of progress, and many people quit entirely after a break.

Rhythms solves this with graceful chains. If you miss a day of your daily practice, your daily chain breaks — but your weekly chain might still be intact. You're still showing up 5 days a week. And if that slips, you're still managing 3 days. The system always finds something to celebrate.

The journey stages (Beginning → Building → Becoming → Being) reflect identity-based change from [Atomic Habits](https://jamesclear.com/atomic-habits). You don't just "do meditation" — you **become a meditator**. The language throughout Rhythms reinforces this identity shift.

## Code

| Path | Purpose |
|------|---------|
| `app/modules/rhythms/` | Rhythms module |
| `app/pages/rhythms.vue` | Rhythms page |
| `app/composables/useRhythms.ts` | Rhythm calculation logic |

---

[Back to modules](./README.md)
