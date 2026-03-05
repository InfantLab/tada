#!/bin/bash
#
# Import old meditation sittings into the live CapRover database.
#
# This script:
#   1. Downloads the live DB from CapRover
#   2. Creates a backup
#   3. Runs the import (dry-run first, then apply)
#   4. Uploads the modified DB back
#
# Usage (run from host terminal, NOT inside dev container):
#   ./scripts/live-import.sh pull        # Download live DB
#   ./scripts/live-import.sh dry-run     # Dry-run against downloaded DB
#   ./scripts/live-import.sh apply       # Apply import to downloaded DB
#   ./scripts/live-import.sh review      # Review flagged entries
#   ./scripts/live-import.sh apply-review # Apply review decisions
#   ./scripts/live-import.sh push        # Upload modified DB back to live
#
# Config
SSH_HOST="caspar-ghost"
CAPROVER_APP="tada-living"
CONTAINER_NAME="srv-captain--${CAPROVER_APP}"
CONTAINER_DB_PATH="/data/db.sqlite"          # Path inside the Docker container
LOCAL_LIVE_DB="./data/live-db.sqlite"
LOCAL_BACKUP_DB="./data/live-db-backup-$(date +%Y%m%d-%H%M%S).sqlite"

# Find the running container ID on the remote host
get_container_id() {
  local cid
  cid=$(ssh "${SSH_HOST}" "docker ps -qf name=${CONTAINER_NAME}" 2>/dev/null)
  if [ -z "$cid" ]; then
    echo "Error: Container '${CONTAINER_NAME}' not found or not running on ${SSH_HOST}" >&2
    exit 1
  fi
  echo "$cid"
}

set -e

