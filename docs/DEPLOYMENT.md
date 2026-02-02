# Ta-Da! REST API v1 - Deployment Guide

This guide covers deploying the Ta-Da! application (including the REST API v1) to production.

## Prerequisites

- **CapRover server** (recommended) OR Node.js 18+/Bun runtime
- Domain pointing to your server (e.g., `tada.yourdomain.com`)
- Access to CapRover dashboard OR SSH access to server

## Environment Variables

### For CapRover Deployments

Most environment variables are set automatically by the Dockerfile. You only need to configure these if you want to customize behavior:

In **CapRover Dashboard → Apps → tada → "App Configs" → "Environmental Variables"**:

| Variable                    | Default                  | Description                              | Required? |
| --------------------------- | ------------------------ | ---------------------------------------- | --------- |
| `DATABASE_URL`              | `file:/data/db.sqlite`   | Database path (don't change!)            | Auto-set  |
| `NODE_ENV`                  | `production`             | Environment mode                         | Auto-set  |
| `PORT`                      | `3000`                   | Internal port                            | Auto-set  |
| `NUXT_BETTER_AUTH_SECRET`   | _(none)_                 | Auth secret (generate with openssl)      | Optional  |
| `NUXT_BETTER_AUTH_URL`      | Auto-detected            | Base URL of app                          | Optional  |
| `CORS_ALLOWED_ORIGINS`      | _(none)_                 | Comma-separated allowed CORS origins     | Optional  |
| `RATE_LIMIT_STANDARD`       | `100`                    | Standard API rate limit (per minute)     | Optional  |
| `RATE_LIMIT_EXPORT`         | `10`                     | Export rate limit (per minute)           | Optional  |
| `RATE_LIMIT_PATTERN`        | `5`                      | Pattern detection rate limit (per min)   | Optional  |
| `RATE_LIMIT_WEBHOOK`        | `20`                     | Webhook rate limit (per minute)          | Optional  |

**⚠️ Important:**
- Do NOT change `DATABASE_URL` - it must match the persistent directory path
- `NUXT_BETTER_AUTH_SECRET` is auto-generated if not provided (recommended for production)
- `NUXT_BETTER_AUTH_URL` is auto-detected from the request host

### For Manual/Docker Deployments

Create a `.env` file in the `app/` directory:

```bash
# Database
DATABASE_URL=file:./data/db.sqlite

# Authentication (required)
NUXT_BETTER_AUTH_SECRET=your-secret-key-here  # Generate: openssl rand -base64 32
NUXT_BETTER_AUTH_URL=https://yourdomain.com

# Voice API Keys (optional - for voice transcription features)
NUXT_OPENAI_API_KEY=sk-...
NUXT_ANTHROPIC_API_KEY=sk-ant-...

# CORS (optional)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate Limiting (optional - defaults shown)
RATE_LIMIT_STANDARD=100
RATE_LIMIT_EXPORT=10
RATE_LIMIT_PATTERN=5
RATE_LIMIT_WEBHOOK=20
```

## Database Setup

### 1. Run Migrations

Apply all database migrations before starting the server:

```bash
cd app
bun run db:migrate
```

This will create all required tables:
- entries, rhythms, users
- api_keys, webhooks, insight_cache

### 2. Verify Schema

Check that all tables were created correctly:

```bash
bun run db:studio
```

This opens Drizzle Studio where you can inspect the database.

### 3. Create Indexes

The migrations include all necessary indexes, but verify them:

```sql
-- Key indexes for performance
CREATE INDEX IF NOT EXISTS idx_entries_user_time ON entries(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_entries_user_type_cat ON entries(user_id, type, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
```

## Building for Production

### 1. Install Dependencies

```bash
cd app
bun install --production
```

### 2. Build the Application

```bash
bun run build
```

This creates optimized production bundles in `.output/`.

### 3. Preview Locally

Test the production build locally:

```bash
bun run preview
```

## Deployment Options

### Option 1: CapRover (Recommended ⭐)

CapRover provides one-click deployment with automatic HTTPS, persistent storage, and easy updates.

#### Step 1: Create the App in CapRover

1. Go to your CapRover dashboard (e.g., `https://captain.yourdomain.com`)
2. Click **"Apps"** → **"Create a New App"**
3. App name: `tada` (this will give you `tada.yourdomain.com`)
4. **Check "Has Persistent Data"** ✅ (critical for SQLite database!)
5. Click **Create New App**

#### Step 2: Configure Persistent Storage

**⚠️ CRITICAL:** The SQLite database must persist across container restarts.

1. **SSH into your server and create the data directory:**

   ```bash
   sudo mkdir -p /var/lib/caprover/appsdata/tadata
   sudo chown 1001:1001 /var/lib/caprover/appsdata/tadata
   sudo chmod 775 /var/lib/caprover/appsdata/tadata
   ```

   _(UID 1001 is the user in the Nuxt container)_

2. **In CapRover Dashboard → Apps → tada → "App Configs" tab:**

   - Scroll to **"Persistent Directories"**
   - **Path in App:** `/data` ⚠️ **Must be exactly `/data`**
   - **Host Path:** `/var/lib/caprover/appsdata/tadata`
   - Click **"+"** to add
   - Click **"Save & Update"**

   > ⚠️ **DATA LOSS WARNING:** The Dockerfile sets `DATABASE_URL=file:/data/db.sqlite`.
   > If you change the "Path in App", you will lose all data.

3. **Configure Container HTTP Port:**

   - Go to **"HTTP Settings"** tab
   - **Container HTTP Port:** `3000`
   - Click **"Save & Update"**

#### Step 3: Deploy

**Method A: Deploy from GitHub (Recommended)**

1. Go to **"Deployment"** tab
2. Select **"Method 3: Deploy from GitHub/GitLab/Bitbucket"**
3. Repository URL: `https://github.com/YourUsername/tada.git`
4. Branch: `main`
5. Click **"Save & Update"**
6. Click **"Force Build"**

For automatic deployments on push, set up a webhook:
- Copy the webhook URL from CapRover
- Add it to GitHub repo → Settings → Webhooks

**Method B: Deploy via CLI**

```bash
# Install CapRover CLI
npm install -g caprover

# Login to your server
caprover login
# Server: captain.yourdomain.com
# Password: your-captain-password

# Deploy from the repo root
cd /path/to/tada
caprover deploy -a tada
```

#### Step 4: Enable HTTPS

1. Go to **"HTTP Settings"** tab
2. Click **"Enable HTTPS"**
3. Check **"Force HTTPS"** ✅
4. Wait for Let's Encrypt certificate to be issued (~30 seconds)

#### Step 5: Run Database Migrations

**⚠️ IMPORTANT:** After first deployment, you must run migrations:

```bash
# SSH into your server
ssh user@yourdomain.com

# Get the container ID
CID=$(docker ps -q -f name=srv-captain--tada)

# Run migrations inside the container
docker exec -it "$CID" sh -c "cd /app && bun run db:migrate"

# Verify tables were created
docker exec -it "$CID" sh -c "ls -la /data/"
# You should see db.sqlite and db.sqlite-journal
```

Or use the CapRover web terminal:
1. Go to Apps → tada → "Deployment" tab
2. Click "Connect to Web Terminal"
3. Run:
```bash
cd /app && bun run db:migrate
```

#### Step 6: Test the API

```bash
# Health check
curl https://tada.yourdomain.com/api/v1/health

# Should return:
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected"
}
```

#### Step 7: First Login

1. Visit `https://tada.yourdomain.com`
2. You'll see the registration page (no users exist yet)
3. Create your account — first user becomes admin
4. Start using Ta-Da!

#### Updating the App

**If using GitHub integration:**
- Push to `main` branch
- CapRover will auto-rebuild (if webhook configured)
- Or click **"Force Build"** in dashboard

**If using CLI:**
```bash
cd /path/to/tada
git pull
caprover deploy -a tada
```

#### CapRover Troubleshooting

**502 Bad Gateway:**
- Verify Container HTTP Port is `3000` in HTTP Settings
- Check persistent directory is configured correctly
- View logs: Apps → tada → Deployment → View App Logs

**Database not persisting:**
- Ensure "Path in App" is exactly `/data`
- Verify host directory exists with correct permissions (UID 1001)
- Check DATABASE_URL in Dockerfile matches persistent path

**View Logs:**
```bash
# Via CapRover Dashboard
Apps → tada → "Deployment" tab → "View App Logs"

# Or via CLI
docker service logs --tail 100 srv-captain--tada
```

---

### Option 2: Docker (Manual)

## REST API v1 Setup (Post-Deployment)

After deploying the application, follow these steps to start using the REST API v1.

### 1. Verify API Health

Test that the REST API is running:

```bash
curl https://tada.yourdomain.com/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-02-02T12:00:00Z",
  "database": "connected",
  "cache": { "size": 0, "maxSize": 10000 }
}
```

### 2. Create First User

1. Visit `https://tada.yourdomain.com`
2. Click **Register** to create your account
3. First user automatically becomes admin

### 3. Generate API Key

**Option A: Via Web Interface (Easiest)**

1. Log into Ta-Da! at `https://tada.yourdomain.com`
2. Go to **Settings** → **API Keys**
3. Click **"Create New API Key"**
4. Give it a name (e.g., "My Integration")
5. Select permissions:
   - `entries:read` - Read entries and rhythms
   - `entries:write` - Create, update, delete entries
   - `rhythms:read` - Read rhythm statistics
   - `export:read` - Export data
6. Click **Create**
7. **⚠️ Copy the API key now - it won't be shown again!**

**Option B: Via Database (Development Only)**

If you need to create an API key before the web interface is ready:

```bash
# SSH into CapRover server or Docker container
docker exec -it $(docker ps -q -f name=srv-captain--tada) sh

# Run a script to create the key
cd /app
node -e "
import('./server/utils/api-key.js').then(async ({ createApiKey }) => {
  const result = await createApiKey(
    'your-user-id-here',
    'Development Key',
    ['entries:read', 'entries:write', 'rhythms:read']
  );
  console.log('API Key:', result.key);
  console.log('⚠️  Save this key - it won\\'t be shown again!');
});
"
```

### 4. Test API Access

```bash
# Set your API key
export TADA_API_KEY="tada_key_..."

# Test authentication
curl -H "Authorization: Bearer $TADA_API_KEY" \
  https://tada.yourdomain.com/api/v1/entries

# Create a test entry
curl -X POST https://tada.yourdomain.com/api/v1/entries \
  -H "Authorization: Bearer $TADA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "moment",
    "name": "First API Entry",
    "category": "test",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'

# Get rhythms
curl -H "Authorization: Bearer $TADA_API_KEY" \
  https://tada.yourdomain.com/api/v1/rhythms
```

### 5. API Documentation

Full API documentation with all 24 endpoints:
- See [`API-SPECIFICATION.md`](./API-SPECIFICATION.md) for complete reference
- All endpoints are at: `https://tada.yourdomain.com/api/v1/*`
- All requests require `Authorization: Bearer <api_key>` header
- Rate limits: 100 req/min (standard), 10 req/min (export), 5 req/min (patterns)

## Maintenance

### Cache Cleanup

Run periodically to remove expired cache entries:

```javascript
// scripts/cleanup-cache.js
import { cleanupExpiredCache } from "~/server/utils/cache-cleanup";

const result = await cleanupExpiredCache();
console.log(`Deleted ${result.deleted} expired cache entries`);
```

Schedule with cron:
```bash
# Every hour
0 * * * * cd /var/www/tada && bun run scripts/cleanup-cache.js
```

### Database Backup

Regular backups are critical. For CapRover deployments:

**Method 1: Via Docker (Recommended)**

```bash
# SSH into your CapRover server
ssh user@yourdomain.com

# Create backup directory
mkdir -p ~/tada-backups

# Copy database from container
docker cp $(docker ps -qf "name=srv-captain--tada"):/data/db.sqlite \
  ~/tada-backups/db-$(date +%Y%m%d-%H%M%S).sqlite

# Download to your local machine
scp user@yourdomain.com:~/tada-backups/db-*.sqlite ./backups/
```

**Method 2: Via Host Directory**

```bash
# SSH into your CapRover server
ssh user@yourdomain.com

# Backup from persistent storage location
sudo cp /var/lib/caprover/appsdata/tadata/db.sqlite \
  ~/tada-backups/db-$(date +%Y%m%d-%H%M%S).sqlite
```

**Method 3: Via API Export**

Use the built-in export feature:
1. Log into Ta-Da!
2. Go to **Settings** → **Export Data**
3. Choose **JSON** format
4. Download the export file

**Automated Backups (Cron)**

Add to your server's crontab:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * docker cp $(docker ps -qf "name=srv-captain--tada"):/data/db.sqlite ~/tada-backups/db-$(date +\%Y\%m\%d).sqlite && find ~/tada-backups -name "*.sqlite" -mtime +30 -delete
```

This keeps 30 days of backups.

### Monitoring

1. **Health Checks**: Monitor `/api/v1/health` endpoint
2. **Rate Limits**: Watch for 429 errors
3. **Webhooks**: Check failed webhook deliveries
4. **Database**: Monitor query performance

### Log Rotation

Configure log rotation for production logs:

```bash
# /etc/logrotate.d/tada-api
/var/log/tada-api/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

## Security Checklist

### For CapRover Deployments

- [ ] HTTPS enabled in CapRover (HTTP Settings → Enable HTTPS)
- [ ] Force HTTPS enabled (redirects all HTTP to HTTPS)
- [ ] Let's Encrypt certificate issued and valid
- [ ] Persistent data directory has correct permissions (UID 1001)
- [ ] Database file (`/data/db.sqlite`) not publicly accessible
- [ ] Environment variables configured in CapRover (not in git)
- [ ] CORS configured if needed (`CORS_ALLOWED_ORIGINS`)
- [ ] Rate limiting enabled (uses defaults or custom values)
- [ ] API keys hashed with bcrypt (automatic)
- [ ] Webhooks using HMAC-SHA256 signatures (automatic)
- [ ] Private IPs blocked for webhooks (automatic)
- [ ] Database backups configured (see Maintenance section)
- [ ] Health check monitored (`/api/v1/health`)
- [ ] View logs regularly for errors

### For All Deployments

- [ ] First user account created (becomes admin)
- [ ] Test API access with generated API key
- [ ] Verify rate limiting works (try exceeding limits)
- [ ] Test webhook delivery if using webhooks
- [ ] Confirm pattern detection caching works
- [ ] Export/import tested with sample data
- [ ] All migrations applied successfully
- [ ] Database indexes created

## Troubleshooting

### API Returns 503 (Service Unavailable)

Check database connection:
```bash
sqlite3 ./data/db.sqlite "SELECT 1;"
```

### Rate Limit Errors (429)

Increase limits in environment variables or wait for reset.

### Webhook Delivery Failures

Check webhook logs and verify:
- Target URL is HTTPS
- Not a private IP
- Server responds within 30 seconds

### Slow Pattern Detection

Pattern detection caches results for 1 hour. First request may be slow with large datasets.

## Performance Optimization

### Database Indexes

Already included in migrations, but verify:
```sql
EXPLAIN QUERY PLAN
SELECT * FROM entries
WHERE user_id = ? AND timestamp > ?;
```

### Connection Pooling

For PostgreSQL in production:
```bash
DATABASE_URL="postgres://...?pool_timeout=60&connection_limit=10"
```

### Caching

Pattern detection results are cached for 1 hour automatically.

## Scaling Considerations

### Horizontal Scaling

- Use Redis for rate limiting instead of in-memory cache
- Use PostgreSQL instead of SQLite
- Deploy behind load balancer
- Use queue system (Bull/BullMQ) for webhooks

### Vertical Scaling

- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
- Optimize database queries
- Add database read replicas

## CapRover Architecture

When deployed to CapRover, the application runs in this architecture:

```
┌─────────────────────────────────────────────────┐
│              CapRover Server                     │
│  ┌─────────────────────────────────────────┐    │
│  │     tada container (srv-captain--tada)   │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │   Nuxt 3 SSR Server             │    │    │
│  │  │   + REST API v1                 │    │    │
│  │  │   (Node 20 / Bun runtime)       │    │    │
│  │  │   Port 3000                     │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │              │                           │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │  /data/db.sqlite                │◄───┼────┼── /var/lib/caprover/appsdata/tadata
│  │  │  (SQLite database)              │    │    │
│  │  │  + api_keys, webhooks, cache    │    │    │
│  │  └─────────────────────────────────┘    │    │
│  └─────────────────────────────────────────┘    │
│                 │                                │
│         CapRover nginx reverse proxy             │
│         (HTTPS, port routing, SSL)               │
└─────────────────────────────────────────────────┘
                  │
                  ▼
         https://tada.yourdomain.com

         Available endpoints:
         - / (web app)
         - /api/v1/* (REST API)
         - /api/v1/health (monitoring)
```

**Key Points:**
- Container runs Nuxt 3 with built-in REST API v1
- SQLite database persists at `/data/db.sqlite` (mapped to host)
- CapRover handles HTTPS (Let's Encrypt) automatically
- nginx routes traffic to container port 3000
- Database file survives container restarts via persistent volume

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/tada/issues
- CapRover Deployment: See `/docs/DEPLOY_CAPROVER.md`
- REST API Reference: See `/docs/tada-api/API-SPECIFICATION.md`

## Version History

- **v1.0.0** (2026-02-02): Initial REST API release
  - All 7 user stories implemented
  - 220 tasks completed
  - Production-ready

## Next Steps

After deployment:
1. Monitor health endpoint
2. Set up automated backups
3. Configure monitoring alerts
4. Test all API endpoints
5. Create API documentation for consumers
6. Set up CI/CD pipeline for updates
