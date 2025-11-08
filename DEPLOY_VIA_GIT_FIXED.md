# 🚀 Развертывание через Git (Исправленная версия)

## ✅ Изменения запушены на GitHub!

Коммит: `4f77591`
Ветка: `sync/cleanup/2025-10-29`

---

## 📋 Шаги развертывания на сервере:

### Шаг 1: Подключение к серверу
```bash
ssh -i "C:\Users\Марат\.ssh\telegram_bot_admin" root@79.174.93.115
# Пароль: qOAkAE8P1VRGou71
```

### Шаг 2: Обновление кода с GitHub
```bash
cd ~/telegram-bot-admin

# Сохраним изменения в .env если есть
git stash

# Переключаемся на нужную ветку (если не на ней)
git checkout sync/cleanup/2025-10-29

# Подтягиваем изменения
git pull origin sync/cleanup/2025-10-29

# Возвращаем .env
git stash pop
```

### Шаг 3: Миграция БД (через Docker контейнер)

**Важно:** На сервере нет `node` напрямую, используем Docker контейнер!

```bash
cd ~/telegram-bot-admin

# Копируем файл миграции в контейнер (если нужно)
docker cp backend/add-min-completion-time-column.js tg-backend:/app/

# Запускаем миграцию внутри контейнера
docker exec tg-backend node /app/add-min-completion-time-column.js

# ИЛИ если контейнер еще не запущен, используем временный контейнер:
# docker run --rm --network tg-network --env-file backend/.env -v $(pwd)/backend:/app node:18 node /app/add-min-completion-time-column.js
```

**Альтернативный способ - через docker-compose:**
```bash
cd ~/telegram-bot-admin

# Запускаем миграцию через docker-compose exec
docker-compose exec backend node add-min-completion-time-column.js
```

**Ожидаемый результат:**
```
✅ Connected to database
✅ Column min_completion_time added successfully
```

### Шаг 4: Пересборка Backend
```bash
cd ~/telegram-bot-admin/backend

# Компиляция TypeScript (если нужно)
# Но обычно это делается в Dockerfile при сборке образа
```

### Шаг 5: Пересборка Frontend
```bash
cd ~/telegram-bot-admin/frontend

# Сборка production версии
npm run build

# Или если npm нет на сервере, используем Docker:
docker run --rm -v $(pwd):/app -w /app node:18 npm install && npm run build
```

### Шаг 6: Перезапуск контейнеров
```bash
cd ~/telegram-bot-admin

# Останавливаем контейнеры
docker-compose down

# Пересобираем образы с новым кодом
docker-compose build backend
docker-compose build frontend

# Запускаем контейнеры
docker-compose up -d

# Проверяем статус
docker-compose ps
```

### Шаг 7: Проверка логов
```bash
# Backend логи
docker logs tg-backend --tail 50

# Frontend логи
docker logs tg-frontend --tail 20

# Проверка, что API работает
curl -s http://localhost:3001/health
```

---

## 🎯 Упрощенный способ (если docker-compose не работает):

### Вариант 1: Перезапуск через существующие контейнеры
```bash
cd ~/telegram-bot-admin

# Останавливаем
docker stop tg-backend tg-frontend

# Копируем новые файлы в контейнеры (если нужно)
# Но лучше пересобрать образы

# Запускаем заново
docker start tg-backend tg-frontend
```

### Вариант 2: Полная пересборка
```bash
cd ~/telegram-bot-admin

# 1. Миграция БД (через контейнер)
docker exec tg-backend node add-min-completion-time-column.js

# 2. Останавливаем контейнеры
docker stop tg-backend tg-frontend
docker rm tg-backend tg-frontend

# 3. Пересобираем backend
cd backend
docker build -t tg-backend .
docker run -d --name tg-backend --network tg-network -p 3001:3001 --env-file .env tg-backend

# 4. Пересобираем frontend (если нужно)
cd ../frontend
npm run build  # или через Docker
docker build -t tg-frontend .
docker run -d --name tg-frontend --network tg-network -p 3000:80 tg-frontend
```

---

## 🔧 Проверка миграции БД:

После запуска миграции проверьте, что колонка добавлена:

```bash
# Подключаемся к базе данных через контейнер
docker exec -it tg-backend psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# В psql выполните:
\d tasks

# Должна быть колонка min_completion_time
```

Или через SQL напрямую:
```bash
docker exec tg-backend psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d tasks"
```

---

## 🧪 Проверка работоспособности:

### 1. Проверка API
```bash
# Проверка эндпоинта модерации
curl -s "http://localhost:3001/api/admin/tasks/moderation/pending"
```

### 2. Проверка админки (в браузере)
1. Откройте https://app.marranasuete.ru
2. Войдите в админку
3. Проверьте:
   - ✅ Новый пункт меню **"Модерация"** (иконка часов)
   - ✅ В "Задания" → поле **"⏱️ Минимальное время выполнения"**
   - ✅ В "Кнопки" → подсказка для **callback data**
   - ✅ В "Чаты" → отображение `@username` и счетчик медиа

---

## ❗ Решение проблемы "node: command not found":

**Проблема:** На сервере нет Node.js напрямую, только в Docker контейнере.

**Решение:** Используйте один из вариантов:

1. **Через docker exec (если контейнер запущен):**
   ```bash
   docker exec tg-backend node add-min-completion-time-column.js
   ```

2. **Через docker-compose exec:**
   ```bash
   docker-compose exec backend node add-min-completion-time-column.js
   ```

3. **Через временный контейнер:**
   ```bash
   docker run --rm --network tg-network \
     -e DB_HOST=$DB_HOST \
     -e DB_PORT=$DB_PORT \
     -e DB_NAME=$DB_NAME \
     -e DB_USER=$DB_USER \
     -e DB_PASSWORD=$DB_PASSWORD \
     -v $(pwd)/backend:/app \
     -w /app \
     node:18 \
     node add-min-completion-time-column.js
   ```

---

**Удачи с развертыванием! 🚀**

