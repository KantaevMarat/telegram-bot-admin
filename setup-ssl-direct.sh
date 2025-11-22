#!/bin/bash

# ============================================
# Direct SSL Setup Script
# ============================================

set -e

cd /root/tg-main

EMAIL="admin@marranasuete.ru"
API_DOMAIN="api.marranasuete.ru"
APP_DOMAIN="app.marranasuete.ru"

echo "=================================================="
echo "SSL Setup for $API_DOMAIN and $APP_DOMAIN"
echo "=================================================="

# Остановка nginx
echo ""
echo "⏸️  Остановка nginx..."
docker compose stop nginx

# Очистка старых данных certbot
echo ""
echo "🧹 Очистка старых данных certbot..."
rm -rf nginx/certbot/conf/*
mkdir -p nginx/certbot/conf

# Получение сертификатов через standalone
echo ""
echo "📜 Получение сертификата для $API_DOMAIN..."
docker run --rm \
    -v $(pwd)/nginx/certbot/conf:/etc/letsencrypt \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d $API_DOMAIN

echo ""
echo "📜 Получение сертификата для $APP_DOMAIN..."
docker run --rm \
    -v $(pwd)/nginx/certbot/conf:/etc/letsencrypt \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d $APP_DOMAIN

# Проверка сертификатов
echo ""
echo "=== Проверка полученных сертификатов ==="
if [ -d "nginx/certbot/conf/live/$API_DOMAIN" ] && [ -d "nginx/certbot/conf/live/$APP_DOMAIN" ]; then
    echo "✅ Сертификаты успешно получены!"
    ls -la nginx/certbot/conf/live/$API_DOMAIN/
    ls -la nginx/certbot/conf/live/$APP_DOMAIN/
    
    # Восстановление HTTPS конфигурации
    echo ""
    echo "🔄 Восстановление HTTPS конфигурации..."
    git checkout nginx/conf.d/api.conf nginx/conf.d/app.conf 2>&1 || echo "Используем текущую конфигурацию"
    
    # Запуск nginx
    echo ""
    echo "🚀 Запуск nginx с SSL..."
    docker compose up -d nginx
    
    echo ""
    echo "⏳ Ожидание 5 секунд..."
    sleep 5
    
    # Проверка nginx
    echo ""
    echo "=== Проверка nginx ==="
    docker compose exec -T nginx nginx -t
    
    echo ""
    echo "=================================================="
    echo "✅ SSL Setup Complete!"
    echo "=================================================="
    echo ""
    echo "Your sites are now available at:"
    echo "  🌐 https://$API_DOMAIN"
    echo "  🌐 https://$APP_DOMAIN"
    echo ""
else
    echo "❌ Не удалось получить сертификаты"
    echo "Проверьте логи выше"
    exit 1
fi

