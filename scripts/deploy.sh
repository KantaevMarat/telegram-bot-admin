#!/bin/bash

# ============================================
# Production Deployment Script
# ============================================

set -e

echo "=================================================="
echo "🚀 Telegram Mini App - Production Deployment"
echo "=================================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода ошибок
error() {
    echo -e "${RED}❌ Error: $1${NC}"
    exit 1
}

# Функция для вывода успеха
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Функция для вывода предупреждений
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Проверка наличия .env файла
if [ ! -f ".env" ]; then
    warning ".env file not found!"
    if [ -f "env.production" ]; then
        echo "📋 Copying env.production to .env..."
        cp env.production .env
        success ".env file created"
    else
        error ".env file is required. Please create it from env.production"
    fi
fi

# Загрузка переменных окружения
source .env

echo ""
echo "🔍 Pre-deployment checks..."
echo ""

# Проверка Docker
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi
success "Docker is installed"

# Проверка Docker Compose
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi
success "Docker Compose is installed"

# Проверка портов 80 и 443
echo ""
echo "🔍 Checking if ports 80 and 443 are available..."
if ss -tuln | grep -q ':80 '; then
    warning "Port 80 is already in use"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    success "Port 80 is available"
fi

if ss -tuln | grep -q ':443 '; then
    warning "Port 443 is already in use"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    success "Port 443 is available"
fi

# Создание необходимых директорий
echo ""
echo "📁 Creating necessary directories..."
mkdir -p nginx/certbot/conf
mkdir -p nginx/certbot/www
mkdir -p nginx/ssl
mkdir -p backend/uploads
mkdir -p logs
success "Directories created"

# Остановка старых контейнеров
echo ""
echo "🛑 Stopping old containers..."
docker compose down || true
success "Old containers stopped"

# Сборка и запуск контейнеров
echo ""
echo "🔨 Building and starting containers..."
docker compose up -d --build

# Ожидание запуска контейнеров
echo ""
echo "⏳ Waiting for containers to be healthy..."
sleep 10

# Проверка статуса контейнеров
echo ""
echo "🔍 Checking container status..."
docker compose ps

# Проверка здоровья сервисов
echo ""
echo "🏥 Checking service health..."

# Проверка PostgreSQL
if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    success "PostgreSQL is healthy"
else
    error "PostgreSQL is not healthy"
fi

# Проверка Redis
if docker compose exec -T redis redis-cli -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
    success "Redis is healthy"
else
    warning "Redis health check failed (might need password)"
fi

# Проверка Backend
sleep 5
if docker compose exec -T backend wget --spider -q http://localhost:3000/api/docs; then
    success "Backend is healthy"
else
    warning "Backend might still be starting up"
fi

# Запуск миграций
echo ""
echo "📊 Running database migrations..."
docker compose exec -T backend npm run migration:run || warning "Migration failed or no migrations to run"

# Вывод финальной информации
echo ""
echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
echo ""
echo "Services are running:"
docker compose ps
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Setup SSL certificates (if not done yet):"
echo "   ./setup-ssl.sh"
echo ""
echo "2. Check logs:"
echo "   docker compose logs -f"
echo ""
echo "3. Access services:"
echo "   Backend API: http://$API_DOMAIN (or https:// after SSL setup)"
echo "   Frontend:    http://$APP_DOMAIN (or https:// after SSL setup)"
echo "   API Docs:    http://$API_DOMAIN/api/docs"
echo ""
echo "4. Install systemd service for auto-start on boot:"
echo "   sudo ./scripts/install-systemd-service.sh"
echo ""