case "${1:-help}" in
  pull)
    echo "=== Downloading live database ==="
    echo "From: ${SSH_HOST} → container ${CONTAINER_NAME}:${CONTAINER_DB_PATH}"
    echo "To:   ${LOCAL_LIVE_DB}"
    echo ""

    # Ensure local data directory exists
    mkdir -p "$(dirname "${LOCAL_LIVE_DB}")"

    CID=$(get_container_id)
    echo "Found container: ${CID:0:12}"

    # Copy DB from container to a temp location on the remote host, then SCP to local
    REMOTE_TMP="/tmp/tada-live-export-$$.sqlite"
    echo "Extracting from container..."
    ssh "${SSH_HOST}" "docker cp ${CID}:${CONTAINER_DB_PATH} ${REMOTE_TMP}"

    # Also grab WAL and SHM files if they exist inside the container
    ssh "${SSH_HOST}" "docker cp ${CID}:${CONTAINER_DB_PATH}-wal ${REMOTE_TMP}-wal 2>/dev/null || true"
    ssh "${SSH_HOST}" "docker cp ${CID}:${CONTAINER_DB_PATH}-shm ${REMOTE_TMP}-shm 2>/dev/null || true"

    echo "Downloading..."
    scp "${SSH_HOST}:${REMOTE_TMP}" "${LOCAL_LIVE_DB}"
    scp "${SSH_HOST}:${REMOTE_TMP}-wal" "${LOCAL_LIVE_DB}-wal" 2>/dev/null || true
    scp "${SSH_HOST}:${REMOTE_TMP}-shm" "${LOCAL_LIVE_DB}-shm" 2>/dev/null || true

    # Clean up remote temp files
    ssh "${SSH_HOST}" "rm -f ${REMOTE_TMP} ${REMOTE_TMP}-wal ${REMOTE_TMP}-shm"

    # Checkpoint WAL into main DB file
    if [ -f "${LOCAL_LIVE_DB}-wal" ]; then
      echo "Checkpointing WAL file..."
      sqlite3 "${LOCAL_LIVE_DB}" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || \
        bun -e "import{Database}from'bun:sqlite';const d=new Database('${LOCAL_LIVE_DB}');d.exec('PRAGMA wal_checkpoint(TRUNCATE)');d.close();console.log('WAL checkpointed')"
      rm -f "${LOCAL_LIVE_DB}-wal" "${LOCAL_LIVE_DB}-shm"
    fi

    ls -lh "${LOCAL_LIVE_DB}"
    echo ""
    echo "Done. Quick stats:"
    bun -e "
      import{Database}from'bun:sqlite';
      const db=new Database('${LOCAL_LIVE_DB}',{readonly:true});
      const t=db.query(\"SELECT COUNT(*) as c FROM entries WHERE deleted_at IS NULL\").get();
      const m=db.query(\"SELECT COUNT(*) as c FROM entries WHERE category='mindfulness' AND deleted_at IS NULL\").get();
      console.log('Total entries:', t.c);
      console.log('Mindfulness entries:', m.c);
      db.close();
    "
    ;;

  dry-run)
    if [ ! -f "${LOCAL_LIVE_DB}" ]; then
      echo "Error: ${LOCAL_LIVE_DB} not found. Run './scripts/live-import.sh pull' first."
      exit 1
    fi
    echo "=== Dry-run against live DB copy ==="
    bun scripts/import-old-sittings.ts --db "${LOCAL_LIVE_DB}"
    ;;

  apply)
    if [ ! -f "${LOCAL_LIVE_DB}" ]; then
      echo "Error: ${LOCAL_LIVE_DB} not found. Run './scripts/live-import.sh pull' first."
      exit 1
    fi
    echo "=== Creating backup ==="
    cp "${LOCAL_LIVE_DB}" "${LOCAL_BACKUP_DB}"
    echo "Backup: ${LOCAL_BACKUP_DB}"
    echo ""
    echo "=== Applying import to live DB copy ==="
    bun scripts/import-old-sittings.ts --db "${LOCAL_LIVE_DB}" --apply
    ;;

  review)
    bun scripts/review-entries.ts
    ;;

  apply-review)
    if [ ! -f "${LOCAL_LIVE_DB}" ]; then
      echo "Error: ${LOCAL_LIVE_DB} not found."
      exit 1
    fi
    echo "=== Applying review decisions to live DB copy ==="
    bun scripts/import-old-sittings.ts --db "${LOCAL_LIVE_DB}" --apply-review
    ;;

  api-dry-run)
    if [ ! -f "${LOCAL_LIVE_DB}" ]; then
      echo "Error: ${LOCAL_LIVE_DB} not found. Run './scripts/live-import.sh pull' first."
      exit 1
    fi
    echo "=== API Import Dry-Run ==="
    bun scripts/api-import.ts --db "${LOCAL_LIVE_DB}"
    ;;

  api-apply)
    if [ ! -f "${LOCAL_LIVE_DB}" ]; then
      echo "Error: ${LOCAL_LIVE_DB} not found. Run './scripts/live-import.sh pull' first."
      exit 1
    fi
    if [ -z "${TADA_API_KEY}" ]; then
      echo "Error: TADA_API_KEY environment variable not set."
      echo "Generate an API key at https://tada.living/settings and export it:"
      echo "  export TADA_API_KEY=tada_key_..."
      exit 1
    fi
    echo "=== API Import — LIVE MODE ==="
    echo "This will make real API calls to ${TADA_API_URL:-https://tada.living}"
    echo ""
    read -p "Are you sure? (yes/no) " confirm
    if [ "$confirm" != "yes" ]; then
      echo "Aborted."
      exit 0
    fi
    bun scripts/api-import.ts --db "${LOCAL_LIVE_DB}" --apply
    ;;

  api-resume)
    if [ ! -f "${LOCAL_LIVE_DB}" ]; then
      echo "Error: ${LOCAL_LIVE_DB} not found."
      exit 1
    fi
    if [ -z "${TADA_API_KEY}" ]; then
      echo "Error: TADA_API_KEY environment variable not set."
      exit 1
    fi
    echo "=== API Import — RESUMING ==="
    bun scripts/api-import.ts --db "${LOCAL_LIVE_DB}" --apply --resume
    ;;

  push)
    if [ ! -f "${LOCAL_LIVE_DB}" ]; then
      echo "Error: ${LOCAL_LIVE_DB} not found."
      exit 1
    fi

    echo "=== Uploading modified database to live ==="
    echo "WARNING: This will replace the live database!"
    echo "Target: ${SSH_HOST} → container ${CONTAINER_NAME}:${CONTAINER_DB_PATH}"
    echo ""
    read -p "Are you sure? (yes/no) " confirm
    if [ "$confirm" != "yes" ]; then
      echo "Aborted."
      exit 0
    fi

    CID=$(get_container_id)
    echo "Found container: ${CID:0:12}"

    echo ""
    echo "Creating remote backup..."
    BACKUP_TMP="/tmp/tada-live-backup-$(date +%Y%m%d-%H%M%S).sqlite"
    ssh "${SSH_HOST}" "docker cp ${CID}:${CONTAINER_DB_PATH} ${BACKUP_TMP}"
    echo "Backup saved on remote at: ${BACKUP_TMP}"

    echo "Uploading to remote host..."
    REMOTE_TMP="/tmp/tada-live-import-$$.sqlite"
    scp "${LOCAL_LIVE_DB}" "${SSH_HOST}:${REMOTE_TMP}"

    echo "Copying into container..."
    ssh "${SSH_HOST}" "docker cp ${REMOTE_TMP} ${CID}:${CONTAINER_DB_PATH}"

    echo "Setting ownership (nuxt user, uid 1001)..."
    ssh "${SSH_HOST}" "docker exec ${CID} chown 1001:1001 ${CONTAINER_DB_PATH} 2>/dev/null || true"

    # Clean up remote temp file
    ssh "${SSH_HOST}" "rm -f ${REMOTE_TMP}"

    echo ""
    echo "Done! The app should pick up the new database automatically."
    echo "If not, restart it via CapRover dashboard or CLI."
    ;;

  *)
    echo "Usage: ./scripts/live-import.sh <command>"
    echo ""
    echo "Commands (recommended API workflow):"
    echo "  pull          Download live DB from CapRover (read-only snapshot)"
    echo "  dry-run       Classify entries against downloaded DB"
    echo "  apply         Apply import to LOCAL copy + generate review file"
    echo "  review        Review flagged entries interactively"
    echo "  api-dry-run   Preview API actions (what would be sent to live)"
    echo "  api-apply     Execute import via live API (safe with concurrent users)"
    echo "  api-resume    Resume an interrupted api-apply run"
    echo ""
    echo "Legacy commands (replaces DB file — unsafe with concurrent users):"
    echo "  apply-review  Apply review decisions to local DB copy"
    echo "  push          Upload modified DB back to live"
    echo ""
    echo "Recommended workflow:"
    echo "  1. ./scripts/live-import.sh pull"
    echo "  2. ./scripts/live-import.sh dry-run"
    echo "  3. ./scripts/live-import.sh apply"
    echo "  4. ./scripts/live-import.sh review"
    echo "  5. ./scripts/live-import.sh api-dry-run"
    echo "  6. export TADA_API_KEY=tada_key_..."
    echo "  7. ./scripts/live-import.sh api-apply"
    ;;
esac
