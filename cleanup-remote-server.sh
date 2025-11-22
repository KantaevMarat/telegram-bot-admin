#!/bin/bash
# Скрипт для очистки удаленного сервера
# 
# Варианты использования:
# 1. Передача через stdin (скрипт не нужен на сервере):
#    ssh root@79.174.93.115 'bash -s' < cleanup-remote-server.sh
#    или
#    cat cleanup-remote-server.sh | ssh root@79.174.93.115 'bash -s'
#
# 2. Если скрипт загружен на сервер:
#    ssh root@79.174.93.115 "bash /path/to/cleanup-remote-server.sh"

echo "=== Начало очистки удаленного сервера ==="

# 1. Очистка сборочных директорий
echo "Очистка сборочных директорий..."
BUILD_DIRS=(
    "/var/www/builds"
    "/var/www/dist"
    "/root/project/dist"
    "/root/project/builds"
    "/home/root/project/dist"
    "/opt/app/dist"
    "/opt/app/builds"
)

for dir in "${BUILD_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "Удаление содержимого: $dir"
        rm -rf "$dir"/*
        echo "✓ Очищено: $dir"
    else
        echo "Директория не найдена (пропуск): $dir"
    fi
done

# 2. Очистка Docker
echo ""
echo "=== Очистка Docker ==="

# Остановка всех контейнеров
echo "Остановка всех контейнеров..."
if [ $(docker ps -a -q | wc -l) -gt 0 ]; then
    docker stop $(docker ps -a -q) || true
    echo "✓ Контейнеры остановлены"
else
    echo "Нет запущенных контейнеров"
fi

# Удаление всех остановленных контейнеров
echo "Удаление всех контейнеров..."
if [ $(docker ps -a -q | wc -l) -gt 0 ]; then
    docker rm $(docker ps -a -q) || true
    echo "✓ Контейнеры удалены"
else
    echo "Нет контейнеров для удаления"
fi

# Полная очистка Docker системы
echo "Полная очистка Docker (образы, сети, тома)..."
docker system prune -a --volumes -f
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

