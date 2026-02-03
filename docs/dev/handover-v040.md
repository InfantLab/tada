# v0.4.0 Handover Document

**Date:** February 2026
**Last commit:** `a8184d0` - feat(cloud): add feedback storage, contextual help panels, and blog

---

## What Was Done

### Cloud Infrastructure (commit `54a2dd5`)
Previously implemented core cloud platform:
- Cloud mode detection (`TADA_CLOUD_MODE` env var or Stripe keys)
- Database schema: subscription fields, email_verification_tokens, subscription_events
- Usage limits: 1-year rolling window for free tier
- Email verification flow
- Stripe integration (checkout, portal, webhooks)
- Account page (`/account`)
- `useSubscription` composable
- `ArchiveNotice` component

### Data Deletion (GDPR Compliance)
Completed:
- [DELETE /api/account](app/server/api/account.delete.ts) - Deletes user and all data
  - Cancels any active Stripe subscriptions
  - Invalidates all user sessions
  - Deletes user record (cascades to all related data via foreign keys)
  - Requires confirmation phrase "DELETE" in request body
- [/account](app/pages/account.vue) - Added "Danger Zone" section
  - Delete account button with modal confirmation dialog
  - User must type "DELETE" to confirm
  - Works for both cloud and self-hosted modes

### Feedback Storage (just completed)
- [feedback table](app/server/db/schema.ts) - New database table for storing user feedback
  - Stores type (bug/feedback/question), description, system info
  - Status tracking: new → reviewed → in_progress → resolved → closed
  - Internal notes field for admin use
- [0017_feedback.sql](app/server/db/migrations/0017_feedback.sql) - Migration for feedback table
- [/api/feedback](app/server/api/feedback.post.ts) - Updated to store in database instead of logging

### Contextual Help Panels (just completed)
- [ContextualHelpPanel.vue](app/components/ContextualHelpPanel.vue) - Slide-in help panel
  - Page-specific help content for: Timeline, Sessions, Ta-Da!, Moments, Tally, Rhythms, Settings
  - Philosophy-focused content answering "why" not just "how"
  - Links to full FAQ and feedback form
  - Keyboard shortcut (Escape to close)
- [default.vue](app/layouts/default.vue) - Added ? icon in header
  - Positioned next to settings icon
  - Opens contextual help panel on click

### Blog Foundation (just completed)
- [/blog](app/pages/blog/index.vue) - Blog listing page
  - Category filtering (Philosophy, Design)
  - Clean card-based post listing
  - Newsletter signup placeholder
- [/blog/counting-up](app/pages/blog/counting-up.vue) - Article on count-up philosophy
- [/blog/identity-over-streaks](app/pages/blog/identity-over-streaks.vue) - Article on identity-based habits
- [/blog/graceful-rhythms](app/pages/blog/graceful-rhythms.vue) - Article on flexible consistency
- [auth.global.ts](app/middleware/auth.global.ts) - Added /blog to public paths

### Quick Wins (Help & Onboarding)
Previously completed:
- [HelpLink.vue](app/components/HelpLink.vue) - Reusable contextual help link component
  - Supports search query param to pre-filter help page
  - Added to: Sessions, Rhythms, Settings pages
- [/help](app/pages/help.vue) - Now supports `?q=` query param for pre-filtering
- [SettingsHint.vue](app/components/onboarding/SettingsHint.vue) - Settings page tour
  - Shows once on first visit to Settings
  - Gentle banner explaining key sections
  - Dismissible, respects user preference
- [useOnboarding.ts](app/composables/useOnboarding.ts) - Added settingsHintDismissed state

### Cloud Platform UI (commit `cc7aae0`)
Previously completed:

**Legal & Compliance:**
- [/privacy](app/pages/privacy.vue) - GDPR-compliant privacy policy
- [/terms](app/pages/terms.vue) - Terms of service
- [CookieConsent.vue](app/components/CookieConsent.vue) - Shows only in cloud mode

