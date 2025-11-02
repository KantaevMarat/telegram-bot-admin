# 🤖 Telegram Боты - Информация

## 📊 Архитектура системы

Система использует **два независимых бота** для разделения функциональности:

```
┌──────────────────────────────────────────────────────┐
│                   Telegram                           │
│  ┌─────────────────┐      ┌─────────────────┐      │
│  │  @thtgmoneybot  │      │@lrtelegram_mgbot│      │
│  │  (Клиентский)   │      │   (Админ-бот)   │      │
│  └────────┬────────┘      └────────┬────────┘      │
└───────────┼──────────────────────────┼──────────────┘
            │                          │
            │ Polling/Webhook          │ Polling + Web App
            │                          │
            ▼                          ▼
┌───────────────────────────────────────────────────────┐
│              Backend (NestJS)                         │
│  ┌──────────────────┐    ┌──────────────────┐      │
│  │   BotService     │    │ AdminBotService  │      │
│  │  (User logic)    │    │  (Admin logic)   │      │
│  └──────────────────┘    └──────────────────┘      │
│                                                       │
│         PostgreSQL + Redis + MinIO                   │
└─────────────────┬─────────────────────────────────────┘
                  │
                  │ HTTPS Web App
                  ▼
         ┌─────────────────┐
         │   Frontend      │
         │ (React + Vite)  │
         └─────────────────┘
```

## 🎯 Разделение функциональности

### 1️⃣ Клиентский бот (@thtgmoneybot)

**Цель:** Взаимодействие с обычными пользователями

**Технологии:**
- Telegram Bot API
- Long Polling (development)
- Webhook (production)

**Основные функции:**
```
📋 Задания
├── Просмотр доступных заданий
├── Старт выполнения задания
├── Отправка на проверку
└── Получение награды

💰 Баланс
├── Проверка текущего баланса
├── История транзакций
└── Заработанная сумма

👥 Рефералы
├── Генерация реферальной ссылки
├── Просмотр приглашенных
└── Бонусы за рефералов

💸 Вывод средств
├── Создание заявки на вывод
├── Указание кошелька TRC20
└── Отслеживание статуса

📊 Статистика
├── Выполненные задания
├── Общий заработок
└── Позиция в рейтинге
```

**Интеграции:**
- ✅ Проверка подписки на каналы
- ✅ Автоответы по сценариям
- ✅ Fake статистика
- ✅ Кастомные кнопки из БД

### 2️⃣ Админ-бот (@lrtelegram_mgbot)

**Цель:** Управление системой через Telegram Web App

**Технологии:**
- Telegram Bot API
- Telegram Web App (Mini App)
- Long Polling (always)

**Основные функции:**
```
👥 Пользователи
├── Просмотр списка
├── Блокировка/разблокировка
├── Просмотр профиля
└── Редактирование баланса

📋 Задания
├── Создание новых заданий
├── Редактирование существующих
├── Активация/деактивация
└── Просмотр статистики выполнения

📊 Статистика
├── Общая статистика системы
├── Графики и аналитика
├── Fake статистика
└── Экспорт данных

📢 Рассылки
├── Создание рассылки
├── Выбор аудитории
├── Отложенная отправка
└── Статистика доставки

💸 Выплаты
├── Просмотр заявок
├── Одобрение/отклонение
├── История выплат
└── Статистика

🎯 Сценарии
├── Настройка автоответов
├── Триггеры и действия
└── Тестирование

📱 Каналы
├── Обязательные подписки
├── Проверка участия
└── Управление списком

⚙️ Настройки
├── Минимальные суммы
├── Бонусы и награды
├── Таймауты
└── Тексты сообщений
```

**Особенности:**
- 🔐 Проверка прав доступа по Telegram ID
- 📱 Web App открывается прямо в Telegram
- 🔔 Push-уведомления администраторам
- ⚡ Real-time обновления данных

## 🔐 Безопасность

### Клиентский бот
- ✅ Валидация входных данных
- ✅ Rate limiting для команд
- ✅ Проверка прав пользователя
- ✅ Защита от спама

### Админ-бот
- ✅ Проверка Telegram ID администратора
- ✅ JWT аутентификация для Web App
- ✅ HTTPS для Web App (обязательно)
- ✅ CORS защита

## 📝 Конфигурация

### Environment Variables

```env
# Клиентский бот
TELEGRAM_BOT_TOKEN=8330680651:AAErG1_zzA0aX4_O7s-aaQlcCseLF7i8cIE
TELEGRAM_BOT_USERNAME=thtgmoneybot
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/bot/webhook

# Админ-бот
ADMIN_BOT_TOKEN=8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro
TELEGRAM_WEB_APP_URL=https://your-domain.com

# Режим работы
NODE_ENV=development  # или production
```

### Режимы работы

| Режим | Клиентский бот | Админ-бот |
|-------|---------------|-----------|
| Development | Polling | Polling |
| Production | Webhook | Polling |

## 🚀 API Endpoints

### Webhook для клиентского бота
```
POST /api/bot/webhook
Content-Type: application/json

{
  "update_id": 123456,
  "message": {
    "chat": { "id": 12345 },
    "text": "/start"
  }
}
```

### Уведомления администраторам
```typescript
// Отправить уведомление конкретному админу
await adminBotService.notifyAdmin(tgId, message, keyboard);

// Отправить всем администраторам
await adminBotService.notifyAllAdmins(message, keyboard);
```

## 📊 Метрики и мониторинг

### Логи ботов
```bash
# Все логи
docker-compose logs -f backend

# Только клиентский бот
docker-compose logs -f backend | grep "BotService"

# Только админ-бот
docker-compose logs -f backend | grep "AdminBotService"
```

### Важные метрики
- ⏱ Время отклика бота
- 📨 Количество сообщений в минуту
- 👥 Активные пользователи
- 💰 Транзакции в день
- 📊 Выполненные задания

## 🔧 Разработка

### Добавление новой команды в клиентский бот

```typescript
// backend/src/modules/bot/bot.service.ts

private async handleCommand(chatId: string, command: string, user: User) {
  switch (cmd) {
    case '/mycommand':
      await this.handleMyCommand(chatId, user);
      break;
  }
}

private async handleMyCommand(chatId: string, user: User) {
  await this.sendMessage(chatId, 'Hello!', await this.getReplyKeyboard());
}
```

### Добавление нового раздела в админ-бот

1. Создайте новый компонент в frontend
2. Добавьте роут в React Router
3. Добавьте API endpoint в backend
4. Web App автоматически подгрузит изменения

### Тестирование локально

```bash
# Запустите backend
cd backend && npm run start:dev

# В другом терминале запустите frontend
cd frontend && npm run dev

# Используйте ngrok для Web App
ngrok http 5173
# Обновите TELEGRAM_WEB_APP_URL в .env
```

## 📚 Полезные ресурсы

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)
- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)

## 🆘 Troubleshooting

См. подробный раздел в [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md#-troubleshooting)

---

**Контакты ботов:**
- Клиентский: https://t.me/thtgmoneybot
- Админ: https://t.me/lrtelegram_mgbot

