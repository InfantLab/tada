# Release Notes: v0.4.0

**Release Date:** 2026-02-04

## Overview

Version 0.4.0 introduces the tada.living cloud platform with a complete onboarding experience, contextual help system, and improved CI/CD pipeline. This release marks the transition from a self-hosted application to a fully-featured cloud service while maintaining full FOSS compatibility.

## New Features

### Cloud Platform (tada.living)

- **User Onboarding Flow**: New users are guided through account setup with a multi-step wizard
- **Getting Started Dashboard**: Contextual help panels that adapt to user progress
- **Feedback System**: In-app feedback collection stored in database for analysis
- **Blog Integration**: `/blog` page for announcements and tips
- **Newsletter Signup**: Email collection for updates (GDPR-compliant)

### Landing Page

- **New Marketing Site**: Professional landing page at `/` for non-authenticated users
- **Feature Highlights**: Showcases voice input, insights, and privacy-first approach
- **Call-to-Action**: Clear paths to sign up or learn more

### Privacy & Legal

- **Privacy Policy Page**: `/privacy` with comprehensive data handling information
- **DPA (Data Processing Agreement)**: `/dpa` for business/enterprise users
- **Cookie Consent**: GDPR-compliant consent banner in cloud mode

## Improvements

### CI/CD Pipeline

- **Pragmatic Test Strategy**: Tests and build are blocking; lint and typecheck provide feedback
- **Faster Builds**: Jobs run in parallel where possible
- **Docker Validation**: Container health check on main branch pushes
- **Concurrency Control**: Cancels in-progress runs for same branch

### Test Infrastructure

- **Fixed Fake Timers**: `naturalLanguageParser.test.ts` now handles environments without fake timer support
- **Nuxt Auto-imports**: `health.get.test.ts` properly mocks Nuxt globals using `vi.hoisted()`
- **Relaxed ESLint**: Test files have appropriate rule exceptions

### Documentation

- **ENVIRONMENTS.md**: New guide explaining localhost, self-hosted, and cloud configurations
- **Database Path Strategy**: Clear documentation of `../data/` (dev) vs `/data/` (prod) approach

## Technical Details

### Database Schema Updates

- `newsletter_subscribers` table for email collection
- `feedback` table for user feedback storage
- `onboarding_progress` tracking for getting started flow

### New API Endpoints

- `POST /api/newsletter/subscribe` - Newsletter signup
- `POST /api/feedback` - Submit feedback
- `GET /api/onboarding/progress` - Get user onboarding status
- `PATCH /api/onboarding/progress` - Update onboarding progress

### New Components

- `LandingPage.vue` - Marketing landing page
- `NewsletterSignup.vue` - Email collection form
- `GettingStartedCard.vue` - Onboarding progress card

## Migration Notes

### For Self-Hosted Users

No action required. Cloud features are disabled by default. Your existing setup continues to work unchanged.

### For Developers

1. Run `bun run db:migrate` to apply new migrations
2. The database path is now set by `package.json` scripts, not `.env`
3. See `docs/ENVIRONMENTS.md` for the updated configuration strategy

## Known Issues

- Strict TypeScript checking shows pre-existing errors (non-blocking, tracked for future cleanup)
- ESLint reports warnings in some files (non-blocking)

## What's Next (v0.5.0)

- Mobile app (PWA improvements)
- Advanced insights with AI-powered recommendations
- Social features (optional sharing)
- API rate limiting improvements

---

**Full Changelog**: https://github.com/InfantLab/tada/compare/v0.3.1...v0.4.0
