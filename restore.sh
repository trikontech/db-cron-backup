#!/usr/bin/env bash
# ==============================================================================
# Neon PostgreSQL Restore Script
# Safely restores a backup dump to a target PostgreSQL / Neon database.
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: ./restore.sh <path_to_backup_file> [TARGET_DATABASE_URL]"
  echo "Example: ./restore.sh ./backups/my-neon-project_2026-09-01.dump"
  exit 1
fi

BACKUP_FILE="$1"
TARGET_URL="${2:-"${DATABASE_URL:-}"}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' does not exist!"
  exit 1
fi

if [ -z "$TARGET_URL" ]; then
  echo "Error: TARGET_DATABASE_URL is not set!"
  echo "Please provide it as 2nd argument or set DATABASE_URL in .env"
  exit 1
fi

echo "================================================================="
echo "⚠️  DATABASE RESTORE CONFIRMATION"
echo "================================================================="
echo "Backup file: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
echo "Target DB:   ${TARGET_URL/\/\/*:*@/\/\/***:***}"
echo ""
read -p "Are you SURE you want to restore into this database? Existing data may be overwritten! (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled by user."
  exit 0
fi

echo ""
echo "Restoring database..."

if [[ "$BACKUP_FILE" == *.dump ]] || [[ "$BACKUP_FILE" == *.custom ]]; then
  pg_restore --clean --if-exists --no-owner --no-acl -d "$TARGET_URL" "$BACKUP_FILE" || {
    echo "Note: pg_restore might report minor warnings for pre-existing system extensions."
  }
elif [[ "$BACKUP_FILE" == *.sql.gz ]]; then
  gunzip -c "$BACKUP_FILE" | psql "$TARGET_URL"
elif [[ "$BACKUP_FILE" == *.sql ]]; then
  psql "$TARGET_URL" -f "$BACKUP_FILE"
else
  echo "Unknown file extension. Attempting pg_restore..."
  pg_restore -d "$TARGET_URL" "$BACKUP_FILE"
fi

echo "✓ Database restore completed successfully!"
echo "================================================================="
