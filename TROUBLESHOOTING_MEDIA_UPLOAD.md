# Диагностика ошибок загрузки файлов

## Какие логи проверить:

### 1. Логи Backend (основные)
```bash
docker logs tg-backend --tail 100 -f
```
Или последние 200 строк:
```bash
docker logs tg-backend --tail 200
```

**Что искать:**
- `📤 Upload request received` - запрос получен
- `🔧 MinIO configuration` - конфигурация MinIO
- `📤 Uploading file to MinIO` - начало загрузки
- `✅ File uploaded to MinIO` - успешная загрузка
- `❌ Failed to upload file` - ошибка загрузки
- `Cannot execute operation on "default" connection` - проблема с MinIO подключением

### 2. Логи MinIO
```bash
docker logs tg-minio --tail 100 -f
```

**Что искать:**
- Ошибки подключения
- Ошибки авторизации
- Ошибки записи файлов

### 3. Логи Frontend (в браузере)
1. Откройте Developer Tools (F12)
2. Вкладка **Console** - ищите ошибки с `❌ API Error`
3. Вкладка **Network** - проверьте запрос к `/api/admin/media/upload`:
   - Статус код (должен быть 200)
   - Response body (если есть ошибка)

### 4. Проверка статуса контейнеров
```bash
docker compose -f docker-compose.lightweight.yml ps
```

Все контейнеры должны быть в статусе `Up` и `healthy`.

### 5. Проверка подключения к MinIO из Backend
```bash
docker exec tg-backend wget -O- http://minio:9000/minio/health/live
```

Должен вернуть `200 OK`.

### 6. Проверка переменных окружения
```bash
docker exec tg-backend env | grep MINIO
```

Должны быть установлены:
- `MINIO_ENDPOINT=minio`
- `MINIO_PORT=9000`
- `MINIO_ACCESS_KEY=...`
- `MINIO_SECRET_KEY=...`
- `MINIO_BUCKET=telegram-media`

## Типичные ошибки и решения:

### Ошибка: "Cannot execute operation on 'default' connection"
**Причина:** MinIO не готов или недоступен
**Решение:**
```bash
docker compose -f docker-compose.lightweight.yml restart minio
docker compose -f docker-compose.lightweight.yml restart backend
```

### Ошибка: "Access Denied" или "Invalid credentials"
**Причина:** Неправильные ключи доступа к MinIO
**Решение:** Проверьте `.env` файл:
```bash
cat .env | grep MINIO
```

### Ошибка: "Bucket does not exist"
**Причина:** Bucket не создан автоматически
**Решение:** Backend должен создать bucket автоматически при старте. Проверьте логи:
```bash
docker logs tg-backend | grep -i "bucket"
```

### Ошибка: "Network Error" в браузере
**Причина:** Проблема с CORS или авторизацией
**Решение:**
1. Проверьте, что JWT токен валиден
2. Проверьте CORS настройки в `backend/src/main.ts`
3. Проверьте заголовки запроса в Network tab

### Ошибка: "File too large"
**Причина:** Файл превышает лимит (обычно 50MB)
**Решение:** Уменьшите размер файла или увеличьте лимит в настройках

## Быстрая диагностика:

```bash
# 1. Проверка статуса
docker compose -f docker-compose.lightweight.yml ps

# 2. Проверка логов backend (последние ошибки)
docker logs tg-backend 2>&1 | grep -i "error\|failed\|❌" | tail -20

# 3. Проверка логов MinIO
docker logs tg-minio 2>&1 | tail -20

# 4. Проверка подключения к MinIO
docker exec tg-backend ping -c 2 minio

# 5. Полная перезагрузка (если ничего не помогает)
docker compose -f docker-compose.lightweight.yml restart backend minio
```

## После исправления:

1. Обновите код на сервере:
```bash
cd ~/telegram-bot-admin
git pull
docker cp backend/dist/. tg-backend:/app/dist/
docker compose -f docker-compose.lightweight.yml restart backend
```

2. Попробуйте загрузить файл снова

3. Проверьте логи в реальном времени:
```bash
docker logs tg-backend -f
```

