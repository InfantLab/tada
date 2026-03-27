# Ta-Da! v0.6.0 Release Notes

**Release Date:** March 2026
**Codename:** See Your Day

---

## What's New in v0.6.0

Three big additions: weekly review features that celebrate what you've done (never guilt what you haven't), colourful daily timeline bars that show how your day unfolded at a glance, and a round of UX polish across moments, help, and onboarding.

---

## Highlights

### Daily Timeline Bar

The most visual change in this release. Every day in your timeline now has two new layers:

- **Per-card indicator** — a small coloured dot or bar on each activity card shows when that entry happened on a 24-hour scale, so you can feel the rhythm of the day without reading timestamps
- **Day strip** — a combined bar above the card list overlays all activities for the day on a single timeline, colour-coded by category. Tap any block to jump to that entry.

Category colours are consistent across cards, the strip, and filter chips. Short entries (<5 min) and instant entries (ta-das, moments, tallies) appear as dots. Overlapping timed entries use semi-transparent layering with z-ordered emoji markers. Pure CSS — no charting library, fully responsive from 320px mobile to wide desktop.

### Weekly Rhythms — Celebration & Encouragement

Two new optional weekly touchpoints, both off by default (opt-in only):

**Monday Celebration** — every Monday morning, Ta-Da! generates a summary of your previous week: entry counts by type, session time by category, week-over-week comparisons, personal records, and rhythm chain status (maintained / extended / bending / broken). Four privacy tiers let you choose how rich the summary is:

| Tier | How it works |
|------|-------------|
| Stats Only | Numbers only — no AI involved |
| Private AI | Your own API key, processed locally |
| Cloud AI Factual | Ta-Da! cloud, factual phrasing only |
| Cloud AI Creative | Ta-Da! cloud, warm and celebratory |

**Thursday Encouragement** — a gentle mid-week check-in with general progress and rhythm-specific stretch goals, based on your rolling 4-week average. Positive and guilt-free — quiet weeks are acknowledged gently, never shamed.

Both can be delivered in-app or by email. One-click unsubscribe in every email. Bounce tracking auto-disables delivery after 3 consecutive failures.

### What's New Popup & Onboarding Defaults

Returning users see a one-time "What's New" overlay when the app detects a version upgrade — with a direct path to turn on weekly celebrations. First-time users now get sensible out-of-the-box defaults so the app feels welcoming before any configuration.

### Help Page Improvements

Each section of the Help & FAQ page now shows a visible one-line description beneath its heading — the answer to "What is X?" — so you can scan the page without expanding every accordion. Settings, Account, Site, and Support sections all received proper intro descriptions.

---

## Bug Fixes

**Moments list false empty state** — entries saved as `type="moment"` were excluded by the initial page-load filter, causing "No moments yet" to appear even when moments existed. The filter is now unified across both the initial load and the post-save refresh, and the API fetch limit was raised to 100 to reduce pagination-related misses.

**Celebration quality** — milestone labels, active-day highlighting, record labels, and card layout all sharpened based on real-world feedback from the first weekly cycles.

**Rate limit handling** — rate limit error responses now surface the wait time clearly rather than showing a generic error.

---

## New API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/weekly-rhythms/current` | Current week's celebration or encouragement |
| `GET /api/weekly-rhythms/history` | Past celebrations |
| `POST /api/weekly-rhythms/messages/:id/dismiss` | Dismiss an in-app message |
| `POST /api/weekly-rhythms/preview` | Preview celebration for current data |
| `GET /api/weekly-rhythms/settings` | Get weekly rhythm preferences |
| `PUT /api/weekly-rhythms/settings` | Update weekly rhythm preferences |
| `GET /api/weekly-rhythms/unsubscribe/:token` | One-click email unsubscribe |

---

## Upgrade Notes

**Breaking Changes:** None. All existing data is preserved.

**Self-hosted users:** Drop-in upgrade. Back up your database before deploying. Weekly rhythm features are off by default — existing users won't see anything new until they opt in via Settings → Rhythms.

**Weekly rhythms scheduling:** Celebrations generate at 3:33am Monday (user's local timezone) and email delivers at 8:08am. Thursday encouragement fires at 3:03pm. All times are per-user timezone-aware.

---

## What's Deferred

- **Tailwind v4** — still waiting on `@nuxtjs/tailwindcss` v4 compatibility (carried forward from v0.5.0)

---

## Philosophy

> "Celebration isn't a reward for perfection — it's the practice itself."

The weekly rhythm features in v0.6.0 exist to answer a question we kept coming back to: what if the app noticed what you'd done, and told you about it? Not to judge. Not to push harder. Just to say: here's what you built this week.

The Daily Timeline Bar comes from the same impulse. Not metrics — just a picture of your day. You can see the meditation at 7am, the focused work block in the afternoon, the gratitude entry before bed. That's your day. It's worth seeing.

---

**Thank you for using Ta-Da!**
