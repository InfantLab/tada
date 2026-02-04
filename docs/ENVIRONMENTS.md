# Tada Environment Configuration

This document explains how to configure Tada for different deployment scenarios.

---

## Environment Overview

Tada supports three deployment modes:

| Mode            | Use Case                          | Cloud Features |
| --------------- | --------------------------------- | -------------- |
| **Development** | Local development                 | Off            |
| **Self-Hosted** | Your own server (Docker/CapRover) | Optional       |
| **Cloud**       | Multi-tenant SaaS deployment      | On             |

---

## 1. Development (Localhost)

For local development on your machine or in a dev container.

### Database Path

All npm/bun scripts set `DATABASE_URL` explicitly in `package.json`:

```json
{
  "dev": "DATABASE_URL=file:../data/db.sqlite nuxt dev",
  "db:migrate": "DATABASE_URL=file:../data/db.sqlite drizzle-kit migrate",
  "db:studio": "DATABASE_URL=file:../data/db.sqlite drizzle-kit studio"
}
```

**Why `../data/` instead of `./data/`?**

The database is stored OUTSIDE the `app/` directory to avoid Vite/Nuxt file watcher conflicts. See [DATABASE_LOCATION_MIGRATION.md](DATABASE_LOCATION_MIGRATION.md) for details.

### File Layout

```
/your-workspace/
├── data/
│   └── db.sqlite           # Development database (outside app/)
├── app/
│   ├── .env                # API keys, feature flags (NOT database path!)
│   ├── package.json        # Scripts set DATABASE_URL
│   └── ...
```

### Configuration

**`.env`** (in `app/` directory):

```bash
# NOTE: Do NOT set DATABASE_URL here for development!
# package.json scripts handle database path.

# Voice features
VOICE_ENABLED=true
VOICE_FREE_LIMIT=50
GROQ_API_KEY=your_key_here
```

### Running

```bash
cd app
bun install
bun run dev          # Starts dev server at localhost:3000
bun run db:migrate   # Applies migrations to dev database
```

---

## 2. Self-Hosted (Production)

For deploying Tada on your own server using Docker or CapRover.

### Database Path

The `Dockerfile` sets the database path:

```dockerfile
ENV DATABASE_URL=file:/data/db.sqlite
```

You must mount a persistent volume to `/data/` for data to survive container restarts.

### Docker Compose Example

```yaml
services:
  tada:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - tada-data:/data
    environment:
      - APP_URL=https://tada.example.com
      # Optionally enable voice features:
      # - GROQ_API_KEY=your_key

volumes:
  tada-data:
```

### CapRover Deployment

1. Create app with **persistent storage enabled**
2. Set persistent directory: Path in App = `/data`
3. Deploy via `caprover deploy` or GitHub integration
4. Migrations run automatically on container start

### Environment Variables

| Variable        | Required    | Default                 | Purpose                     |
| --------------- | ----------- | ----------------------- | --------------------------- |
| `DATABASE_URL`  | No          | `file:/data/db.sqlite`  | Database path               |
| `NODE_ENV`      | No          | `production`            | Environment mode            |
| `APP_URL`       | Recommended | `http://localhost:3000` | Public URL for emails/links |
| `VOICE_ENABLED` | No          | `true`                  | Enable voice input          |
| `GROQ_API_KEY`  | No          | -                       | Voice transcription API     |

---

## 3. Cloud Mode (SaaS)

For running Tada as a multi-tenant cloud service with billing and usage limits.

### Enabling Cloud Mode

Cloud mode activates when either:

- `TADA_CLOUD_MODE=true`, OR
- `STRIPE_SECRET_KEY` is configured

### Cloud-Specific Features

When cloud mode is enabled:

- Cookie consent banner shown
- Email verification required (with grace period)
- Usage limits enforced (free tier: 1-year data retention)
- Stripe billing integration available
- Subscription UI in account settings

### Environment Variables (Cloud)

| Variable                          | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| `TADA_CLOUD_MODE`                 | Enable cloud features (`true`/`false`)         |
| `STRIPE_SECRET_KEY`               | Stripe API key for billing                     |
| `STRIPE_WEBHOOK_SECRET`           | Stripe webhook signature verification          |
| `TADA_REQUIRE_EMAIL_VERIFICATION` | Require verified email (`true`/`false`)        |
| `TADA_VERIFICATION_GRACE_DAYS`    | Days before verification required (default: 7) |
| `TADA_FREE_RETENTION_DAYS`        | Data retention for free tier (default: 365)    |
| `SMTP_HOST`, `SMTP_PORT`, etc.    | Email configuration for verification           |

---

## Database Path Summary

| Context              | DATABASE_URL             | Notes                         |
| -------------------- | ------------------------ | ----------------------------- |
| `bun run dev`        | `file:../data/db.sqlite` | Set by package.json           |
| `bun run db:migrate` | `file:../data/db.sqlite` | Set by package.json           |
| Docker container     | `file:/data/db.sqlite`   | Set in Dockerfile             |
| CapRover             | `file:/data/db.sqlite`   | Different host volume per app |

**Key principle**: Development uses `../data/` (outside app/ to avoid watchers). Production uses `/data/` (container volume mount).

---

## Troubleshooting

### "no such column" errors

Migrations need to be applied:

```bash
cd app
bun run db:migrate
```

### Wrong database location

Check the startup log for:

```
Database path: file:../data/db.sqlite (dev: true)
```

If it shows `./data/db.sqlite` (without `..`), you have an outdated config.

### drizzle-kit uses wrong database

Always use the package.json script:

```bash
# ✅ Correct
bun run db:migrate

# ❌ Wrong - won't use correct DATABASE_URL
npx drizzle-kit migrate
```

---

## Related Documentation

- [DATABASE_LOCATION_MIGRATION.md](DATABASE_LOCATION_MIGRATION.md) - Why database is outside app/
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [DEPLOY_CAPROVER.md](DEPLOY_CAPROVER.md) - CapRover-specific instructions

---

_Last updated: February 2026_
