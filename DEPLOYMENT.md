# Production Deployment Guide

Подробное руководство по деплою на production сервер Ubuntu.

## 📋 Информация о сервере

- **IP:** 79.174.93.115
- **User:** root
- **OS:** Ubuntu
- **Domains:**
  - API: api.marranasuete.ru
  - Frontend: app.marranasuete.ru

---

## 🚀 Шаг 1: Подготовка сервера

### 1.1. Подключение к серверу

```bash
ssh root@79.174.93.115
```

### 1.2. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3. Установка Docker

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Проверка установки
docker --version
```

### 1.4. Установка Docker Compose

```bash
# Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Проверка установки
docker compose version
```

### 1.5. Установка Git

```bash
sudo apt install git -y
git --version
```

### 1.6. Настройка Firewall

```bash
# Установка UFW (если не установлен)
sudo apt install ufw -y

# Разрешить SSH (ВАЖНО!)
sudo ufw allow 22/tcp

# Разрешить HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включить firewall
sudo ufw --force enable

# Проверить статус
sudo ufw status
```

---

## 📦 Шаг 2: Клонирование проекта

```bash
# Перейти в директорию root
cd /root

# Клонировать репозиторий
git clone <YOUR_REPOSITORY_URL> tg-main

# Перейти в директорию проекта
cd tg-main
```

---

## ⚙️ Шаг 3: Настройка переменных окружения

```bash
# Скопировать шаблон
cp env.production .env

# Отредактировать .env
nano .env
```

### Обязательные изменения в .env:

```bash
# ВАЖНО: Изменить JWT_SECRET на случайную строку (мин. 32 символа)
JWT_SECRET=your-very-secure-random-jwt-secret-key-change-this-now-32-chars-min

# Установить надёжные пароли
REDIS_PASSWORD=your_secure_redis_password_here
MINIO_SECRET_KEY=your_secure_minio_password_here
DB_PASSWORD=your_secure_postgres_password_here

