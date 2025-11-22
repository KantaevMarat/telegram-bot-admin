#!/bin/bash

# ============================================
# Enable SSL Configuration
# Переключение с HTTP на HTTPS после получения сертификатов
# ============================================

set -e

echo "=================================================="
echo "Switching to HTTPS Mode"
echo "=================================================="

# Проверка наличия сертификатов
API_DOMAIN="${API_DOMAIN:-api.marranasuete.ru}"
APP_DOMAIN="${APP_DOMAIN:-app.marranasuete.ru}"

if [ ! -d "nginx/certbot/conf/live/$API_DOMAIN" ]; then
    echo "❌ SSL certificate not found for $API_DOMAIN"
    echo "Please run ./setup-ssl.sh first"
    exit 1
fi

if [ ! -d "nginx/certbot/conf/live/$APP_DOMAIN" ]; then
    echo "❌ SSL certificate not found for $APP_DOMAIN"
    echo "Please run ./setup-ssl.sh first"
    exit 1
fi

echo "✅ SSL certificates found"

# Деактивация HTTP конфигов
echo ""
echo "📝 Disabling HTTP configs..."
if [ -f "nginx/conf.d/api-http.conf" ]; then
    mv nginx/conf.d/api-http.conf nginx/conf.d/api-http.conf.disabled
    echo "  ✅ API HTTP config disabled"
fi

if [ -f "nginx/conf.d/app-http.conf" ]; then
    mv nginx/conf.d/app-http.conf nginx/conf.d/app-http.conf.disabled
    echo "  ✅ APP HTTP config disabled"
fi

# Активация HTTPS конфигов
echo ""
echo "📝 Enabling HTTPS configs..."
if [ -f "nginx/conf.d/api.conf.ssl" ]; then
    mv nginx/conf.d/api.conf.ssl nginx/conf.d/api.conf
    echo "  ✅ API HTTPS config enabled"
elif [ ! -f "nginx/conf.d/api.conf" ]; then
    echo "  ⚠️  API HTTPS config not found"
fi

if [ -f "nginx/conf.d/app.conf.ssl" ]; then
    mv nginx/conf.d/app.conf.ssl nginx/conf.d/app.conf
    echo "  ✅ APP HTTPS config enabled"
elif [ ! -f "nginx/conf.d/app.conf" ]; then
    echo "  ⚠️  APP HTTPS config not found"
fi

# Тест конфигурации nginx
echo ""
echo "🔍 Testing nginx configuration..."
docker compose exec nginx nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Перезагрузка nginx
    echo ""
    echo "🔄 Reloading nginx..."
    docker compose exec nginx nginx -s reload
    echo "✅ Nginx reloaded successfully"
    
    echo ""
    echo "=================================================="
    echo "✅ HTTPS Mode Enabled!"
    echo "=================================================="
    echo ""
    echo "Your sites are now available at:"
    echo "  🌐 https://$API_DOMAIN"
    echo "  🌐 https://$APP_DOMAIN"
    echo ""
else
    echo "❌ Nginx configuration test failed"
    echo "Please check your nginx configuration"
    exit 1
fi

