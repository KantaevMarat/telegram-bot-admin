#!/bin/bash

# ========================================
# Backup Script for Production
# ========================================

set -e

BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📦 Starting backup process..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

cd "$PROJECT_DIR"

# Backup PostgreSQL
echo "💾 Backing up PostgreSQL database..."
docker compose -f docker compose.production.yml exec -T postgres pg_dump -U telegram_bot_user telegram_bot_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
echo -e "${GREEN}✅ Database backup completed${NC}"

# Backup MinIO data
echo "💾 Backing up MinIO storage..."
docker compose -f docker compose.production.yml exec -T minio tar czf - /data > "$BACKUP_DIR/minio_$DATE.tar.gz"
echo -e "${GREEN}✅ MinIO backup completed${NC}"

# Backup .env.production (without passwords for security)
echo "💾 Backing up configuration..."
cat .env.production | grep -v "PASSWORD\|SECRET" > "$BACKUP_DIR/env_$DATE.txt"
echo -e "${GREEN}✅ Configuration backup completed${NC}"

# Calculate backup sizes
DB_SIZE=$(du -h "$BACKUP_DIR/db_$DATE.sql.gz" | cut -f1)
MINIO_SIZE=$(du -h "$BACKUP_DIR/minio_$DATE.tar.gz" | cut -f1)

echo ""
echo "📊 Backup Summary:"
echo "   Date: $DATE"
echo "   Database: $DB_SIZE"
echo "   Storage: $MINIO_SIZE"
echo "   Location: $BACKUP_DIR"

# Delete old backups (older than 30 days)
echo ""
echo "🧹 Cleaning up old backups (>30 days)..."
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.txt" -mtime +30 -delete

# Count remaining backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✅ Backup completed! Total backups: $BACKUP_COUNT${NC}"


