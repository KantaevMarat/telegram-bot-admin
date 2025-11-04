# 🚨 Быстрое исправление ошибки на сервере

## Проблема
На сервере ошибка: `Error: spawn nest ENOENT` - Docker пытается запустить dev-режим, но сервер не выдерживает сборку.

## ✅ Решение
Используем lightweight версию с предсобранными файлами из git (сборка уже сделана локально).

## 📋 Команды на сервере

### Вариант 1: Быстрое исправление (используйте это!)

```bash
# Остановить текущие контейнеры
docker-compose down

# Подтянуть изменения из git (там уже собранные файлы!)
git pull origin sync/cleanup/2025-10-29

# Запустить с новым lightweight конфигом
docker-compose -f docker-compose.lightweight.yml up -d --build

# Проверить логи
docker-compose -f docker-compose.lightweight.yml logs -f backend
```

### Вариант 2: Одна команда (копировать целиком)

```bash
cd ~/telegram-bot-admin && \
docker-compose down && \
git pull origin sync/cleanup/2025-10-29 && \
docker-compose -f docker-compose.lightweight.yml up -d --build && \
docker-compose -f docker-compose.lightweight.yml logs -f backend
```

## 🎯 Что делает lightweight версия?

1. ✅ НЕ собирает проект на сервере (использует готовые файлы из git)
2. ✅ Устанавливает только production зависимости
3. ✅ Запускает `node dist/src/main.js` напрямую
4. ✅ Экономит ресурсы сервера

## 📊 Ожидаемый результат

После команды вы должны увидеть:

```
tg-backend  | [Nest] 1  - XX/XX/XXXX, XX:XX:XX     LOG [NestFactory] Starting Nest application...
tg-backend  | [Nest] 1  - XX/XX/XXXX, XX:XX:XX     LOG [InstanceLoader] AppModule dependencies initialized
tg-backend  | [Nest] 1  - XX/XX/XXXX, XX:XX:XX     LOG [InstanceLoader] TypeOrmModule dependencies initialized
tg-backend  | [Nest] 1  - XX/XX/XXXX, XX:XX:XX     LOG [BotService] BotService constructor called
tg-backend  | [Nest] 1  - XX/XX/XXXX, XX:XX:XX     LOG [BotService] ✅ Using TELEGRAM_BOT_TOKEN...
tg-backend  | [Nest] 1  - XX/XX/XXXX, XX:XX:XX     LOG [BotService] ✅ BotService subscribed to sync events
tg-backend  | [Nest] 1  - XX/XX/XXXX, XX:XX:XX     LOG [NestApplication] Nest application successfully started
```

## 🐛 Если всё ещё не работает

### Проверить, что файлы dist есть в git:

```bash
ls -la backend/dist/src/
```

Должны увидеть файлы: `main.js`, `app.module.js`, и т.д.

### Если dist папка пустая - пушнуть снова с локальной машины:

На локальной машине:
```bash
git add backend/dist/
git commit -m "fix: Add dist files"
git push origin sync/cleanup/2025-10-29
```

Потом на сервере:
```bash
git pull origin sync/cleanup/2025-10-29
```

### Проверить переменные окружения:

```bash
cat .env | grep TELEGRAM_BOT_TOKEN
```

Должен быть установлен токен бота.

## 🔄 Откат к старой версии

Если нужно вернуться:

```bash
docker-compose -f docker-compose.lightweight.yml down
git checkout <старый-коммит>
docker-compose up -d
```

## 📱 Проверка работы

После запуска:

1. Откройте админку: `http://your-server-ip:3000` или ваш домен
2. Войдите как админ
3. Измените баланс пользователя
4. Проверьте, что пользователь получил уведомление в Telegram

## ⚡ Важно!

- Используйте `docker-compose.lightweight.yml` вместо обычного `docker-compose.yml`
- Все файлы уже собраны локально и лежат в git
- Сервер только запускает готовые файлы, БЕЗ сборки

## 🎉 Готово!

После этих команд backend должен запуститься без проблем!

