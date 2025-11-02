# 🚀 Настройка с Localtunnel

## Проблема
Вы используете localtunnel для фронтенда (`https://myproh5.loca.lt`), но backend остался на `http://localhost:3000`. 

**Это не работает, потому что:**
1. HTTPS → HTTP блокируется браузером (Mixed Content Error)
2. localhost недоступен из Telegram Web App

## ✅ Решение

### Шаг 1: Создать туннель для backend

Откройте **ВТОРОЙ терминал** и запустите:

```bash
npx localtunnel --port 3000 --subdomain myproh5-api
```

Вы получите URL: `https://myproh5-api.loca.lt`

### Шаг 2: Обновить .env

```env
TELEGRAM_WEB_APP_URL=https://myproh5.loca.lt
VITE_API_URL=https://myproh5-api.loca.lt
```

### Шаг 3: Обновить frontend/.env

Создайте файл `frontend/.env`:
```env
VITE_API_URL=https://myproh5-api.loca.lt
```

### Шаг 4: Перезапустить frontend

```bash
docker-compose restart frontend
```

Или если frontend запущен локально:
```bash
cd frontend
npm run dev
```

### Шаг 5: Тестирование

1. Откройте бота в Telegram
2. Нажмите кнопку меню (☰)
3. Выберите "Админка"
4. Приложение должно загрузиться!

---

## 🔧 Полная команда запуска

```bash
# Терминал 1: Frontend туннель
npx localtunnel --port 5173 --subdomain myproh5

# Терминал 2: Backend туннель  
npx localtunnel --port 3000 --subdomain myproh5-api

# Терминал 3: Docker сервисы
docker-compose up
```

---

## ⚠️ Важно: Обход экрана Localtunnel

При первом открытии localtunnel URL, вы увидите экран с предупреждением "This is a localtunnel service".

**Решение:** Нажмите "Click to Continue" один раз для каждого URL:
1. Откройте `https://myproh5.loca.lt` в браузере → нажмите "Continue"
2. Откройте `https://myproh5-api.loca.lt` в браузере → нажмите "Continue"

Или используйте параметр при запуске (если поддерживается):
```bash
npx localtunnel --port 5173 --subdomain myproh5 --bypass-tunnel-reminder
```

---

## 🐛 Если проблема с CORS

Localtunnel может иметь проблемы с CORS. Если видите ошибки CORS:

### Решение 1: Настроить заголовки в backend

В `backend/src/main.ts` уже настроено:
```typescript
app.enableCors({
  origin: true, // Разрешить все домены
  credentials: true,
});
```

### Решение 2: Использовать ngrok вместо localtunnel

ngrok более стабилен для production:
```bash
# Установить ngrok
choco install ngrok

# Запустить
ngrok http 5173
ngrok http 3000
```

---

## 📊 Проверка работы

### 1. Проверить туннели работают
```bash
# Frontend
curl https://myproh5.loca.lt

# Backend
curl https://myproh5-api.loca.lt/api
```

### 2. Проверить Menu Button
```powershell
Invoke-RestMethod -Uri 'https://api.telegram.org/bot8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro/getChatMenuButton'
```

### 3. Проверить логи
```bash
# Backend логи
docker-compose logs backend --tail=50 -f

# Frontend логи
docker-compose logs frontend --tail=50 -f
```

---

## 🎯 Текущая конфигурация

✅ **Menu Button настроен:** `https://myproh5.loca.lt`
❌ **Backend доступен только локально:** `http://localhost:3000`

**Нужно:** Создать туннель для backend и обновить `VITE_API_URL`

