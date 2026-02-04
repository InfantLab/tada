# Ta-Da! Commercial Architecture

Design document for enabling freemium hosting at tada.living while keeping the core app fully open source.

## Philosophy

- **FOSS first**: All features exist in the open source codebase
- **Config-driven**: Commercial features enabled via environment variables
- **Self-host friendly**: No artificial limitations for self-hosters
- **Transparent**: Users always know what tier they're on and why

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Ta-Da FOSS (this repo)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Core App    │  │ Billing     │  │ Usage Limits        │  │
│  │ (always on) │  │ (if Stripe) │  │ (if cloud mode)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    Environment Config
                              │
┌─────────────────────────────────────────────────────────────┐
│              tada.living (private repo)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ captain-    │  │ .env        │  │ CapRover            │  │
│  │ definition  │  │ .production │  │ deployment          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Cloud Mode Detection

Cloud mode is enabled when `TADA_CLOUD_MODE=true` or when Stripe keys are present.

```typescript
// server/utils/cloudMode.ts
export function isCloudMode(): boolean {
  return (
    process.env.TADA_CLOUD_MODE === 'true' ||
    !!process.env.STRIPE_SECRET_KEY
  );
}

export function isBillingEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
```

**Behavior differences in cloud mode:**
- Email verification required on signup
- Usage limits enforced
- Subscription tier shown in UI
- Upgrade prompts when approaching limits

**Self-hosted mode (default):**
- No limits enforced
- No billing UI
- Email verification optional
- Full feature access

---

## Subscription Tiers

### Free Tier
- **Data retention**: 1 year rolling window
- **Entries**: Unlimited (within retention period)
- **Features**: All core features
- **AI services**: Basic (if configured)
- **Support**: Community only

### Premium Tier (~$5/month or $50/year)
- **Data retention**: Unlimited
- **Entries**: Unlimited
- **Features**: All features
- **AI services**: Full access
- **Support**: Email support
- **Extras**:
  - Priority feature requests
  - Early access to new features

### Self-Hosted (no tier)
- Everything unlimited
- User manages their own infrastructure
- No billing integration

---

## Database Schema Additions

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN subscription_expires_at TEXT;
ALTER TABLE users ADD COLUMN email_verified_at TEXT;

-- Subscription events log (for debugging/support)
CREATE TABLE subscription_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,  -- 'created', 'renewed', 'cancelled', 'expired'
  stripe_event_id TEXT,
  data TEXT,  -- JSON blob
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## Usage Limits Implementation

### Data Retention (Free Tier)

Free tier users have a 1-year rolling window. Entries older than 1 year are:
1. **Not deleted** - just hidden from UI
2. **Shown with upgrade prompt** - "Upgrade to access your full history"
3. **Included in exports** - users can always export all their data
4. **Restored on upgrade** - upgrading immediately restores access

```typescript
// server/utils/usageLimits.ts
export function getVisibleDateRange(user: User): { from: Date; to: Date } {
  if (!isCloudMode() || user.subscriptionTier === 'premium') {
    return { from: new Date(0), to: new Date() };
  }

  // Free tier: 1 year rolling window
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return { from: oneYearAgo, to: new Date() };
}

export function isEntryVisible(entry: Entry, user: User): boolean {
  const range = getVisibleDateRange(user);
  const entryDate = new Date(entry.timestamp);
  return entryDate >= range.from && entryDate <= range.to;
}
```

### Graceful Degradation

When approaching limits, show helpful (not annoying) prompts:

```typescript
// 11 months of data
"You have 1 month until older entries are archived. Upgrade to keep your full history."

// At limit
"Entries older than 1 year are archived. Upgrade anytime to restore access."
```

---

## Stripe Integration

### Environment Variables

```bash
# Required for billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...

# Optional
STRIPE_CUSTOMER_PORTAL_URL=https://billing.stripe.com/p/...
```

### Webhook Events

