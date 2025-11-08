#!/bin/bash

# Скрипт для запуска миграции на сервере

echo "📦 Копирование файла миграции в контейнер..."
docker cp backend/add-min-completion-time-column.js tg-backend:/app/add-min-completion-time-column.js

echo "🚀 Запуск миграции..."
docker exec tg-backend node /app/add-min-completion-time-column.js

echo "✅ Миграция завершена!"