**Marketing:**
- [LandingPage.vue](app/components/LandingPage.vue) - Philosophy-driven landing
- [index.vue](app/pages/index.vue) - Shows landing or timeline based on auth
- SEO meta tags in [nuxt.config.ts](app/nuxt.config.ts) - OG, Twitter, canonical

**User Support:**
- [/help](app/pages/help.vue) - Searchable FAQ with 6 categories
- [/feedback](app/pages/feedback.vue) - Bug report with system info consent
- [/api/feedback](app/server/api/feedback.post.ts) - Stores feedback in database
- [/blog](app/pages/blog/index.vue) - Philosophy blog with 3 articles

**Onboarding:**
- [useOnboarding.ts](app/composables/useOnboarding.ts) - State management
- [WelcomeOverlay.vue](app/components/onboarding/WelcomeOverlay.vue) - First-visit welcome
- [FeatureHint.vue](app/components/onboarding/FeatureHint.vue) - Contextual hints
- [FirstTimeCelebration.vue](app/components/onboarding/FirstTimeCelebration.vue) - Celebrates firsts

**Infrastructure:**
- [/api/health](app/server/api/health.get.ts) - Health check endpoint
- [auth.global.ts](app/middleware/auth.global.ts) - Updated for public pages
- App version bumped to 0.4.0

---

## What Remains for v0.4.0

See [design/roadmap.md](../design/roadmap.md) for full details.

### Onboarding (minor)
- [ ] First week "getting started" card on home
- [x] Settings tour when visiting Settings page (DONE)

### Help System ✅
- [x] Direct "Need help?" links from relevant pages (DONE)
- [x] Contextual `?` icon in header with slide-in panels (DONE)

### Feedback ✅
- [ ] Screenshot/recording attachment option
- [x] Database table for storing feedback (DONE)

### Legal (minor)
- [ ] Data processing agreements page
- [x] Data deletion workflow in account settings (DONE)

### Marketing ✅
- [x] Blog foundation with initial content (DONE - 3 articles)
- [ ] Email newsletter signup

### Deployment (can defer)
- [ ] CapRover captain-definition
- [ ] Automated backup scripts

---

## Key Files to Know

| Purpose | File |
|---------|------|
| Cloud mode detection | `app/server/utils/cloudMode.ts` |
| Usage limits | `app/server/utils/usageLimits.ts` |
| Subscription state | `app/composables/useSubscription.ts` |
| Stripe integration | `app/server/services/stripe.ts` |
| Onboarding state | `app/composables/useOnboarding.ts` |
| Public page list | `app/middleware/auth.global.ts` |
| Contextual help | `app/components/ContextualHelpPanel.vue` |
| Feedback storage | `app/server/db/schema.ts` (feedback table) |
| Blog pages | `app/pages/blog/*.vue` |
| Design docs | `design/commercial.md`, `design/roadmap.md` |

---

## Design Philosophy Reminders

Ta-Da! is **gentle and celebratory**:
- Count up, not down — celebrate what you did
- Identity over streaks — "you're a meditator" not "don't break your streak"
- Graceful rhythms — missing a day isn't failure
- Onboarding like a friend showing you around, not a tutorial
- Help that answers "why" not just "how"

---

## Testing Notes

- Cloud mode: Set `TADA_CLOUD_MODE=true` or configure `STRIPE_SECRET_KEY`
- Self-hosted mode: Leave both unset (default)
- Health check: `curl localhost:3000/api/health`
- Landing page: Log out and visit `/`

---

## Suggested Next Steps

1. ~~**Quick wins:** Add "Need help?" links to pages, Settings tour~~ DONE
2. ~~**Data deletion:** Add delete account button to `/account` page~~ DONE
3. ~~**Feedback storage:** Create `feedback` table in schema, update API~~ DONE
4. ~~**Blog:** Create `/blog` with 1-2 philosophy articles~~ DONE
5. ~~**Contextual help panels:** `?` icon in header with slide-in help panels~~ DONE
6. **First week card:** Add "getting started" card on home for new users
7. **Email newsletter:** Add newsletter signup to blog/landing
8. **Deployment:** CapRover captain-definition and backup scripts

---

*Handover prepared by Claude Opus 4.5*
