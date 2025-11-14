# Telegram Mini App - Production Ready

Полноценное продакшн-готовое приложение с Telegram ботами, админ-панелью и автоматическим деплоем.

## 📋 Содержание

- [Локальная разработка](#локальная-разработка)
- [Технологический стек](#технологический-стек)
- [Требования](#требования)
- [Быстрый старт](#быстрый-старт)
- [Структура проекта](#структура-проекта)
- [Деплой на сервер](#деплой-на-сервер)
- [SSL сертификаты](#ssl-сертификаты)
- [Обслуживание](#обслуживание)
- [Команды](#команды)

---

## 💻 Локальная разработка

### Требования
- **Docker Desktop** для Windows/Mac или Docker для Linux
- **Git**

### Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone <repository-url>
cd tg-main

# 2. Запустить все сервисы
docker compose -f docker-compose.dev.yml up -d --build

# 3. Выполнить миграции и инициализацию
docker exec tg-backend-dev npm run migration:run
docker exec tg-backend-dev npm run seed
```

### Доступные сервисы

После запуска вы можете получить доступ к:

| Сервис | URL | Описание |
|--------|-----|----------|
| **Frontend** | http://localhost:5173 | Админ панель (React + Vite) |
| **Backend API** | http://localhost:3000 | REST API (NestJS) |
| **API Docs** | http://localhost:3000/api/docs | Swagger документация |
| **MinIO Console** | http://localhost:9003 | Объектное хранилище |
| **PostgreSQL** | localhost:5433 | База данных |
| **Redis** | localhost:6380 | Кеш и очереди |

### Учетные данные

**MinIO:**
- Логин: `minioadmin`
- Пароль: `minioadmin_secure_password_change_me`

**PostgreSQL:**
- Host: `localhost:5433`
- Database: `postgres`
- User: `postgres`
- Password: `postgres`

**Тестовый админ (из seed):**
- Telegram ID: `6971844353`
- Username: `nabi_arabic`
- Role: `superadmin`

### Добавление нового админа

```bash
docker exec tg-backend-dev npm run cli:add-admin <ВАШ_TELEGRAM_ID>
```

### Полезные команды разработки

```bash
# Просмотр логов backend
docker compose -f docker-compose.dev.yml logs -f backend

# Просмотр логов frontend
docker compose -f docker-compose.dev.yml logs -f frontend

# Просмотр логов всех сервисов
docker compose -f docker-compose.dev.yml logs -f

# Остановить все сервисы
docker compose -f docker-compose.dev.yml down

# Перезапустить сервисы
docker compose -f docker-compose.dev.yml restart

# Пересобрать и перезапустить
docker compose -f docker-compose.dev.yml up -d --build

# Выполнить миграции
docker exec tg-backend-dev npm run migration:run

# Создать новую миграцию
docker exec tg-backend-dev npm run migration:generate -- src/migrations/MigrationName

# Откатить миграцию
docker exec tg-backend-dev npm run migration:revert

# Пересоздать seed данные
docker exec tg-backend-dev npm run seed
```

### Структура для разработки

Все изменения в коде автоматически отслеживаются благодаря volume монтированию:

- `./backend` → `/app` (backend контейнер)
- `./frontend` → `/app` (frontend контейнер)

Backend работает с `--watch` флагом (auto-reload), frontend использует Vite HMR.

### Отладка

**Backend:**
- Логи доступны через `docker compose logs -f backend`
- NestJS работает в режиме watch с автоперезагрузкой
- Swagger UI доступен по адресу http://localhost:3000/api/docs

**Frontend:**
- Vite dev server с HMR
- Логи доступны через `docker compose logs -f frontend`
- React DevTools работает в браузере

**База данных:**
```bash
# Подключение к PostgreSQL
docker exec -it tg-postgres-dev psql -U postgres -d postgres

# Просмотр таблиц
\dt

# Выход
\q
```

**Redis:**
```bash
# Подключение к Redis
docker exec -it tg-redis-dev redis-cli -a redis_secure_password_change_me

# Просмотр всех ключей
KEYS *

# Выход
exit
```

---

## 🚀 Технологический стек

### Backend
- **NestJS** - Node.js фреймворк
- **TypeORM** - ORM для работы с БД
- **PostgreSQL** - Реляционная база данных
- **Redis** - Кеш и очереди (BullMQ)
- **MinIO** - Объектное хранилище для медиа файлов
- **Telegram Bot API** - Интеграция с Telegram

### Frontend
- **React** - UI библиотека
- **Vite** - Сборщик
- **TypeScript** - Типизация
- **Zustand** - Управление состоянием
- **React Query** - Работа с API
- **Socket.IO** - WebSocket соединение

### Infrastructure
- **Docker & Docker Compose** - Контейнеризация
- **Nginx** - Reverse proxy и веб-сервер
- **Let's Encrypt (Certbot)** - SSL сертификаты
- **systemd** - Автозапуск сервисов

---

## 📦 Требования

- **Ubuntu 20.04+** (или другой Linux)
- **Docker** 20.10+
- **Docker Compose** v2.0+
- **Git**
- Доменные имена с настроенными DNS записями:
  - `api.marranasuete.ru` → IP сервера
  - `app.marranasuete.ru` → IP сервера

---

## ⚡ Быстрый старт

### 1. Клонирование репозитория

```bash
git clone <repository-url> /root/tg-main
cd /root/tg-main
```

### 2. Настройка переменных окружения

```bash
# Скопировать env.production в .env
cp env.production .env

# Отредактировать .env (установить пароли, токены)
nano .env
```

**Важные переменные для изменения:**
- `JWT_SECRET` - секретный ключ (мин. 32 символа)
- `REDIS_PASSWORD` - пароль для Redis
- `MINIO_SECRET_KEY` - пароль для MinIO
- `DB_PASSWORD` - пароль для PostgreSQL (опционально)

### 3. Запуск приложения

```bash
# Сделать скрипты исполняемыми
chmod +x scripts/*.sh setup-ssl.sh

# Запустить деплой
./scripts/deploy.sh
```

### 4. Настройка SSL сертификатов

```bash
# Запустить автоматическую настройку SSL
./setup-ssl.sh
```

### 5. Установка автозапуска

```bash
# Установить systemd сервис
sudo ./scripts/install-systemd-service.sh
```

---

## 📁 Структура проекта

```
tg-main/
├── backend/                 # NestJS бэкенд
│   ├── src/
│   │   ├── modules/        # Модули приложения
│   │   ├── entities/       # TypeORM сущности
│   │   ├── migrations/     # Миграции БД
│   │   └── config/         # Конфигурация
│   ├── Dockerfile
│   └── package.json
│
├── frontend/               # React фронтенд
│   ├── src/
│   │   ├── pages/         # Страницы
│   │   ├── components/    # Компоненты
│   │   ├── api/           # API клиент
│   │   └── store/         # Zustand стор
│   ├── Dockerfile
│   └── package.json
│
├── nginx/                  # Nginx конфигурация
│   ├── nginx.conf         # Главный конфиг
│   ├── conf.d/
│   │   ├── api.conf       # API домен (HTTPS)
│   │   └── app.conf       # Frontend домен (HTTPS)
│   └── certbot/           # SSL сертификаты
│
├── scripts/               # Скрипты управления
│   ├── deploy.sh         # Полный деплой
│   ├── update.sh         # Обновление
│   ├── init-ssl-http.sh  # Инициализация HTTP режима
│   ├── enable-ssl.sh     # Включение HTTPS
│   └── install-systemd-service.sh
│
├── systemd/              # systemd сервисы
│   └── tg-app.service
│
├── docker-compose.yml    # Docker Compose конфиг
├── env.production        # Шаблон переменных окружения
├── setup-ssl.sh         # Настройка SSL
└── README.md            # Эта документация
```

---

## 🌐 Деплой на сервер

### Подготовка сервера

```bash
# 1. Обновить систему
sudo apt update && sudo apt upgrade -y

# 2. Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Установить Docker Compose
sudo apt install docker-compose-plugin -y

# 4. Установить Git
sudo apt install git -y

# 5. Настроить firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### Настройка DNS

Убедитесь, что DNS записи настроены:

```
api.marranasuete.ru  →  A  →  79.174.93.115
app.marranasuete.ru  →  A  →  79.174.93.115
```

### Первый деплой

```bash
# 1. Клонировать репозиторий
cd /root
git clone <repository-url> tg-main
cd tg-main

# 2. Создать .env
cp env.production .env
nano .env  # отредактировать переменные

# 3. Сделать скрипты исполняемыми
chmod +x scripts/*.sh setup-ssl.sh

# 4. Запустить деплой
./scripts/deploy.sh

# 5. Настроить SSL (после проверки работы по HTTP)
./setup-ssl.sh

# 6. Установить автозапуск
sudo ./scripts/install-systemd-service.sh
```

---

## 🔒 SSL сертификаты

### Автоматическая настройка

```bash
./setup-ssl.sh
```

Скрипт автоматически:
1. Проверяет DNS резолвинг
2. Получает сертификаты для обоих доменов
3. Настраивает HTTPS конфиги
4. Перезагружает Nginx
5. Включает автоматическое обновление

### Ручное обновление сертификатов

```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

### Проверка сертификатов

```bash
# Проверить срок действия
docker compose run --rm certbot certificates
```

---

## 🛠 Обслуживание

### Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Конкретный сервис
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# Логи systemd сервиса
sudo journalctl -u tg-app -f
```

### Обновление приложения

```bash
# Быстрое обновление (pull + rebuild)
./scripts/update.sh

# Или вручную
git pull
docker compose down
docker compose up -d --build
```

### Запуск миграций

```bash
# Автоматический запуск (через TypeORM)
docker compose exec backend npm run migration:run

# Откат последней миграции
docker compose exec backend npm run migration:revert

# Создание новой миграции
docker compose exec backend npm run migration:create -- MigrationName
```

### Резервное копирование БД

```bash
# Создать backup
docker compose exec postgres pg_dump -U postgres postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить backup
docker compose exec -T postgres psql -U postgres postgres < backup.sql
```

### Очистка Docker

```bash
# Удалить неиспользуемые образы
docker system prune -a

# Удалить volumes (ВНИМАНИЕ: удалит данные БД!)
docker compose down -v
```

---

## 📝 Команды

### Docker Compose

```bash
# Запуск всех сервисов
docker compose up -d

# Остановка всех сервисов
docker compose down

# Пересборка и запуск
docker compose up -d --build

# Перезапуск конкретного сервиса
docker compose restart backend

# Просмотр статуса
docker compose ps

# Выполнение команды в контейнере
docker compose exec backend npm run migration:run
```

### systemd сервис

```bash
# Запуск
sudo systemctl start tg-app

# Остановка
sudo systemctl stop tg-app

# Перезапуск
sudo systemctl restart tg-app

# Статус
sudo systemctl status tg-app

# Логи
sudo journalctl -u tg-app -f

# Отключить автозапуск
sudo systemctl disable tg-app

# Включить автозапуск
sudo systemctl enable tg-app
```

### Nginx

```bash
# Проверка конфигурации
docker compose exec nginx nginx -t

# Перезагрузка конфигурации
docker compose exec nginx nginx -s reload

# Просмотр логов доступа
docker compose exec nginx tail -f /var/log/nginx/access.log

# Просмотр логов ошибок
docker compose exec nginx tail -f /var/log/nginx/error.log
```

---

## 🔍 Проверка работоспособности

После деплоя проверьте:

### 1. Контейнеры запущены
```bash
docker compose ps
# Все сервисы должны быть в статусе "Up" или "healthy"
```

### 2. API доступен
```bash
curl https://api.marranasuete.ru/api/docs
# Должен вернуть Swagger документацию
```

### 3. Frontend доступен
```bash
curl https://app.marranasuete.ru
# Должен вернуть HTML страницу
```

### 4. SSL сертификаты валидны
```bash
curl -I https://api.marranasuete.ru
# Проверьте заголовок "Server"
```

### 5. База данных работает
```bash
docker compose exec backend npm run migration:run
# Должно выполниться без ошибок
```

---

## 🚨 Troubleshooting

### Проблема: Контейнер не запускается

```bash
# Проверить логи
docker compose logs [service-name]

# Пересобрать образ
docker compose up -d --build [service-name]
```

### Проблема: SSL сертификат не получается

```bash
# Проверить DNS
nslookup api.marranasuete.ru

# Проверить доступность порта 80
curl http://api.marranasuete.ru/.well-known/acme-challenge/

# Попробовать получить сертификат вручную
docker compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d api.marranasuete.ru
```

### Проблема: База данных недоступна

```bash
# Проверить статус PostgreSQL
docker compose exec postgres pg_isready -U postgres

# Перезапустить PostgreSQL
docker compose restart postgres

# Проверить логи
docker compose logs postgres
```

---

## 📞 Контакты и поддержка

- **Сервер:** root@79.174.93.115
- **API Domain:** api.marranasuete.ru
- **APP Domain:** app.marranasuete.ru

---

## 📄 Лицензия

MIT License

---

## ✅ Checklist перед деплоем

- [ ] DNS записи настроены и резолвятся
- [ ] .env файл создан и заполнен
- [ ] JWT_SECRET изменён на уникальный
- [ ] Пароли изменены (Redis, MinIO, PostgreSQL)
- [ ] Docker и Docker Compose установлены
- [ ] Firewall настроен (порты 80, 443 открыты)
- [ ] SSL сертификаты получены
- [ ] systemd сервис установлен
- [ ] Telegram боты настроены
- [ ] Миграции БД выполнены

---

**Успешного деплоя! 🚀**

