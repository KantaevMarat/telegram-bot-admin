#!/bin/bash
# Команды для прямого выполнения на сервере через SSH
# Использование: ssh root@79.174.93.115 "bash -c '$(cat cleanup-remote-direct.sh)'"

set -e

echo "=== Начало очистки удаленного сервера ==="

# 1. Очистка сборочных директорий
echo "Очистка сборочных директорий..."
for dir in /var/www/builds /var/www/dist /root/project/dist /root/project/builds /home/root/project/dist /opt/app/dist /opt/app/builds; do
    if [ -d "$dir" ]; then
        echo "Удаление содержимого: $dir"
        rm -rf "$dir"/*
        echo "✓ Очищено: $dir"
    fi
done

# 2. Очистка Docker
echo ""
echo "=== Очистка Docker ==="

# Остановка всех контейнеров
echo "Остановка всех контейнеров..."
CONTAINERS=$(docker ps -a -q 2>/dev/null || echo "")
if [ -n "$CONTAINERS" ]; then
    docker stop $CONTAINERS || true
    echo "✓ Контейнеры остановлены"
else
    echo "Нет запущенных контейнеров"
fi

# Удаление всех остановленных контейнеров
echo "Удаление всех контейнеров..."
if [ -n "$CONTAINERS" ]; then
    docker rm $CONTAINERS || true
    echo "✓ Контейнеры удалены"
else
    echo "Нет контейнеров для удаления"
fi

# Полная очистка Docker системы
echo "Полная очистка Docker (образы, сети, тома)..."
docker system prune -a --volumes -f 2>/dev/null || echo "Docker не установлен или недоступен"
echo "✓ Docker система очищена"

# 3. Очистка временных файлов
echo ""
echo "=== Очистка временных файлов ==="
find /tmp -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
find /var/tmp -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
echo "✓ Временные файлы очищены"

# 4. Показать использование диска
echo ""
echo "=== Использование диска ==="
df -h /

echo ""
echo "=== Очистка завершена ==="

