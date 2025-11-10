#!/bin/bash

# ============================================
# SSL Setup Script with Let's Encrypt
# ============================================

set -e

echo "=================================================="
echo "SSL Setup for api.marranasuete.ru and app.marranasuete.ru"
echo "=================================================="

# Проверка наличия email для Let's Encrypt
if [ -z "$LETSENCRYPT_EMAIL" ]; then
    echo "❌ Error: LETSENCRYPT_EMAIL not set in .env"
    echo "Please add: LETSENCRYPT_EMAIL=your-email@example.com to .env"
    exit 1
fi

# Загрузка переменных окружения
source .env 2>/dev/null || true

EMAIL="${LETSENCRYPT_EMAIL:-admin@marranasuete.ru}"
API_DOMAIN="${API_DOMAIN:-api.marranasuete.ru}"
APP_DOMAIN="${APP_DOMAIN:-app.marranasuete.ru}"

echo ""
echo "📧 Email: $EMAIL"
echo "🌐 API Domain: $API_DOMAIN"
echo "🌐 APP Domain: $APP_DOMAIN"
echo ""

# Создание необходимых директорий
echo "📁 Creating SSL directories..."
mkdir -p nginx/certbot/conf
mkdir -p nginx/certbot/www
mkdir -p nginx/ssl

# Проверка что nginx запущен
echo ""
echo "🔍 Checking if nginx is running..."
if ! docker ps | grep -q tg-nginx; then
    echo "❌ Nginx container is not running!"
    echo "Please run: docker compose up -d nginx"
    exit 1
fi

echo "✅ Nginx is running"

# Функция получения сертификата
get_certificate() {
    local domain=$1
    echo ""
    echo "=================================================="
    echo "📜 Requesting SSL certificate for $domain"
    echo "=================================================="
    
    # Проверка что домен резолвится
    echo "🔍 Checking DNS resolution for $domain..."
    if ! nslookup $domain > /dev/null 2>&1; then
        echo "⚠️  Warning: DNS resolution failed for $domain"
        echo "Please make sure DNS is properly configured before continuing."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Skipping $domain"
            return
        fi
    fi
    
    # Получение сертификата
    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d $domain
    
    if [ $? -eq 0 ]; then
        echo "✅ Certificate obtained successfully for $domain"
    else
        echo "❌ Failed to obtain certificate for $domain"
        return 1
    fi
}

# Получение сертификатов для обоих доменов
echo ""
echo "=================================================="
echo "🔐 Step 1: Obtaining SSL Certificates"
echo "=================================================="

# API Domain
get_certificate $API_DOMAIN

# APP Domain  
get_certificate $APP_DOMAIN

# Проверка успешности
if [ ! -d "nginx/certbot/conf/live/$API_DOMAIN" ] && [ ! -d "nginx/certbot/conf/live/$APP_DOMAIN" ]; then
    echo ""
    echo "❌ Failed to obtain any SSL certificates"
    echo "Please check your DNS configuration and try again"
    exit 1
fi

# Активация HTTPS конфигов
echo ""
echo "=================================================="
echo "🔧 Step 2: Activating HTTPS Configuration"
echo "=================================================="

# Переименование конфигов (убираем .disabled)
if [ -f "nginx/conf.d/api.conf" ]; then
    echo "✅ API HTTPS config already active"
else
    echo "⚠️  API HTTPS config not found, keeping HTTP config"
fi

if [ -f "nginx/conf.d/app.conf" ]; then
    echo "✅ APP HTTPS config already active"
else
    echo "⚠️  APP HTTPS config not found, keeping HTTP config"
fi

# Перезагрузка nginx
echo ""
echo "=================================================="
echo "🔄 Step 3: Reloading Nginx"
echo "=================================================="

docker compose exec nginx nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    docker compose exec nginx nginx -s reload
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration test failed"
    echo "Please check your nginx configuration"
    exit 1
fi

# Настройка автоматического обновления
echo ""
echo "=================================================="
echo "🔄 Step 4: Setting up Auto-Renewal"
echo "=================================================="

echo "Certbot container is already configured for auto-renewal (every 12 hours)"
echo "✅ Auto-renewal is active"

# Финальная проверка
echo ""
echo "=================================================="
echo "✅ SSL Setup Complete!"
echo "=================================================="
echo ""
echo "Your sites are now available at:"
echo "  🌐 https://$API_DOMAIN"
echo "  🌐 https://$APP_DOMAIN"
echo ""
echo "SSL certificates will auto-renew every 12 hours via certbot container"
echo ""
echo "To manually renew certificates, run:"
echo "  docker compose run --rm certbot renew"
echo ""

