#!/bin/bash

# ============================================
# Update Script for Production
# ============================================

set -e

echo "=================================================="
echo "🔄 Updating Telegram Mini App"
echo "=================================================="

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Pull latest changes from git
echo ""
echo "📥 Pulling latest changes from git..."
git pull
success "Git pull complete"

# Backup .env if it exists
if [ -f ".env" ]; then
    echo ""
    echo "💾 Backing up .env file..."
    cp .env .env.backup
    success ".env backed up to .env.backup"
fi

# Rebuild and restart containers
echo ""
echo "🔨 Rebuilding and restarting containers..."
docker compose down
docker compose up -d --build

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start..."
sleep 15

# Run migrations
echo ""
echo "📊 Running database migrations..."
docker compose exec -T backend npm run migration:run || warning "No new migrations to run"

# Show container status
echo ""
echo "📊 Container Status:"
docker compose ps

echo ""
echo "=================================================="
echo "✅ Update Complete!"
echo "=================================================="
echo ""
echo "To view logs, run:"
echo "  docker compose logs -f"
echo ""

