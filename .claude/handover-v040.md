# v0.4.0 Handover Document

**Date:** February 2026
**Last commit:** `cc7aae0` - feat(cloud): complete v0.4.0 cloud platform UI and onboarding

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

### Cloud Platform UI (commit `cc7aae0`)
Just completed:

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
- [/api/feedback](app/server/api/feedback.post.ts) - Logs feedback (needs DB table for production)

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

See [design/roadmap.md](design/roadmap.md) for full details.

### Onboarding (minor)
- [ ] First week "getting started" card on home
- [ ] Settings tour when visiting Settings page

### Help System (minor)
- [ ] Direct "Need help?" links from relevant pages
- [ ] Contextual `?` icon in header with slide-in panels

### Feedback (minor)
- [ ] Screenshot/recording attachment option
- [ ] Database table for storing feedback (currently just logs)

### Legal (minor)
- [ ] Data processing agreements page
- [ ] Data deletion workflow in account settings

### Marketing (can defer)
- [ ] Blog foundation with initial content
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

1. **Quick wins:** Add "Need help?" links to pages, Settings tour
2. **Data deletion:** Add delete account button to `/account` page
3. **Feedback storage:** Create `feedback` table in schema, update API
4. **Blog:** Create `/blog` with 1-2 philosophy articles

---

*Handover prepared by Claude Opus 4.5*
