# Timeline

<p align="center">
  <img src="../../design/screens/tada-screen-timeline.png" alt="Timeline view" width="300" />
</p>

**Your life at a glance.**

The Timeline isn't a module — it's the home screen that ties everything together. Every entry from every module flows into a single chronological view.

## What it does

- **Multiple zoom levels** — Day, week, month, and year views with smooth transitions
- **Infinite scroll** — Virtual scrolling handles years of data without performance issues
- **Category filtering** — Focus on specific life domains (mindfulness, creative, health, etc.)
- **Natural search** — Type "last tuesday" or "meditation in january" and find what you're looking for
- **Journey badge** — Celebrates your total accumulated hours across all activities

## Philosophy

The Timeline embodies the "noticing" philosophy. It doesn't tell you what to do next — it shows you what you've already done. Patterns emerge naturally when you look back at your life without judgment.

## Code

| Path | Purpose |
|------|---------|
| `app/pages/index.vue` | Main timeline page |
| `app/components/TimelineView.vue` | Timeline rendering |
| `app/composables/useTimeline.ts` | Timeline data & state |

---

[Back to modules](./README.md)
