# Deploying Ta-Da! to CapRover

Guide for deploying Ta-Da! to a CapRover instance.

---

## Prerequisites

- A server with CapRover installed
- Domain pointing to your CapRover server (e.g., `*.onemonkey.org`)
- Access to the CapRover dashboard

---

## Step 1: Create the App in CapRover

1. Go to your CapRover dashboard (e.g., `https://captain.onemonkey.org`)
2. Click **"Apps"** → **"Create a New App"**
3. App name: `tada` (this will give you `tada.yourdomain.com`)
4. Check **"Has Persistent Data"** ✅ (critical for SQLite!)
5. Click **Create New App**

---

## Step 2: Configure Persistent Storage

The SQLite database must persist across container restarts.

1. Go to the app's **"App Configs"** tab
2. Scroll to **"Persistent Directories"**
3. Add path: `/app/data`
4. Click **"Save & Update"**

---

## Step 3: Deploy

### Option A: Deploy from GitHub (Recommended)

1. Go to **"Deployment"** tab
2. Select **"Method 3: Deploy from GitHub/GitLab/Bitbucket"**
3. Repository URL: `https://github.com/InfantLab/tada.git`
4. Branch: `main`
5. Click **"Save & Update"**
6. Click **"Force Build"**

For automatic deployments on push, set up a webhook:
- Copy the webhook URL from CapRover
- Add it to GitHub repo → Settings → Webhooks

### Option B: Deploy via CLI

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

### Option C: Deploy via tarball upload

```bash
# Create a tarball of the project
cd /path/to/tada
tar -cvf deploy.tar --exclude=node_modules --exclude=.git .

# Upload via CapRover dashboard → Deployment → Method 2
```

---

## Step 4: Enable HTTPS

1. Go to **"HTTP Settings"** tab
2. Click **"Enable HTTPS"**
3. Check **"Force HTTPS"** ✅
4. Wait for Let's Encrypt certificate to be issued

---

## Step 5: First Login

1. Visit `https://tada.yourdomain.com`
2. You'll see the registration page (no users exist yet)
3. Create your account — first user becomes admin
4. Start using Ta-Da!

---

## Environment Variables (Optional)

These can be set in **"App Configs"** → **"Environmental Variables"**:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Should stay as production |
| `DATABASE_URL` | `file:/app/data/db.sqlite` | SQLite database path |
| `PORT` | `3000` | Internal port (don't change) |

---

## Updating the App

### If using GitHub integration:
- Push to `main` branch
- CapRover will auto-rebuild (if webhook configured)
- Or click **"Force Build"** in dashboard

### If using CLI:
```bash
cd /path/to/tada
git pull
caprover deploy -a tada
```

---

## Troubleshooting

### View Logs
- CapRover Dashboard → App → **"Deployment"** tab → **"View App Logs"**

### Build Fails
1. Check logs for specific error
2. Test locally first:
   ```bash
   docker build -t tada:test .
   docker run -p 3000:3000 -v tada-data:/app/data tada:test
   ```

### Database Issues
- Ensure `/app/data` is in Persistent Directories
- Check that the volume wasn't accidentally deleted
- SQLite file location: `/app/data/db.sqlite`

### App Won't Start
- Check if port 3000 is exposed in Dockerfile ✅
- Check health endpoint: `curl https://tada.yourdomain.com/api/health`

### Reset Everything
If you need a fresh start:
1. Delete the app in CapRover
2. Recreate with the same steps above
3. Note: This deletes all data!

---

## Backup

To backup your data:

```bash
# SSH into your server
ssh user@onemonkey.org

# Find the Docker volume
docker volume ls | grep tada

# Copy the SQLite database
docker cp $(docker ps -qf "name=srv-captain--tada"):/app/data/db.sqlite ./tada-backup.sqlite
```

Or use the in-app JSON export: **Settings** → **Export Data**

---

## Architecture

```
┌─────────────────────────────────────────┐
│              CapRover                    │
│  ┌─────────────────────────────────┐    │
│  │     tada container               │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │   Nuxt 3 SSR Server     │    │    │
│  │  │   (Bun runtime)         │    │    │
│  │  │   Port 3000             │    │    │
│  │  └─────────────────────────┘    │    │
│  │              │                   │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │  /app/data/db.sqlite    │◄───┼────┼── Persistent Volume
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
│                 │                        │
│         nginx reverse proxy              │
│         (HTTPS termination)              │
└─────────────────────────────────────────┘
                  │
                  ▼
         https://tada.yourdomain.com
```

---

_Last updated: January 2026_
