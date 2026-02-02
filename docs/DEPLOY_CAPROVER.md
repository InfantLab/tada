# Deploying Ta-Da! to CapRover

> **📌 Note:** This is the original CapRover deployment guide. For the comprehensive, up-to-date deployment guide that includes REST API v1 setup, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

This document provides CapRover-specific deployment details.

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

1. **SSH into your server and create the data directory:**

   ```bash
   sudo mkdir -p /var/lib/caprover/appsdata/tadata
   sudo chown 1001:1001 /var/lib/caprover/appsdata/tadata
   sudo chmod 775 /var/lib/caprover/appsdata/tadata
   ```

   _(UID 1001 is the `nuxt` user in the container)_

2. **In CapRover Dashboard → Apps → tada → "App Configs" tab:**

   - Scroll to **"Persistent Directories"**
   - **Path in App:** `/data` ⚠️ **CRITICAL: Must be exactly `/data`, not `/app/data`**
   - **Host Path:** `/var/lib/caprover/appsdata/tadata`
   - Click **"+"** to add
   - Click **"Save & Update"**

   > ⚠️ **DATA LOSS WARNING:** The Dockerfile sets `DATABASE_URL=file:/data/db.sqlite`. 
   > If you change the "Path in App" or the Dockerfile DATABASE_URL, you will lose all data.
   > The paths must match exactly.

3. **Configure Container HTTP Port:**

   - Go to **"HTTP Settings"** tab
   - **Container HTTP Port:** `3000`
   - Click **"Save & Update"**

   ⚠️ **Critical:** Even though `captain-definition` specifies port 3000, you must set this manually in the UI if the app was created before the first deployment.

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

| Variable       | Default                    | Description                  |
| -------------- | -------------------------- | ---------------------------- |
| `NODE_ENV`     | `production`               | Should stay as production    |
| `DATABASE_URL` | `file:/app/data/db.sqlite` | SQLite database path         |
| `PORT`         | `3000`                     | Internal port (don't change) |

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

### 502 Bad Gateway

If the app builds successfully but shows 502:

1. **Check service status:**

   ```bash
   docker service ps srv-captain--tada --no-trunc
   ```

2. **If you see "invalid mount target":**

   - Verify persistent directory uses absolute path: `/app/data`
   - Check host directory exists and has correct permissions (see Step 2)

3. **If container is running but still 502:**

   - Verify **Container HTTP Port** is set to `3000` in HTTP Settings tab
   - Test from inside container:
     ```bash
     CID=$(docker ps -q -f name=srv-captain--tada)
     docker exec -it "$CID" sh -c "wget -qO- http://localhost:3000/api/health"
     ```
   - If health check succeeds but external access fails, the port configuration is missing

4. **Check nginx routing:**
   ```bash
   docker logs $(docker ps -q -f name=captain-nginx) --tail 200 | grep tada
   ```

### View Logs

```bash
# Container logs
docker service logs --tail 100 srv-captain--tada

# Or via CapRover Dashboard
# Apps → tada → "Deployment" tab → "View App Logs"
```

### Build Fails

1. Check logs for specific error
2. Test locally first:
   ```bash
   docker build -t tada:test .
   docker run -p 3000:3000 -v tada-data:/app/data tada:test
   ```

### Database Issues

- Ensure `/app/data` is in Persistent Directories with **absolute path**
- Verify host directory exists: `/var/lib/caprover/appsdata/tadata`
- Check permissions: should be owned by UID 1001
- SQLite file location: `/app/data/db.sqlite`

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
│  │  │   (Node 20 runtime)     │    │    │
│  │  │   Port 3000             │    │    │
│  │  └─────────────────────────┘    │    │
│  │              │                   │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │  /app/data/db.sqlite    │◄───┼────┼── /var/lib/caprover/appsdata/tadata
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
│                 │                        │
│         nginx reverse proxy              │
│         (HTTPS + port routing)           │
└─────────────────────────────────────────┘
                  │
                  ▼
         https://tada.yourdomain.com
```

---

_Last updated: January 2026_
