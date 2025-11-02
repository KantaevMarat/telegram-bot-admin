#!/bin/bash

# ========================================
# Production Deployment Script
# ========================================

set -e  # Exit on error

echo "🚀 Starting production deployment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Error: .env.production file not found!${NC}"
    echo -e "${YELLOW}💡 Please create .env.production from .env.production.example${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '#' | awk '/=/ {print $1}')

echo "📋 Configuration loaded"

# Check required variables
REQUIRED_VARS=("DB_PASSWORD" "JWT_SECRET" "REDIS_PASSWORD" "MINIO_ROOT_PASSWORD")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" == "CHANGE_ME"* ]; then
        echo -e "${RED}❌ Error: $var is not set or using default value!${NC}"
        echo -e "${YELLOW}💡 Please set all required passwords in .env.production${NC}"
        exit 1
    fi
done

echo "✅ All required variables are set"

# Pull latest code (if using git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    git pull origin main || git pull origin master
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.production.yml down -v

# Build images
echo "🏗️  Building Docker images..."
docker compose -f docker-compose.production.yml build --no-cache

# Start database services first
echo "🗄️  Starting database services..."
docker compose -f docker-compose.production.yml up -d postgres redis minio

# Wait for databases to be healthy
echo "⏳ Waiting for databases to be ready..."
sleep 15

# Run migrations
echo "📊 Running database migrations..."
docker compose -f docker-compose.production.yml run --rm backend npm run migration:run

# Seed database (if needed - comment out if already seeded)
# echo "🌱 Seeding database..."
# docker compose -f docker-compose.production.yml run --rm backend npm run seed

# Start all services
echo "🚀 Starting all services..."
docker compose -f docker-compose.production.yml up -d

# Wait for services to start
sleep 10

# Check health
echo "🏥 Checking services health..."
docker compose -f docker-compose.production.yml ps

# Show logs
echo ""
echo "📋 Recent logs:"
docker compose -f docker-compose.production.yml logs --tail=20

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📱 Your application should be available at:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $API_URL"
echo ""
echo "📊 To view logs, run:"
echo "   docker compose -f docker-compose.production.yml logs -f"
echo ""
echo "🔧 To add yourself as admin, run:"
echo "   docker compose -f docker-compose.production.yml run --rm backend npm run cli:add-admin YOUR_TELEGRAM_ID"


