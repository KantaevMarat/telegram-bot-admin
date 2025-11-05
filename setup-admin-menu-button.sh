#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Настройка Menu Button для админ бота...${NC}"

# Загружаем переменные окружения
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Проверяем наличие токена
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}❌ TELEGRAM_BOT_TOKEN не найден в .env${NC}"
    exit 1
fi

echo -e "${BLUE}📱 URL мини-приложения: https://app.marranasuete.ru${NC}"

# Устанавливаем Menu Button
echo -e "${BLUE}⚙️ Настраиваем Menu Button...${NC}"

response=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_button": {
      "type": "web_app",
      "text": "Админ панель",
      "web_app": {
        "url": "https://app.marranasuete.ru"
      }
    }
  }')

echo -e "${BLUE}📡 Ответ Telegram API:${NC}"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

# Проверяем результат
if echo "$response" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Menu Button успешно настроен!${NC}"
    echo -e "${GREEN}🎉 Теперь откройте бота @lrtelegram_mgbot и нажмите на кнопку меню (слева от поля ввода)${NC}"
else
    echo -e "${RED}❌ Ошибка при настройке Menu Button${NC}"
    exit 1
fi

# Получаем информацию о боте
echo -e "\n${BLUE}ℹ️ Информация о боте:${NC}"
bot_info=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe")
echo "$bot_info" | jq '.' 2>/dev/null || echo "$bot_info"

echo -e "\n${GREEN}✅ Готово!${NC}"

