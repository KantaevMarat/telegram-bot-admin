# 🔧 Исправление проблемы с миграцией БД

## Проблема:
```
Error: connect ECONNREFUSED ::1:5432
```

Это означает, что скрипт не может подключиться к базе данных, потому что:
1. БД находится на другом хосте (не localhost)
2. Переменные окружения не передаются правильно

## Решение:

### Вариант 1: Использовать переменные окружения из контейнера

```bash
cd ~/telegram-bot-admin

# 1. Проверьте переменные окружения в контейнере
docker exec tg-backend env | grep DB_

# 2. Скопируйте файл миграции
docker cp backend/add-min-completion-time-column.js tg-backend:/app/add-min-completion-time-column.js

# 3. Запустите миграцию (переменные окружения должны быть доступны в контейнере)
docker exec tg-backend node /app/add-min-completion-time-column.js
```

### Вариант 2: Запустить через временный контейнер с .env файлом

```bash
cd ~/telegram-bot-admin/backend

# Запустите миграцию через временный контейнер Node.js
# (использует переменные из .env файла)
docker run --rm --network tg-network \
  --env-file .env \
  -v $(pwd):/app \
  -w /app \
  node:18 \
  sh -c "npm install pg && node add-min-completion-time-column.js"
```

### Вариант 3: Выполнить SQL напрямую через psql

```bash
# Подключитесь к БД через контейнер
docker exec -it tg-backend psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Или если БД в отдельном контейнере:
docker exec -it postgres psql -U admin -d telegram_bot

# В psql выполните:
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_completion_time INTEGER DEFAULT 0;

# Проверьте:
\d tasks
```

### Вариант 4: Найти имя контейнера с БД и использовать его

```bash
# Найдите контейнер с PostgreSQL
docker ps | grep postgres

# Подключитесь к нему
docker exec -it <postgres-container-name> psql -U admin -d telegram_bot

# Выполните SQL:
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_completion_time INTEGER DEFAULT 0;
```

## Рекомендуемый способ:

Сначала проверьте, какой хост используется для БД:

```bash
# Проверьте переменные окружения
docker exec tg-backend env | grep DB_HOST

# Если DB_HOST пустой или localhost, возможно БД в docker-compose сети
# Найдите контейнер с БД:
docker ps | grep -E "postgres|db|database"

# Если БД в docker-compose, используйте имя сервиса как хост
# Например, если сервис называется "db", используйте:
docker exec tg-backend sh -c 'DB_HOST=db node /app/add-min-completion-time-column.js'
```

## Самый простой способ - SQL напрямую:

```bash
# Найдите контейнер с PostgreSQL
POSTGRES_CONTAINER=$(docker ps | grep postgres | awk '{print $1}')

# Выполните SQL
docker exec -i $POSTGRES_CONTAINER psql -U admin -d telegram_bot << EOF
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_completion_time INTEGER DEFAULT 0;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'min_completion_time';
EOF
```

