# 🔄 Полная синхронизация с сервером

## Шаг 1: Синхронизация кода

```bash
cd ~/telegram-bot-admin

# Получите последние изменения
git pull origin sync/cleanup/2025-10-29

# Проверьте статус
git status
```

## Шаг 2: Обновление .env файла

```bash
# Откройте .env для редактирования
nano .env
```

**Убедитесь что есть все эти переменные:**

```bash
# === DATABASE ===
DB_HOST=172.17.0.1
DB_PORT=5432
DB_USER=u3315562_botuser
DB_PASSWORD=Ququmber225763123890222
DB_NAME=u3315562_developer
DATABASE_URL=postgresql://u3315562_botuser:Ququmber225763123890222@172.17.0.1:5432/u3315562_developer

# === PostgreSQL для Docker Compose ===
POSTGRES_USER=u3315562_botuser
POSTGRES_PASSWORD=Ququmber225763123890222
POSTGRES_DB=u3315562_developer

# === REDIS ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# === MinIO ===
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=telegram-bot

# === TELEGRAM BOT ===
TELEGRAM_BOT_TOKEN=ваш_токен_основного_бота
TELEGRAM_ADMIN_BOT_TOKEN=ваш_токен_админ_бота
TELEGRAM_WEBHOOK_URL=

# === JWT ===
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# === APP ===
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://89.35.55.254:8080

# === CORS ===
CORS_ORIGINS=http://89.35.55.254:8080,http://localhost:8080

# === FAKE STATS ===
FAKE_STATS_MAX_DELTA_PERCENT=15
FAKE_STATS_TREND_MIN=-0.02
FAKE_STATS_TREND_MAX=0.03
FAKE_STATS_NOISE_STDDEV=0.01
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

## Шаг 3: Скопировать новые файлы в контейнер

```bash
# Скопируйте скомпилированный backend
docker cp backend/dist/. tg-backend:/app/dist/

# Скопируйте скрипт инициализации
docker cp backend/init-settings-simple.js tg-backend:/app/init-settings-simple.js
```

## Шаг 4: Перезапустить сервисы

```bash
# Перезапустите все контейнеры с новыми .env
docker compose -f docker-compose.lightweight.yml down
docker compose -f docker-compose.lightweight.yml up -d

# Подождите 10 секунд
sleep 10

# Проверьте статус
docker compose -f docker-compose.lightweight.yml ps
```

## Шаг 5: Инициализировать настройки

```bash
# Запустите инициализацию настроек
docker compose -f docker-compose.lightweight.yml exec backend node init-settings-simple.js
```

Вы должны увидеть:
```
🔌 Connecting to database...
✅ Connected!
🔧 Initializing settings...
✅ Добавлена настройка: bot_enabled
✅ Добавлена настройка: bot_username
... (более 100 настроек)
🎉 Settings initialized successfully!
```

## Шаг 6: Проверить логи

```bash
# Смотрите логи backend
docker compose -f docker-compose.lightweight.yml logs -f backend | tail -50
```

Должны видеть:
- ✅ `Application is running on: http://localhost:3000`
- ✅ `Admin bot polling started automatically`
- ✅ `Fake stats updated (default values): online=XXXX, active=YYYY, paid=ZZZZ`
- ❌ НЕТ ошибок `syntax error` или `relation does not exist`

## Шаг 7: Проверить админку

1. Откройте в браузере: `http://89.35.55.254:8080`
2. Войдите через Telegram
3. Проверьте:
   - ✅ **Настройки загружаются** (более 100 настроек в разных категориях)
   - ✅ **Статистика показывает данные** (online, active, paid)
   - ✅ **Все секции работают** (пользователи, задания, выплаты)

## Быстрая проверка базы данных

```bash
# Проверьте количество настроек
sudo -u postgres psql -d u3315562_developer -c "SELECT COUNT(*) FROM settings;"

# Проверьте категории
sudo -u postgres psql -d u3315562_developer -c "SELECT category, COUNT(*) as count FROM settings GROUP BY category ORDER BY category;"

# Проверьте fake stats
sudo -u postgres psql -d u3315562_developer -c "SELECT * FROM fake_stats ORDER BY calculated_at DESC LIMIT 3;"
```

## Если что-то пошло не так

### Проблема: Настройки не загружаются

```bash
# Пересоздайте настройки
docker compose -f docker-compose.lightweight.yml exec backend node init-settings-simple.js
```

### Проблема: Ошибки в логах

```bash
# Посмотрите полные логи
docker compose -f docker-compose.lightweight.yml logs backend

# Перезапустите backend
docker compose -f docker-compose.lightweight.yml restart backend
```

### Проблема: База недоступна

```bash
# Проверьте PostgreSQL
systemctl status postgresql
sudo -u postgres psql -l
```

---

## ✅ Чеклист синхронизации

- [ ] Код обновлён через git pull
- [ ] .env файл содержит все переменные
- [ ] Контейнеры перезапущены
- [ ] Настройки инициализированы (100+ настроек)
- [ ] Логи backend без ошибок
- [ ] Админка открывается и загружается
- [ ] Fake stats обновляется с разными значениями
- [ ] Можно войти через Telegram

🎉 **Всё синхронизировано!**

