# Ta-Da! v0.2.0 Release Notes

**Release Date:** January 22, 2026  
**Codename:** Graceful Rhythms 🌿

---

## 🎉 What's New in v0.2.0

This release introduces the **Graceful Rhythms** system — a gentle way to track your natural patterns without the pressure of rigid habit tracking. Plus major improvements to timer presets and a comprehensive test suite.

---

## ✨ Highlights

### 🌿 Graceful Rhythms

A new way to observe your practice patterns that celebrates consistency without punishing breaks.

**Multiple Chain Types:**
- **Daily Chain** — Consecutive days with activity
- **Weekly High** — 5+ days per week
- **Weekly Low** — 3+ days per week (gentler target)
- **Weekly Target** — Cumulative minutes per week
- **Monthly Target** — Cumulative minutes per month

**Journey Stages:**
Your journey stage is based on total practice hours, not streaks:
- 🌱 **Starting** — Less than 10 hours
- 🌿 **Building** — 10-100 hours
- 🌳 **Becoming** — 100-1000 hours
- ⭐ **Being** — 1000+ hours (you ARE this practice)

**Visualizations:**
- **Year Tracker** — GitHub-style heatmap with historical navigation
- **Bar Chart** — 28-day histogram with period navigation
- **Chain Tabs** — Switch between chain types to see different perspectives
- **Encouragement Messages** — Context-aware motivational messages

### ⏱️ Timer Preset Improvements

- **Smarter Mode Selection** — Timer mode (Fixed vs Unlimited) is now auto-derived from your intervals. Set an interval to "Forever" and it becomes unlimited automatically
- **Better Summaries** — Presets show interval info (e.g., "6m bells")
- **Low-Friction Duplicates** — Saving a preset with an existing name offers to replace it instead of blocking
- **Fixed 600 Minutes Bug** — Presets now correctly calculate duration from intervals

### 📊 Timeline Multi-Zoom Views

- **Zoom Toggle** — Day / Week / Month / Year views
- **Period Summaries** — See aggregated stats for any time period
- **Infinite Scroll** — Paginated entry list for large journals
- **Smart Navigation** — Tap year to zoom into months

### 📥 CSV Import System

- **Import Wizard** — Column mapping with preview
- **Built-in Recipes** — Insight Timer format pre-configured
- **Custom Recipes** — Save your mappings for reuse
- **Fast Batch Imports** — 4800+ entries in seconds
- **Auto-Deduplication** — Won't create duplicate entries

### 🧪 Test Suite

- **133+ Unit Tests** — Comprehensive coverage
- **CI Integration** — Tests run on every push
- **Vitest Infrastructure** — Fast, modern test runner

---

## 🔧 Technical Changes

### Added
- Rhythms API with caching (`/api/rhythms`, `/api/rhythms/[id]/progress`)
- Chain calculation utilities with multiple chain types
- Encouragement messages table with seeding
- Timer preset CRUD with replace-on-duplicate
- Stats and Summary APIs for period aggregation

### Changed
- Journey stage now based on total hours (not weeks)
- Timer mode auto-derived from interval configuration
- Chain statistics cached and invalidated on new entries

### Fixed
- Timer preset 600 minutes display bug
- TypeScript strict mode compliance
- Duplicate preset name handling

### Removed
- Mode selector from timer settings (now automatic)

---

## 📱 Upgrade Notes

**Database Migration:** This release includes new database tables for rhythms, encouragements, and import recipes. Migrations run automatically on startup.

**Breaking Changes:** None. All existing data is preserved.

---

## 🙏 Philosophy

> "The goal is not to build a streak. The goal is to become a person who practices."

Graceful Rhythms embraces the philosophy that consistency matters more than perfection. Miss a day? Your chain might reset, but your journey stage — based on total hours — never goes backward. You're still becoming who you want to be.

---

## 📋 Full Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete details.

---

**Thank you for using Ta-Da!** 🎊
