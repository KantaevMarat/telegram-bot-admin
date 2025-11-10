#!/bin/bash

# Скрипт установки всего необходимого на сервере
# Использование: bash server-setup.sh

set -e  # Остановка при ошибке

echo "=========================================="
echo "  Установка окружения для Telegram App"
echo "=========================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция проверки команды
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 установлен"
        return 0
    else
        echo -e "${RED}✗${NC} $1 не установлен"
        return 1
    fi
}

# Функция установки Docker
install_docker() {
    echo -e "${YELLOW}Установка Docker...${NC}"
    
    # Обновление пакетов
    sudo apt-get update
    
    # Установка зависимостей
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Добавление GPG ключа Docker
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Добавление репозитория Docker
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Установка Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Добавление пользователя в группу docker
    sudo usermod -aG docker $USER
    
    echo -e "${GREEN}✓ Docker установлен${NC}"
    echo -e "${YELLOW}⚠ Выйдите и войдите снова, чтобы использовать Docker без sudo${NC}"
}

# Функция установки Git
install_git() {
    echo -e "${YELLOW}Установка Git...${NC}"
    sudo apt-get update
    sudo apt-get install -y git
    echo -e "${GREEN}✓ Git установлен${NC}"
}

# Проверка и установка необходимых компонентов
echo "Проверка установленных компонентов..."
echo ""

# Проверка Docker
if ! check_command docker; then
    install_docker
else
    DOCKER_VERSION=$(docker --version)
    echo -e "  Версия: $DOCKER_VERSION"
fi

# Проверка Docker Compose
if ! check_command docker compose; then
    echo -e "${YELLOW}Docker Compose не найден, но должен быть установлен с Docker${NC}"
else
    COMPOSE_VERSION=$(docker compose version)
    echo -e "  Версия: $COMPOSE_VERSION"
fi

# Проверка Git
if ! check_command git; then
    install_git
else
    GIT_VERSION=$(git --version)
    echo -e "  Версия: $GIT_VERSION"
fi

echo ""
echo "=========================================="
echo "  Настройка Git"
echo "=========================================="
echo ""

# Настройка Git (если не настроен)
if [ -z "$(git config --global user.name)" ]; then
    echo "Настройка Git..."
    read -p "Введите ваше имя для Git: " GIT_NAME
    read -p "Введите ваш email для Git: " GIT_EMAIL
    git config --global user.name "$GIT_NAME"
    git config --global user.email "$GIT_EMAIL"
    echo -e "${GREEN}✓ Git настроен${NC}"
else
    echo -e "${GREEN}✓ Git уже настроен${NC}"
    echo "  Имя: $(git config --global user.name)"
    echo "  Email: $(git config --global user.email)"
fi

echo ""
echo "=========================================="
echo "  Клонирование репозитория"
echo "=========================================="
echo ""

# Создание директории для проектов
PROJECTS_DIR="$HOME/projects"
mkdir -p "$PROJECTS_DIR"
cd "$PROJECTS_DIR"

# Проверка, существует ли уже директория проекта
if [ -d "tg-main" ]; then
    echo -e "${YELLOW}Директория tg-main уже существует${NC}"
    read -p "Обновить репозиторий? (y/n): " UPDATE_REPO
    if [ "$UPDATE_REPO" = "y" ]; then
        cd tg-main
        git pull
        echo -e "${GREEN}✓ Репозиторий обновлен${NC}"
    else
        echo "Пропускаем обновление"
    fi
else
    read -p "Введите URL репозитория Git (или нажмите Enter для пропуска): " REPO_URL
    if [ -n "$REPO_URL" ]; then
        git clone "$REPO_URL" tg-main
        echo -e "${GREEN}✓ Репозиторий клонирован${NC}"
    else
        echo -e "${YELLOW}Создана директория tg-main. Добавьте файлы проекта вручную.${NC}"
        mkdir -p tg-main
    fi
fi

cd tg-main

echo ""
echo "=========================================="
echo "  Настройка окружения"
echo "=========================================="
echo ""

# Создание .env файла если его нет
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}Создание .env.production из примера...${NC}"
    if [ -f "env.example.txt" ]; then
        cp env.example.txt .env.production
        echo -e "${GREEN}✓ Файл .env.production создан${NC}"
        echo -e "${YELLOW}⚠ ОБЯЗАТЕЛЬНО отредактируйте .env.production перед запуском!${NC}"
    else
        echo -e "${RED}✗ Файл env.example.txt не найден${NC}"
    fi
else
    echo -e "${GREEN}✓ Файл .env.production уже существует${NC}"
fi

echo ""
echo "=========================================="
echo "  Создание необходимых директорий"
echo "=========================================="
echo ""

# Создание директорий для uploads
mkdir -p backend/uploads
echo -e "${GREEN}✓ Директории созданы${NC}"

echo ""
echo "=========================================="
echo "  Установка завершена!"
echo "=========================================="
echo ""
echo "Следующие шаги:"
echo "1. Отредактируйте .env.production файл:"
echo "   nano .env.production"
echo ""
echo "2. Запустите проект:"
echo "   docker compose -f docker-compose.production.yml up -d"
echo ""
echo "3. Проверьте статус:"
echo "   docker compose -f docker-compose.production.yml ps"
echo ""
echo "4. Просмотрите логи:"
echo "   docker compose -f docker-compose.production.yml logs -f"
echo ""
echo -e "${YELLOW}⚠ Не забудьте настроить файрвол для портов 3000, 8080, 9000, 9001${NC}"
echo ""

