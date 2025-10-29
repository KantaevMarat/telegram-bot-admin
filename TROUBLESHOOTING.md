# 🔧 Решение проблем - Система Синхронизации

## ❌ Ошибка 500 при загрузке useSync.ts

### Симптомы:
```
useSync.ts:1 Failed to load resource: the server responded with a status of 500
```

### Причина:
Backend пытается подключиться к Redis, но Redis не запущен.

### Решение:

**Вариант 1: Запустить Redis (рекомендуется)**
```bash
# Windows (WSL)
wsl redis-server

# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

**Вариант 2: Работа без Redis**
Система автоматически работает в local-only режиме, но нужно перезапустить backend после исправления:

```bash
cd backend
npm run start:dev
```

### Проверка:
```bash
# Проверьте Redis
redis-cli ping
# Должен вернуть: PONG

# Проверьте логи backend
# Должно быть:
✅ Redis connected successfully
✅ Subscribed to sync:* events
🌐 WebSocket Gateway initialized
```

---

## ⚠️ WebSocket не подключается

### Симптомы:
```
⚠️ WebSocket connection error: timeout
❌ WebSocket disconnected
```

### Решение:

**1. Проверьте, что backend запущен:**
```bash
curl http://localhost:3000/api
# Должен вернуть что-то кроме "Connection refused"
```

**2. Проверьте CORS:**
В `backend/src/main.ts` должно быть:
```typescript
app.enableCors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    // ... остальные проверки
  },
  credentials: true,
});
```

**3. Проверьте firewall/antivirus:**
Убедитесь, что порты 3000 и 5173 открыты.

**4. Проверьте URL подключения:**
В консоли браузера должно быть:
```
🔌 Connecting to WebSocket: http://localhost:3000/sync
```

Если URL неправильный, установите переменную окружения:
```bash
# frontend/.env.local
VITE_API_URL=http://localhost:3000
```

---

## 🔴 Redis Connection Failed

### Симптомы:
```
❌ Failed to connect to Redis: ECONNREFUSED
⚠️ Sync service will work in local-only mode
```

### Решение:

**Это НЕ критическая ошибка!** Система работает без Redis, но:
- ❌ Нет распределенной синхронизации (если несколько инстансов backend)
- ✅ WebSocket синхронизация работает
- ✅ Кеширование работает (in-memory)

**Чтобы использовать Redis:**
```bash
# 1. Запустите Redis
redis-server

# 2. Проверьте подключение
redis-cli ping

# 3. Перезапустите backend
cd backend
npm run start:dev

# 4. Проверьте логи
# Должно быть: ✅ Redis connected successfully
```

---

## 🐛 Старые данные в боте после изменений

### Симптомы:
- Изменили кнопку/сценарий в админке
- Бот показывает старые данные

### Причина:
Кеш не инвалидировался или бот не подписан на события.

### Решение:

**1. Проверьте подписку на события:**
В `backend/src/modules/bot/bot.service.ts` должно быть:
```typescript
async onModuleInit() {
  this.syncService.on('buttons.created', () => 
    this.syncService.invalidateCache('buttons'));
  this.syncService.on('buttons.updated', () => 
    this.syncService.invalidateCache('buttons'));
  // ...
}
```

**2. Перезапустите backend:**
```bash
cd backend
npm run start:dev
```

**3. Очистите кеш вручную (если Redis запущен):**
```bash
redis-cli FLUSHDB
```

**4. Проверьте логи при изменении:**
```
📤 Publishing event: buttons.updated
🗑️ Invalidated 2 cache entries for buttons
```

---

## 🔄 Данные не обновляются в админке

### Симптомы:
- Пользователь выполнил задание в боте
- Баланс не обновился в админке автоматически

### Причина:
WebSocket не подключен или страница не подписана на события.

### Решение:

**1. Проверьте WebSocket подключение:**
Откройте консоль браузера (F12):
```
✅ WebSocket connected: <socket-id>
📡 WebSocket server confirmed connection
```

Если нет - см. раздел "WebSocket не подключается".

**2. Проверьте подписку на странице:**
В компоненте должно быть:
```typescript
useSyncRefetch(['users.updated', 'users.balance_updated'], refetch);
```

**3. Проверьте, что события отправляются:**
В логах backend при изменении баланса должно быть:
```
📤 Publishing event: users.balance_updated
```

**4. Временное решение:**
Обновите страницу вручную (F5) или используйте кнопку обновления в UI.

---

## 📱 Telegram Mini App не работает

### Симптомы:
```
[Telegram.WebView] > postEvent web_app_set_header_color
Failed to load resource: 500
```

### Решение:

**1. Проверьте, что backend доступен извне:**
```bash
# Используйте ngrok или serveo
ngrok http 3000

