#!/usr/bin/env bash
# ==============================================================================
# Verify Neon Backup Dump Integrity
# ==============================================================================

set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "Usage: ./verify-backup.sh <path_to_backup_file>"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "Error: File '$FILE' does not exist."
  exit 1
fi

echo "Inspecting backup: $FILE"
echo "Size: $(du -h "$FILE" | cut -f1)"
echo "MD5:  $(md5sum "$FILE" 2>/dev/null || md5 -q "$FILE" 2>/dev/null || echo "N/A")"
echo ""

if [[ "$FILE" == *.dump ]]; then
  echo "Listing Table of Contents via pg_restore -l:"
  pg_restore -l "$FILE" | head -n 25
  echo "... (truncated)"
  echo "✓ Valid PostgreSQL Custom Dump!"
elif [[ "$FILE" == *.sql.gz ]]; then
  echo "Checking gzip integrity:"
  gzip -t "$FILE" && echo "✓ Gzip archive is healthy and uncorrupted!"
elif [[ "$FILE" == *.sql ]]; then
  echo "Previewing SQL header:"
  head -n 20 "$FILE"
fi
