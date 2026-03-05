# Ta-Da! Backup Strategy

## Overview

Ta-Da! uses SQLite for data storage. This document covers the backup strategy for production deployments.

## Production Backup (Hetzner/CapRover)

### Database Location

- **Volume:** `captain--tadata`
- **Path:** `/var/lib/docker/volumes/captain--tadata/_data/db.sqlite`
- **Size:** ~2-5 MB typical

### Automated Daily Backups

A cron job runs daily at 3 AM GMT:

```bash
0 3 * * * /root/backup-tada.sh >> /var/log/tada-backup.log 2>&1
```

**Backup script** (`/root/backup-tada.sh`):

```bash
#!/bin/bash
# Ta-Da! Database Backup Script
# Runs daily via cron, keeps 14 days of backups

set -e

BACKUP_DIR="/srv/backups/tada"
VOLUME_PATH="/var/lib/docker/volumes/captain--tadata/_data"
DATE=$(date +%Y-%m-%d_%H%M)
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"

# Copy with sqlite3 .backup for consistency (if available) or cp
if command -v sqlite3 &> /dev/null; then
    sqlite3 "$VOLUME_PATH/db.sqlite" ".backup $BACKUP_DIR/db-$DATE.sqlite"
else
    cp "$VOLUME_PATH/db.sqlite" "$BACKUP_DIR/db-$DATE.sqlite"
fi

# Compress
gzip -f "$BACKUP_DIR/db-$DATE.sqlite"

# Cleanup old backups
find "$BACKUP_DIR" -name "db-*.sqlite.gz" -mtime +$KEEP_DAYS -delete

echo "$(date): Backup completed - db-$DATE.sqlite.gz"
```

### Backup Locations

- **Local (Hetzner):** `/srv/backups/tada/`
- **Off-site (Block):** `/srv/backups/hetzner/tada/`
- **Retention:** 14 days
- **Format:** `db-YYYY-MM-DD_HHMM.sqlite.gz`

### Off-Site Sync

Backups automatically sync to Block server via rsync over Tailscale:
- SSH key: Hetzner root → Block caddy user
- Sync happens after each local backup
- Both locations have same 14-day retention

### Manual Backup

```bash
# SSH to server
ssh caspar-ghost

# Run backup manually
/root/backup-tada.sh

# Check recent backups
ls -la /srv/backups/tada/
```

### Restore Procedure

```bash
# Stop the container first (via CapRover or docker)
docker stop $(docker ps -q --filter name=tada-living)

# Decompress backup
gunzip -k /srv/backups/tada/db-2026-03-05_0300.sqlite.gz

# Replace database
cp /srv/backups/tada/db-2026-03-05_0300.sqlite \
   /var/lib/docker/volumes/captain--tadata/_data/db.sqlite

# Fix permissions
chown 1001:1001 /var/lib/docker/volumes/captain--tadata/_data/db.sqlite

# Restart container (via CapRover)
```

## Monitoring

OpenClaw heartbeat runs `/home/caddy/admin/check-tada-backup.sh` on Block to verify:
- Backup exists in off-site location
- Most recent backup is <48h old
- Alerts if stale or missing

## Future Improvements

- [x] ~~Off-site backup sync (Block server or S3)~~ ✅ Done
- [x] ~~Alerting on backup failures~~ ✅ Done (heartbeat monitoring)
- [ ] Pre-deploy backup hook in CapRover
- [ ] Backup verification/integrity checks
- [ ] Automated restore testing

## Related

- [DEPLOY_CAPROVER.md](./DEPLOY_CAPROVER.md) - CapRover deployment guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment overview
