# 📋 Отчет об использовании токенов ботов в проекте

## 🔑 Используемые переменные окружения

### 1. `CLIENT_TG_BOT_TOKEN` / `CLIENT_BOT_TOKEN`
**Назначение:** Токен клиентского бота (для пользователей)

**Используется в:**
- ✅ `backend/src/modules/bot/bot.service.ts` (строки 62-64, 72)
- ✅ `backend/src/modules/broadcast/broadcast.processor.ts` (строки 20-21, 25)

**Приоритет:** Высокий (используется первым, если доступен)

---

### 2. `ADMIN_BOT_TOKEN`
**Назначение:** Токен админского бота (для админ-панели)

**Используется в:**
- ✅ `backend/src/modules/bot/admin-bot.service.ts` (строка 22)
- ✅ `backend/src/modules/auth/telegram-auth.service.ts` (строка 33)

**Приоритет:** Высокий (для админ-функций)

---

### 3. `TELEGRAM_BOT_TOKEN`
**Назначение:** Основной токен бота (fallback)

**Используется в:**
- ✅ `backend/src/modules/bot/bot.service.ts` (строки 63, 74) - как fallback
- ✅ `backend/src/modules/broadcast/broadcast.processor.ts` (строки 21, 27) - как fallback
- ✅ `backend/src/modules/auth/auth.service.ts` (строка 31) - для валидации
- ✅ `backend/src/modules/auth/telegram-auth.service.ts` (строка 34) - как userBotToken

**Приоритет:** Средний (используется как fallback)

---

## 📍 Детальное описание использования

### 1. BotService (`backend/src/modules/bot/bot.service.ts`)

**Логика выбора токена:**
```typescript
const clientToken = this.configService.get('CLIENT_TG_BOT_TOKEN') || 
                    this.configService.get('CLIENT_BOT_TOKEN');
const telegramToken = this.configService.get('TELEGRAM_BOT_TOKEN');
this.botToken = clientToken || telegramToken || '';
```

**Приоритет:**
1. `CLIENT_TG_BOT_TOKEN`
2. `CLIENT_BOT_TOKEN`
3. `TELEGRAM_BOT_TOKEN` (fallback)

**Использование токена:**
- Polling обновлений от Telegram API
- Отправка сообщений пользователям
- Обработка callback queries
- Управление webhook
- Получение файлов
- Проверка статуса чата

**Строки кода с использованием:**
- 138: `getWebhookInfo`
- 223: `getUpdates` (polling)
- 1306: `sendMessage`
- 1333: `getFile`
- 1341: `getFile` (скачивание)
- 1385: Общие API вызовы
- 1491: `answerCallbackQuery`
- 1504: `setWebhook`
- 1519: `deleteWebhook`
- 3465: `getChatMember`

---

### 2. AdminBotService (`backend/src/modules/bot/admin-bot.service.ts`)

**Использует:** `ADMIN_BOT_TOKEN`

**Назначение:**
- Управление админ-ботом
- Настройка кнопки меню для Web App
- Отправка сообщений администраторам
- Polling обновлений от админ-бота

**Строки кода:**
- 22: Инициализация токена
- 61: `setChatMenuButton`
- 134: `sendMessage`
- 284: `getUpdates`

---

### 3. BroadcastProcessor (`backend/src/modules/broadcast/broadcast.processor.ts`)

**Логика выбора токена:**
```typescript
const clientToken = this.configService.get('CLIENT_TG_BOT_TOKEN') || 
                    this.configService.get('CLIENT_BOT_TOKEN');
const telegramToken = this.configService.get('TELEGRAM_BOT_TOKEN');
this.botToken = clientToken || telegramToken || '';
```

**Назначение:**
- Массовая рассылка сообщений пользователям
- Отправка медиа в рассылках

**Строки кода:**
- 20-22: Инициализация токена
- 77: `sendMessage`
- 121: Общие API вызовы

---

### 4. TelegramAuthService (`backend/src/modules/auth/telegram-auth.service.ts`)

**Использует:**
- `ADMIN_BOT_TOKEN` (строка 33)
- `TELEGRAM_BOT_TOKEN` (строка 34)

**Назначение:**
- Валидация Telegram initData
- Проверка подписи данных от Web App
- Поддержка обоих токенов для валидации

**Логика:**
- Пытается валидировать с `ADMIN_BOT_TOKEN`
- Если не получается, пробует `TELEGRAM_BOT_TOKEN`
- Это позволяет использовать Web App как для админов, так и для пользователей

---

### 5. AuthService (`backend/src/modules/auth/auth.service.ts`)

**Использует:** `TELEGRAM_BOT_TOKEN` (строка 31)

**Назначение:**
- Валидация данных Telegram для аутентификации
- Проверка подписи initData

---

## 🔧 Конфигурация в Docker

### docker-compose.dev.yml
```yaml
environment:
  CLIENT_TG_BOT_TOKEN: ${CLIENT_TG_BOT_TOKEN}
  ADMIN_TG_BOT_TOKEN: ${ADMIN_TG_BOT_TOKEN}
  TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
```

---

## 📝 Файлы конфигурации

### .env (корневой)
Содержит все три токена:
- `CLIENT_TG_BOT_TOKEN`
- `ADMIN_TG_BOT_TOKEN`
- `TELEGRAM_BOT_TOKEN`

### env.production
Содержит продакшн значения токенов

---

## ⚠️ Важные замечания

1. **Приоритет токенов:**
   - Для пользовательского бота: `CLIENT_TG_BOT_TOKEN` > `CLIENT_BOT_TOKEN` > `TELEGRAM_BOT_TOKEN`
   - Для админ-бота: только `ADMIN_BOT_TOKEN`

2. **Fallback механизм:**
   - Если `CLIENT_TG_BOT_TOKEN` не установлен, используется `TELEGRAM_BOT_TOKEN`
   - Это обеспечивает обратную совместимость

3. **Валидация:**
   - `TelegramAuthService` пробует оба токена для валидации
   - Это позволяет использовать один Web App для админов и пользователей

4. **Безопасность:**
   - Все токены должны быть в `.env` файле
   - `.env` файлы в `.gitignore` (не коммитятся в репозиторий)

---

## 📊 Сводная таблица

| Переменная | Используется в | Назначение | Приоритет |
|------------|----------------|------------|-----------|
| `CLIENT_TG_BOT_TOKEN` | BotService, BroadcastProcessor | Клиентский бот | Высокий |
| `CLIENT_BOT_TOKEN` | BotService, BroadcastProcessor | Клиентский бот (альтернатива) | Высокий |
| `ADMIN_BOT_TOKEN` | AdminBotService, TelegramAuthService | Админ-бот | Высокий |
| `TELEGRAM_BOT_TOKEN` | BotService, BroadcastProcessor, AuthService, TelegramAuthService | Основной бот (fallback) | Средний |

---

**Дата создания отчета:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