# Email для Let's Encrypt
LETSENCRYPT_EMAIL=admin@marranasuete.ru
```

**Сохранить и выйти:** `Ctrl+X`, затем `Y`, затем `Enter`

---

## 🏗️ Шаг 4: Первый запуск (HTTP режим)

```bash
# Сделать скрипты исполняемыми
chmod +x scripts/*.sh setup-ssl.sh

# Запустить деплой
./scripts/deploy.sh
```

### Что происходит:
1. ✅ Проверка Docker и Docker Compose
2. ✅ Создание необходимых директорий
3. ✅ Остановка старых контейнеров (если есть)
4. ✅ Сборка и запуск контейнеров
5. ✅ Проверка здоровья сервисов
6. ✅ Запуск миграций БД

### Проверка работы:

```bash
# Проверить статус контейнеров
docker compose ps

# Все должны быть "Up" или "healthy"
```

```bash
# Проверить API (по HTTP, пока без SSL)
curl http://api.marranasuete.ru/api/docs

# Проверить Frontend
curl http://app.marranasuete.ru
```

---

## 🔒 Шаг 5: Настройка SSL сертификатов

### 5.1. Проверка DNS

Убедитесь, что домены резолвятся:

```bash
nslookup api.marranasuete.ru
nslookup app.marranasuete.ru
```

Оба должны указывать на IP сервера: `79.174.93.115`

### 5.2. Запуск настройки SSL

```bash
./setup-ssl.sh
```

### Что происходит:
1. ✅ Проверка DNS резолвинга
2. ✅ Получение SSL сертификатов через Let's Encrypt
3. ✅ Активация HTTPS конфигураций Nginx
4. ✅ Перезагрузка Nginx
5. ✅ Настройка автоматического обновления (каждые 12 часов)

### Проверка SSL:

```bash
# Проверить API по HTTPS
curl -I https://api.marranasuete.ru

# Проверить Frontend по HTTPS
curl -I https://app.marranasuete.ru
```

---

## 🔄 Шаг 6: Настройка автозапуска

```bash
# Установить systemd сервис
sudo ./scripts/install-systemd-service.sh
```

### Проверка автозапуска:

```bash
# Проверить статус сервиса
sudo systemctl status tg-app

# Перезагрузить сервер (опционально)
sudo reboot

# После перезагрузки проверить что всё запустилось
ssh root@79.174.93.115
docker compose ps
```

---

## ✅ Шаг 7: Финальная проверка

### 7.1. Проверка контейнеров

```bash
docker compose ps
```

Должны работать:
- ✅ tg-postgres (healthy)
- ✅ tg-redis (healthy)
- ✅ tg-minio (healthy)
- ✅ tg-backend (healthy)
- ✅ tg-frontend (healthy)
- ✅ tg-nginx (healthy)
- ✅ tg-certbot (running)

### 7.2. Проверка доступности

```bash
# API Documentation
https://api.marranasuete.ru/api/docs

# Frontend
https://app.marranasuete.ru
```

### 7.3. Проверка Telegram ботов

Отправьте `/start` боту:
- `@thtgmoneybot` (клиентский бот)
- `@lrtelegram_mgbot` (админ бот)

---

## 🔄 Обновление приложения

### Автоматическое обновление

```bash
cd /root/tg-main
./scripts/update.sh
```

### Ручное обновление

```bash
cd /root/tg-main

# Получить последние изменения
git pull

# Остановить контейнеры
docker compose down

# Пересобрать и запустить
docker compose up -d --build

# Запустить миграции
docker compose exec backend npm run migration:run
```

---

## 📊 Мониторинг

### Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Backend
docker compose logs -f backend

# Frontend
docker compose logs -f frontend

# Nginx
docker compose logs -f nginx

# PostgreSQL
docker compose logs -f postgres
```

### Проверка ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
df -h

# Использование памяти
free -h
```

---

## 🔧 Полезные команды

### Управление сервисом

```bash
# Запуск
sudo systemctl start tg-app

# Остановка
sudo systemctl stop tg-app

# Перезапуск
sudo systemctl restart tg-app

# Статус
sudo systemctl status tg-app
```

### Управление контейнерами

```bash
# Перезапуск конкретного сервиса
docker compose restart backend

# Выполнение команды в контейнере
docker compose exec backend sh

# Просмотр логов с временными метками
docker compose logs -f --timestamps backend
```

### База данных

```bash
# Подключение к PostgreSQL
docker compose exec postgres psql -U postgres

# Резервное копирование
docker compose exec postgres pg_dump -U postgres postgres > backup.sql

# Восстановление
docker compose exec -T postgres psql -U postgres postgres < backup.sql
```

---

## 🚨 Troubleshooting

### Проблема 1: Контейнер не запускается

```bash
# Проверить логи
docker compose logs [service-name]

# Удалить контейнер и пересоздать
docker compose rm -f [service-name]
docker compose up -d [service-name]
```

### Проблема 2: Не удается получить SSL сертификат

```bash
# Проверить DNS
nslookup api.marranasuete.ru

# Проверить доступность по порту 80
curl http://api.marranasuete.ru/.well-known/acme-challenge/test

# Проверить логи certbot
docker compose logs certbot

# Попробовать получить сертификат вручную
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@marranasuete.ru \
  --agree-tos \
  --no-eff-email \
  -d api.marranasuete.ru
```

### Проблема 3: Backend не подключается к БД

```bash
# Проверить статус PostgreSQL
docker compose exec postgres pg_isready -U postgres

# Проверить переменные окружения
docker compose exec backend env | grep DB_

# Перезапустить базу данных
docker compose restart postgres

# Подождать и перезапустить backend
sleep 10
docker compose restart backend
```

### Проблема 4: Nginx возвращает 502 Bad Gateway

```bash
# Проверить статус backend
docker compose ps backend

# Проверить логи backend
docker compose logs backend

# Проверить логи nginx
docker compose logs nginx

# Проверить конфигурацию nginx
docker compose exec nginx nginx -t

# Перезапустить nginx
docker compose restart nginx
```

---

## 📞 Поддержка

**Сервер:** root@79.174.93.115

**Домены:**
- API: https://api.marranasuete.ru
- Frontend: https://app.marranasuete.ru

---

## ✅ Checklist деплоя

- [ ] Сервер подготовлен (Docker, Docker Compose, Git)
- [ ] Firewall настроен (порты 22, 80, 443)
- [ ] DNS записи настроены
- [ ] Проект склонирован в /root/tg-main
- [ ] .env файл создан и заполнен
- [ ] JWT_SECRET и пароли изменены
- [ ] Контейнеры запущены (./scripts/deploy.sh)
- [ ] HTTP режим работает
- [ ] SSL сертификаты получены (./setup-ssl.sh)
- [ ] HTTPS режим работает
- [ ] systemd сервис установлен
- [ ] Автозапуск работает (проверено перезагрузкой)
- [ ] Telegram боты отвечают
- [ ] Миграции БД выполнены

---

**Успешного деплоя! 🚀**

