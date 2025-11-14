#!/bin/bash

# ============================================
# Status Check Script
# ============================================

echo "=================================================="
echo "🔍 System Status Check"
echo "=================================================="

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Функции
check_ok() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo ""
echo "📦 Docker Services Status:"
echo "---"
docker compose ps
echo ""

echo "🏥 Health Checks:"
echo "---"

# PostgreSQL
if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    check_ok "PostgreSQL is healthy"
else
    check_fail "PostgreSQL is not responding"
fi

# Redis
if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    check_ok "Redis is healthy"
else
    check_warn "Redis health check failed"
fi

# Backend
if curl -f -s http://localhost:3000/api/docs > /dev/null 2>&1; then
    check_ok "Backend is healthy"
else
    check_warn "Backend is not responding (might be starting)"
fi

# Frontend
if curl -f -s http://localhost:80 > /dev/null 2>&1; then
    check_ok "Frontend is healthy"
else
    check_warn "Frontend is not responding"
fi

# Nginx
if docker compose exec -T nginx nginx -t > /dev/null 2>&1; then
    check_ok "Nginx configuration is valid"
else
    check_fail "Nginx configuration has errors"
fi

echo ""
echo "💾 Disk Usage:"
echo "---"
df -h | grep -E '^/dev/|Filesystem'

echo ""
echo "🧠 Memory Usage:"
echo "---"
free -h

echo ""
echo "🐳 Docker Resources:"
echo "---"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

echo ""
echo "=================================================="
echo "Status check complete!"
echo "=================================================="

