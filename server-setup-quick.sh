#!/bin/bash

# Быстрая установка (без интерактивных вопросов)
# Использование: bash server-setup-quick.sh [GIT_REPO_URL]

set -e

REPO_URL=${1:-""}

echo "=========================================="
echo "  Быстрая установка окружения"
echo "=========================================="
echo ""

# Обновление системы
echo "Обновление системы..."
sudo apt-get update
sudo apt-get install -y curl git

# Установка Docker (если не установлен)
if ! command -v docker &> /dev/null; then
    echo "Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✓ Docker установлен"
else
    echo "✓ Docker уже установлен"
fi

# Создание директории проекта
PROJECTS_DIR="$HOME/projects"
mkdir -p "$PROJECTS_DIR"
cd "$PROJECTS_DIR"

# Клонирование репозитория (если указан URL)
if [ -n "$REPO_URL" ]; then
    if [ -d "tg-main" ]; then
        cd tg-main
        git pull
    else
        git clone "$REPO_URL" tg-main
        cd tg-main
    fi
else
    mkdir -p tg-main
    cd tg-main
    echo "⚠ Репозиторий не указан. Добавьте файлы проекта вручную."
fi

# Создание .env.production
if [ ! -f ".env.production" ] && [ -f "env.example.txt" ]; then
    cp env.example.txt .env.production
    echo "✓ .env.production создан (отредактируйте его!)"
fi

# Создание директорий
mkdir -p backend/uploads

echo ""
echo "✓ Установка завершена!"
echo ""
echo "Следующие шаги:"
echo "1. nano .env.production  # Настройте переменные окружения"
echo "2. docker compose -f docker-compose.production.yml up -d"
echo ""

