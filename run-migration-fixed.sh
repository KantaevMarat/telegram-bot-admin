#!/bin/bash

# Скрипт для запуска миграции с правильными переменными окружения

echo "🔍 Проверка переменных окружения в контейнере..."
docker exec tg-backend env | grep DB_

echo ""
echo "📦 Копирование файла миграции в контейнер..."
docker cp backend/add-min-completion-time-column.js tg-backend:/app/add-min-completion-time-column.js

echo "🚀 Запуск миграции с переменными окружения из контейнера..."
docker exec tg-backend sh -c 'node /app/add-min-completion-time-column.js'

echo "✅ Миграция завершена!"

