# 🐳 Настройка с Docker

## ✅ У вас уже запущено:

```bash
docker ps
# tg-redis       - Redis (порт 6379)
# tg-postgres    - PostgreSQL (порт 5432)
# tg-minio       - MinIO (порт 9000-9001)
# tg-backend     - Backend (порт 3000)
# tg-frontend    - Frontend (порт 5173)
```

---

## 🎯 Два варианта работы:

### Вариант 1: Всё в Docker (рекомендуется для production)

**Плюсы:**
- ✅ Всё изолировано
- ✅ Одинаковое окружение на всех машинах
- ✅ Проще деплой

**Запуск:**
```bash
docker-compose up -d

# Логи
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Перезапуск после изменений:**
```bash
# Пересобрать backend
docker-compose up -d --build backend

# Пересобрать frontend
docker-compose up -d --build frontend
```

---

### Вариант 2: Backend и Frontend локально + Redis/Postgres в Docker ⭐

**Плюсы:**
- ✅ Быстрая разработка (hot reload)
- ✅ Легче отладка
- ✅ Не нужно пересобирать Docker образы

**Это то, что вам нужно сейчас!**

#### Шаг 1: Остановите backend и frontend в Docker

```bash
docker-compose stop backend frontend
```

Оставьте только сервисы:
```bash
docker ps
# Должны остаться:
# tg-redis
# tg-postgres
# tg-minio
```

#### Шаг 2: Запустите backend локально

```bash
cd backend
npm run start:dev
```

**Ожидаемые логи:**
```
✅ Redis connected successfully
✅ Subscribed to sync:* events
🌐 WebSocket Gateway initialized
✅ BotService subscribed to sync events
🚀 Application is running on: http://localhost:3000
```

#### Шаг 3: Запустите frontend локально

```bash
cd frontend
npm run dev
```

**Откройте:** http://localhost:5173

---

## 🔍 Проверка подключения к Redis

### Из хоста (ваш компьютер)

```bash
# Через Docker
docker exec tg-redis redis-cli ping
# Ответ: PONG

# Проверка данных
docker exec tg-redis redis-cli KEYS "*"

# Мониторинг событий
docker exec tg-redis redis-cli PSUBSCRIBE "sync:*"
```

### Из backend

В логах backend при запуске должно быть:
```
Connecting to Redis at localhost:6379...
✅ Redis connected successfully
✅ Subscribed to sync:* events
```

---

## ⚙️ Переменные окружения

### Backend `.env`

```env
# Database (Docker)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=tg_app
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Redis (Docker)
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO (Docker)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=telegram-media

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:3000
```

---

## 🚀 Быстрый запуск (рекомендуется)

```bash
# Terminal 1: Сервисы (если не запущены)
docker-compose up -d redis postgres minio

# Terminal 2: Backend
cd backend
npm run start:dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

**Откройте:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs
- MinIO Console: http://localhost:9001

---

## 🔧 Полезные команды Docker

### Управление контейнерами

```bash
# Запустить всё
docker-compose up -d

# Остановить всё
docker-compose down

# Запустить только сервисы (без backend/frontend)
docker-compose up -d redis postgres minio

# Остановить только backend и frontend
docker-compose stop backend frontend

# Перезапустить Redis
docker-compose restart redis

# Логи
docker-compose logs -f redis
docker-compose logs -f postgres
docker-compose logs -f backend
```

### Отладка

```bash
# Зайти внутрь контейнера Redis
docker exec -it tg-redis sh

# Внутри контейнера:
redis-cli ping
redis-cli KEYS "*"
redis-cli GET "some-key"
exit

# Зайти в PostgreSQL
docker exec -it tg-postgres psql -U postgres -d tg_app

# Внутри PostgreSQL:
\dt              # Список таблиц
\d scenarios     # Структура таблицы
SELECT * FROM scenarios LIMIT 5;
\q               # Выход
```

### Очистка

```bash
# Остановить и удалить контейнеры
docker-compose down

# Удалить контейнеры + volumes (⚠️ удалит данные!)
docker-compose down -v

# Удалить образы
docker-compose down --rmi all

# Полная очистка (⚠️ осторожно!)
docker system prune -a --volumes
```

---

## 📊 Мониторинг Redis событий

```bash
# Real-time мониторинг всех событий синхронизации
docker exec -it tg-redis redis-cli PSUBSCRIBE "sync:*"

# Вы увидите:
# 1) "psubscribe"
# 2) "sync:*"
# 3) (integer) 1

# Теперь создайте сценарий в админке и увидите:
# 1) "pmessage"
# 2) "sync:*"
# 3) "sync:scenarios.created"
# 4) "{\"id\":\"...\",\"name\":\"...\",\"timestamp\":\"...\"}"
```

---

## 🐛 Решение проблем

### Redis не отвечает

```bash
# Проверка статуса
docker ps | grep redis

# Если нет - запустить
docker-compose up -d redis

# Проверка здоровья
docker inspect tg-redis | grep -A 5 "Health"

# Логи
docker-compose logs redis
```

### Backend не подключается к Redis

**Проблема:** Backend запущен локально и не может подключиться к Redis в Docker.

**Решение:** Redis уже проброшен на `localhost:6379`, просто убедитесь что:

1. В `.env` указано:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

2. Redis запущен:
   ```bash
   docker ps | grep redis
   ```

3. Перезапустите backend:
   ```bash
   cd backend
   npm run start:dev
   ```

### PostgreSQL connection refused

**Проблема:** Backend не может подключиться к PostgreSQL.

**Решение:**

1. Проверьте, что PostgreSQL запущен:
   ```bash
   docker ps | grep postgres
   ```

2. Проверьте переменные в `.env`:
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USER=postgres
   DATABASE_PASSWORD=postgres
   DATABASE_NAME=tg_app
   ```

3. Проверьте подключение:
   ```bash
   docker exec tg-postgres pg_isready -U postgres
   # Должно быть: accepting connections
   ```

---

## 🎯 Рекомендации

### Для разработки (сейчас):
```bash
# Сервисы в Docker
docker-compose up -d redis postgres minio

# Backend и Frontend локально
cd backend && npm run start:dev   # Terminal 1
cd frontend && npm run dev        # Terminal 2
```

**Преимущества:**
- ✅ Hot reload для backend и frontend
- ✅ Легко отлаживать
- ✅ Не нужно пересобирать Docker
- ✅ Redis/Postgres изолированы

### Для production:
```bash
# Всё в Docker
docker-compose up -d

# Или с Nginx reverse proxy
docker-compose -f docker-compose.prod.yml up -d
```

---

## ✅ Проверочный список

После запуска проверьте:

- [ ] Redis работает: `docker exec tg-redis redis-cli ping` → `PONG`
- [ ] PostgreSQL работает: `docker exec tg-postgres pg_isready` → `accepting connections`
- [ ] Backend подключен к Redis: логи показывают `✅ Redis connected`
- [ ] Backend запущен: http://localhost:3000/api
- [ ] Frontend запущен: http://localhost:5173
- [ ] WebSocket работает: консоль браузера показывает `✅ WebSocket connected`
- [ ] Синхронизация работает: создайте сценарий → увидите `📨 sync:event`

Если все пункты ✅ - всё работает! 🎉

