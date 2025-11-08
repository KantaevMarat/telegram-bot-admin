#!/bin/bash

# Скрипт для добавления колонки min_completion_time напрямую через SQL

echo "🔍 Поиск контейнера с PostgreSQL..."

# Ищем контейнер с PostgreSQL
POSTGRES_CONTAINER=$(docker ps | grep -E "postgres|db" | grep -v grep | awk '{print $1}' | head -n 1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ Контейнер с PostgreSQL не найден!"
    echo "Доступные контейнеры:"
    docker ps
    exit 1
fi

echo "✅ Найден контейнер: $POSTGRES_CONTAINER"

# Пробуем разные варианты подключения
echo "🚀 Попытка выполнить миграцию..."

# Вариант 1: Стандартный PostgreSQL
docker exec -i $POSTGRES_CONTAINER psql -U admin -d telegram_bot 2>/dev/null << 'EOF' && echo "✅ Миграция выполнена успешно!" && exit 0
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_completion_time INTEGER DEFAULT 0;
SELECT 'Column min_completion_time added successfully!' as result;
EOF

# Вариант 2: PostgreSQL с другим пользователем (postgres)
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d telegram_bot 2>/dev/null << 'EOF' && echo "✅ Миграция выполнена успешно!" && exit 0
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_completion_time INTEGER DEFAULT 0;
SELECT 'Column min_completion_time added successfully!' as result;
EOF

# Вариант 3: Если нужно указать хост
docker exec -i $POSTGRES_CONTAINER psql -h localhost -U admin -d telegram_bot 2>/dev/null << 'EOF' && echo "✅ Миграция выполнена успешно!" && exit 0
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_completion_time INTEGER DEFAULT 0;
SELECT 'Column min_completion_time added successfully!' as result;
EOF

echo "❌ Не удалось выполнить миграцию автоматически"
echo "Попробуйте вручную:"
echo "docker exec -it $POSTGRES_CONTAINER psql -U admin -d telegram_bot"
echo "Затем выполните: ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_completion_time INTEGER DEFAULT 0;"