# Или
ssh -R 80:localhost:3000 serveo.net
```

**2. Обновите VITE_API_URL:**
```bash
# frontend/.env
VITE_API_URL=https://your-ngrok-url.ngrok.io
```

**3. Обновите CORS в backend:**
```typescript
// backend/src/main.ts
app.enableCors({
  origin: [
    'https://your-ngrok-url.ngrok.io',
    /\.serveo\.net$/,
    /\.ngrok\.io$/,
  ],
  credentials: true,
});
```

**4. Пересоберите frontend:**
```bash
cd frontend
npm run build
```

---

## 🚫 CORS ошибки

### Симптомы:
```
Access to XMLHttpRequest has been blocked by CORS policy
```

### Решение:

**В `backend/src/main.ts` используйте динамический origin:**
```typescript
app.enableCors({
  origin: (origin, callback) => {
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Production: whitelist specific origins
    const allowedOrigins = [
      'https://your-production-domain.com',
      'https://your-ngrok-url.ngrok.io',
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## 🔍 Отладка событий

### Real-time мониторинг Redis событий:
```bash
redis-cli PSUBSCRIBE "sync:*"
```

### Real-time мониторинг WebSocket (frontend):
```javascript
// В консоли браузера
const { socket } = window.__SYNC_DEBUG__;

socket.on('sync:event', (payload) => {
  console.log('📨 Event:', payload.type, payload.data);
});
```

### Проверка кеша:
```bash
# Redis
redis-cli
> KEYS *
> GET buttons:main_keyboard

# In-memory (через логи backend)
# Смотрите логи:
💾 Cached: buttons:main_keyboard (TTL: 60s)
✅ Cache hit: buttons:main_keyboard
🗑️ Cache invalidated: buttons:main_keyboard
```

---

## ⚡ Производительность

### Медленные обновления

**Проблема:** События приходят с задержкой.

**Решение:**
1. Проверьте, что Redis запущен (быстрее in-memory)
2. Уменьшите TTL кеша (сейчас 60 сек)
3. Проверьте нагрузку на сервер

**В `bot.service.ts` измените TTL:**
```typescript
this.syncService.setCache(cacheKey, result, 30); // 30 сек вместо 60
```

### Много событий

**Проблема:** Слишком много событий отправляется.

**Решение:**
1. Используйте debounce для частых изменений
2. Группируйте события (batch updates)
3. Фильтруйте события на клиенте

**Пример debounce:**
```typescript
let timeout: NodeJS.Timeout;

function debouncedPublish(eventType: string, data: any) {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    syncService.publish(eventType, data);
  }, 300); // 300ms delay
}
```

---

## 📊 Логи для отладки

### Включить debug логи в backend:
```typescript
// backend/src/modules/sync/sync.service.ts
this.logger.debug(`🔍 Cache state:`, Array.from(this.cache.keys()));
```

### Включить подробные логи WebSocket:
```typescript
// frontend/src/hooks/useSync.ts
const socket = io(`${wsUrl}/sync`, {
  // ...
  auth: { debug: true },
});

socket.onAny((event, ...args) => {
  console.log(`[Socket.IO] ${event}`, args);
});
```

---

## 🆘 Полная перезагрузка

Если ничего не помогает:

```bash
# 1. Остановите все процессы
# Ctrl+C в каждом терминале

# 2. Очистите Redis
redis-cli FLUSHALL

# 3. Перезапустите Redis
redis-server

# 4. Перезапустите backend
cd backend
npm run start:dev

# 5. Перезапустите frontend
cd frontend
npm run dev

# 6. Очистите кеш браузера
# Ctrl+Shift+R или Cmd+Shift+R

# 7. Проверьте логи
# Backend должен показать:
✅ Redis connected successfully
✅ Subscribed to sync:* events
🌐 WebSocket Gateway initialized

# Frontend (консоль браузера):
✅ WebSocket connected: <socket-id>
📡 WebSocket server confirmed connection
```

---

## 📞 Поддержка

Если проблема не решается:

1. Проверьте `SYNC_SYSTEM.md` - полная документация
2. Проверьте `QUICK_START.md` - инструкция по запуску
3. Проверьте логи backend и frontend
4. Создайте issue с:
   - Описанием проблемы
   - Логами backend
   - Логами frontend (консоль браузера)
   - Версией Node.js и npm
   - ОС

---

## ✅ Чек-лист здоровой системы

- [ ] Backend запущен: `http://localhost:3000`
- [ ] Frontend запущен: `http://localhost:5173`
- [ ] Redis работает: `redis-cli ping` → `PONG`
- [ ] WebSocket подключен: консоль показывает "✅ WebSocket connected"
- [ ] События работают: создание сценария → `📨 sync:event` в консоли
- [ ] Кеш работает: логи показывают "💾 Cached" и "🗑️ Cache invalidated"
- [ ] Бот актуален: изменения в админке → мгновенно в боте

Если все пункты ✅ - система работает корректно! 🎉

