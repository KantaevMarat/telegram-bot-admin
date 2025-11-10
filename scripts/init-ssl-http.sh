#!/bin/bash

# ============================================
# Initial SSL Setup (HTTP Mode)
# Используется для первоначального запуска БЕЗ SSL
# ============================================

set -e

echo "=================================================="
echo "Initializing HTTP Mode (Before SSL)"
echo "=================================================="

# Создание необходимых директорий
mkdir -p nginx/certbot/conf
mkdir -p nginx/certbot/www
mkdir -p nginx/ssl

# Переименование HTTPS конфигов (деактивация)
echo "📝 Disabling HTTPS configs..."
if [ -f "nginx/conf.d/api.conf" ]; then
    mv nginx/conf.d/api.conf nginx/conf.d/api.conf.ssl
    echo "  ✅ API HTTPS config disabled"
fi

if [ -f "nginx/conf.d/app.conf" ]; then
    mv nginx/conf.d/app.conf nginx/conf.d/app.conf.ssl
    echo "  ✅ APP HTTPS config disabled"
fi

# Активация HTTP конфигов
echo "📝 Enabling HTTP configs..."
if [ -f "nginx/conf.d/api-http.conf.disabled" ]; then
    mv nginx/conf.d/api-http.conf.disabled nginx/conf.d/api-http.conf
    echo "  ✅ API HTTP config enabled"
fi

if [ -f "nginx/conf.d/app-http.conf.disabled" ]; then
    mv nginx/conf.d/app-http.conf.disabled nginx/conf.d/app-http.conf
    echo "  ✅ APP HTTP config enabled"
fi

echo ""
echo "✅ HTTP mode initialized"
echo ""
echo "Next steps:"
echo "  1. Start services: docker compose up -d"
echo "  2. Wait for services to be healthy"
echo "  3. Run SSL setup: ./setup-ssl.sh"
echo ""