Handle these Stripe webhook events:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set tier to premium, record customer ID |
| `customer.subscription.updated` | Update tier/status |
| `customer.subscription.deleted` | Revert to free tier |
| `invoice.payment_failed` | Mark status as `past_due` |
| `invoice.paid` | Clear `past_due` status |

### API Endpoints

```
POST /api/billing/create-checkout    → Redirect to Stripe Checkout
POST /api/billing/create-portal      → Redirect to Customer Portal
POST /api/billing/webhook            → Handle Stripe webhooks
GET  /api/billing/status             → Current subscription status
```

---

## Email Verification

### Cloud Mode Behavior

1. **On signup**: Send verification email, account in `unverified` state
2. **Unverified accounts**: Can use app for 7 days, then prompted to verify
3. **Verification link**: Valid for 24 hours, can resend
4. **After verification**: Full access, can subscribe to premium

### Self-Hosted Behavior

Email verification is optional. Controlled by:
```bash
TADA_REQUIRE_EMAIL_VERIFICATION=false  # default for self-hosted
```

---

## tada.living Repository Structure

```
tada.living/
├── captain-definition
├── .env.example
├── .env.production          # gitignored, contains secrets
├── docker-compose.yml       # for local testing
├── README.md
└── scripts/
    └── backup.sh            # database backup script
```

### captain-definition

```json
{
  "schemaVersion": 2,
  "dockerfileLines": [
    "FROM ghcr.io/infantlab/tada:v0.4.0",
    "ENV TADA_CLOUD_MODE=true"
  ]
}
```

### Upgrade Process

1. Update version tag in `captain-definition`
2. Push to GitHub
3. CapRover auto-deploys (or manual trigger)
4. Database migrations run automatically on startup

---

## UI Changes for Cloud Mode

### Settings Page

Show subscription status:
```
┌─────────────────────────────────────┐
│ Subscription: Free                  │
│ Data access: Last 12 months         │
│ [Upgrade to Premium]                │
│                                     │
│ You have 847 entries                │
│ (23 archived, upgrade to access)    │
└─────────────────────────────────────┘
```

### Timeline

When viewing archived period:
```
┌─────────────────────────────────────┐
│ January 2025                        │
│ ─────────────────────────────────── │
│ 🔒 15 entries from this period      │
│    are archived.                    │
│    [Upgrade to view]                │
└─────────────────────────────────────┘
```

### Account Page (new)

For cloud mode, add `/account` page:
- Email verification status
- Subscription management
- Billing history (link to Stripe portal)
- Data export
- Delete account

---

## Implementation Order

1. **Database schema** - Add subscription fields to users table
2. **Cloud mode detection** - `isCloudMode()` utility
3. **Usage limits** - Date range filtering for free tier
4. **UI indicators** - Show tier status, archive notices
5. **Stripe integration** - Checkout, webhooks, portal
6. **Email verification** - Required flow for cloud mode
7. **Account page** - Subscription management UI

---

## Environment Variables Summary

### Cloud Mode (tada.living)

```bash
# Core
TADA_CLOUD_MODE=true
DATABASE_URL=libsql://...

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=infantologist@gmail.com
TADA_REQUIRE_EMAIL_VERIFICATION=true

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...

# AI Services (optional)
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
```

### Self-Hosted (defaults)

```bash
# Minimal required
DATABASE_URL=file:./data/db.sqlite

# Optional email (for password reset)
SMTP_HOST=...
SMTP_FROM=...

# Optional AI
GROQ_API_KEY=...
```

---

## Security Considerations

- Stripe webhook signature verification (required)
- Rate limiting on billing endpoints
- Email verification tokens expire after 24h
- Subscription status cached, refreshed on each request
- No PII stored beyond what's needed (email, stripe customer ID)

---

## Pricing Philosophy

- **Generous free tier**: 1 year is plenty for most users to evaluate
- **Simple pricing**: One paid tier, no feature gating
- **No dark patterns**: Easy to cancel, data always exportable
- **Sustainable**: Price covers infrastructure + modest margin

---

_Last updated: February 2026_
