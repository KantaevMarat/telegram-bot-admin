#!/bin/bash

# Скрипт для настройки Telegram ботов

echo "🤖 Настройка Telegram ботов"
echo "======================================"
echo ""

# Токены ботов
CLIENT_BOT_TOKEN="8330680651:AAErG1_zzA0aX4_O7s-aaQlcCseLF7i8cIE"
ADMIN_BOT_TOKEN="8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro"

echo "📋 Проверка информации о ботах..."
echo ""

# Получаем информацию о клиентском боте
echo "1️⃣ Клиентский бот (для пользователей):"
CLIENT_INFO=$(curl -s "https://api.telegram.org/bot${CLIENT_BOT_TOKEN}/getMe")
CLIENT_USERNAME=$(echo $CLIENT_INFO | grep -o '"username":"[^"]*' | cut -d'"' -f4)

if [ -z "$CLIENT_USERNAME" ]; then
    echo "   ❌ Не удалось получить информацию о клиентском боте"
    echo "   Проверьте токен: $CLIENT_BOT_TOKEN"
else
    echo "   ✅ Username: @$CLIENT_USERNAME"
fi
echo ""

# Получаем информацию об админ-боте
echo "2️⃣ Админ-бот (для администраторов):"
ADMIN_INFO=$(curl -s "https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/getMe")
ADMIN_USERNAME=$(echo $ADMIN_INFO | grep -o '"username":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_USERNAME" ]; then
    echo "   ❌ Не удалось получить информацию об админ-боте"
    echo "   Проверьте токен: $ADMIN_BOT_TOKEN"
else
    echo "   ✅ Username: @$ADMIN_USERNAME"
fi
echo ""

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Создание файла .env..."
    cp env.example.txt .env
    
    # Заменяем токены
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$CLIENT_BOT_TOKEN|g" .env
        sed -i '' "s|ADMIN_BOT_TOKEN=.*|ADMIN_BOT_TOKEN=$ADMIN_BOT_TOKEN|g" .env
        
        if [ ! -z "$CLIENT_USERNAME" ]; then
            sed -i '' "s|TELEGRAM_BOT_USERNAME=.*|TELEGRAM_BOT_USERNAME=$CLIENT_USERNAME|g" .env
            sed -i '' "s|VITE_TELEGRAM_BOT_USERNAME=.*|VITE_TELEGRAM_BOT_USERNAME=$CLIENT_USERNAME|g" .env
        fi
    else
        # Linux
        sed -i "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$CLIENT_BOT_TOKEN|g" .env
        sed -i "s|ADMIN_BOT_TOKEN=.*|ADMIN_BOT_TOKEN=$ADMIN_BOT_TOKEN|g" .env
        
        if [ ! -z "$CLIENT_USERNAME" ]; then
            sed -i "s|TELEGRAM_BOT_USERNAME=.*|TELEGRAM_BOT_USERNAME=$CLIENT_USERNAME|g" .env
            sed -i "s|VITE_TELEGRAM_BOT_USERNAME=.*|VITE_TELEGRAM_BOT_USERNAME=$CLIENT_USERNAME|g" .env
        fi
    fi
    
    echo "   ✅ Файл .env создан и настроен"
else
    echo "⚠️  Файл .env уже существует, пропускаем..."
fi

echo ""
echo "======================================"
echo "✅ Настройка завершена!"
echo ""
echo "📱 Ваши боты:"
if [ ! -z "$CLIENT_USERNAME" ]; then
    echo "   Клиентский бот: https://t.me/$CLIENT_USERNAME"
fi
if [ ! -z "$ADMIN_USERNAME" ]; then
    echo "   Админ-бот: https://t.me/$ADMIN_USERNAME"
fi
echo ""
echo "🚀 Следующие шаги:"
echo "   1. Настройте домен в .env (TELEGRAM_WEB_APP_URL)"
echo "   2. Запустите проект: docker-compose up -d"
echo "   3. Добавьте администратора: npm run add-admin YOUR_TG_ID password"
echo ""

