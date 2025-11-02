# 🚀 Руководство по деплою на продакшн

## 📋 Содержание
1. [Требования к хостингу](#требования-к-хостингу)
2. [Подготовка проекта](#подготовка-проекта)
3. [Настройка сервера](#настройка-сервера)
4. [Деплой через Docker](#деплой-через-docker)
5. [Настройка доменов и SSL](#настройка-доменов-и-ssl)
6. [Настройка Telegram ботов](#настройка-telegram-ботов)
7. [Мониторинг и обслуживание](#мониторинг-и-обслуживание)

---

## 1️⃣ Требования к хостингу

### Минимальные требования:
- **RAM**: 4 GB (рекомендуется 8 GB)
- **CPU**: 2 cores (рекомендуется 4 cores)
- **Диск**: 20 GB SSD
- **OS**: Ubuntu 20.04/22.04 LTS или Debian 11/12
- **Docker**: 24.0+ и Docker Compose 2.0+
- **Домен**: 2 поддомена (например, `app.yourdomain.com` и `api.yourdomain.com`)

### Рекомендуемые провайдеры:
- ✅ **DigitalOcean** - от $12/месяц (4GB RAM, 2 vCPU)
- ✅ **Hetzner** - от €4.5/месяц (4GB RAM, 2 vCPU)
- ✅ **AWS Lightsail** - от $10/месяц
- ✅ **Contabo** - от €6/месяц (8GB RAM, 4 vCPU)
- ✅ **Reg.ru VPS** - от 500₽/месяц

---

## 2️⃣ Подготовка проекта

### Шаг 1: Создайте production .env файл

```bash
# Скопируйте .env в .env.production
cp .env .env.production
```

Отредактируйте `.env.production`:

```bash
# === ОСНОВНЫЕ НАСТРОЙКИ ===
NODE_ENV=production
PORT=3000
FRONTEND_PORT=5173

# === ДОМЕНЫ (ЗАМЕНИТЕ НА СВОИ!) ===
FRONTEND_URL=https://app.yourdomain.com
API_URL=https://api.yourdomain.com

# === БАЗА ДАННЫХ ===
DB_HOST=postgres
DB_PORT=5432
DB_NAME=telegram_bot_db
DB_USER=telegram_bot_user
DB_PASSWORD=ИЗМЕНИТЕ_НА_СЛОЖНЫЙ_ПАРОЛЬ_123

# === JWT ===
JWT_SECRET=ИЗМЕНИТЕ_НА_СЛУЧАЙНУЮ_СТРОКУ_64_СИМВОЛА_МИНИМУМ

# === TELEGRAM БОТЫ ===
TELEGRAM_BOT_TOKEN=8330680651:AAErG1_zzA0aX4_O7s-aaQlcCseLF7i8cIE
ADMIN_BOT_TOKEN=8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro
TELEGRAM_WEB_APP_URL=https://app.yourdomain.com
VITE_TELEGRAM_BOT_USERNAME=your_client_bot_username
VITE_API_URL=https://api.yourdomain.com

# === REDIS ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=ИЗМЕНИТЕ_НА_СЛОЖНЫЙ_ПАРОЛЬ_456

# === MINIO (S3 Storage) ===
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=ИЗМЕНИТЕ_НА_СЛОЖНЫЙ_ПАРОЛЬ_789
MINIO_BUCKET_NAME=telegram-bot-uploads
MINIO_USE_SSL=false

# === БЕЗОПАСНОСТЬ ===
CORS_ORIGIN=https://app.yourdomain.com
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Шаг 2: Создайте docker-compose.production.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: tg-postgres-prod
    restart: always
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: tg-redis-prod
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO Object Storage
  minio:
    image: minio/minio:latest
    container_name: tg-minio-prod
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    container_name: tg-backend-prod
    restart: always
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - app-network
    volumes:
      - ./backend/uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_TELEGRAM_BOT_USERNAME: ${VITE_TELEGRAM_BOT_USERNAME}
    container_name: tg-frontend-prod
    restart: always
    ports:
      - "80:80"
    networks:
      - app-network
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  app-network:
    driver: bridge
```

### Шаг 3: Обновите Dockerfile для production

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ARG VITE_TELEGRAM_BOT_USERNAME

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production with Nginx
FROM nginx:alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Nginx config** (`frontend/nginx.conf`):
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 3️⃣ Настройка сервера

### Подключитесь к серверу:
```bash
ssh root@your-server-ip
```

### Установите необходимое ПО:

```bash
# Обновите систему
apt update && apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установите Docker Compose
apt install docker-compose-plugin -y

# Установите Git
apt install git -y

# Установите Nginx (для reverse proxy)
apt install nginx -y

# Установите Certbot (для SSL)
apt install certbot python3-certbot-nginx -y
```

---

## 4️⃣ Деплой через Docker

### Шаг 1: Загрузите код на сервер

**Вариант A: Через Git**
```bash
# Клонируйте репозиторий
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Или загрузите код
scp -r ./your-project root@your-server-ip:/root/
```

**Вариант B: Через GitHub Actions (рекомендуется)**
Создайте `.github/workflows/deploy.yml` - см. раздел ниже.

### Шаг 2: Настройте .env.production

```bash
# На сервере
cd /root/your-project
nano .env.production

# Заполните все значения!
```

### Шаг 3: Запустите миграции БД

```bash
# Запустите только БД
docker-compose -f docker-compose.production.yml up -d postgres redis minio

# Подождите 10 секунд
sleep 10

# Запустите миграции
docker-compose -f docker-compose.production.yml run --rm backend npm run migration:run

# Создайте seed данные (настройки, тестовые данные)
docker-compose -f docker-compose.production.yml run --rm backend npm run seed
```

### Шаг 4: Добавьте себя как админа

```bash
# Замените YOUR_TELEGRAM_ID на ваш ID
docker-compose -f docker-compose.production.yml run --rm backend npm run cli:add-admin YOUR_TELEGRAM_ID
```

### Шаг 5: Запустите все сервисы

```bash
docker-compose -f docker-compose.production.yml up -d

# Проверьте статус
docker-compose -f docker-compose.production.yml ps

# Проверьте логи
docker-compose -f docker-compose.production.yml logs -f
```

---

## 5️⃣ Настройка доменов и SSL

### Шаг 1: Настройте DNS записи

Добавьте A-записи в вашем DNS:
```
app.yourdomain.com    ->  YOUR_SERVER_IP
api.yourdomain.com    ->  YOUR_SERVER_IP
```

### Шаг 2: Настройте Nginx Reverse Proxy

**Frontend config** (`/etc/nginx/sites-available/frontend`):
```nginx
server {
    listen 80;
    server_name app.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Backend config** (`/etc/nginx/sites-available/backend`):
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Увеличиваем таймауты для длинных запросов
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Активируйте конфиги:
```bash
ln -s /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/

# Проверьте конфигурацию
nginx -t

# Перезапустите Nginx
systemctl restart nginx
```

### Шаг 3: Получите SSL сертификаты

```bash
# Frontend
certbot --nginx -d app.yourdomain.com

# Backend
certbot --nginx -d api.yourdomain.com

# Certbot автоматически настроит SSL и перенаправление с HTTP на HTTPS
```

---

## 6️⃣ Настройка Telegram ботов

### Настройте Webhooks (рекомендуется для продакшна)

**Для клиентского бота:**
```bash
curl -X POST "https://api.telegram.org/bot8330680651:AAErG1_zzA0aX4_O7s-aaQlcCseLF7i8cIE/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.yourdomain.com/webhooks/telegram/user"
  }'
```

**Для админского бота:**
```bash
curl -X POST "https://api.telegram.org/bot8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.yourdomain.com/webhooks/telegram/admin"
  }'
```

### Настройте Menu Button для админ бота

```bash
curl -X POST "https://api.telegram.org/bot8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_button": {
      "type": "web_app",
      "text": "Открыть админку",
      "web_app": {
        "url": "https://app.yourdomain.com"
      }
    }
  }'
```

---

## 7️⃣ Мониторинг и обслуживание

### Настройте автоматический рестарт

```bash
# Docker автоматически перезапустит контейнеры при сбое
# благодаря restart: always в docker-compose.production.yml
```

### Логирование

```bash
# Просмотр логов
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend

# Логи за последний час
docker-compose -f docker-compose.production.yml logs --since 1h backend

# Сохранить логи в файл
docker-compose -f docker-compose.production.yml logs backend > backend.log
```

### Резервное копирование

**Создайте скрипт бэкапа** (`backup.sh`):
```bash
#!/bin/bash

BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Создайте директорию для бэкапов
mkdir -p $BACKUP_DIR

# Бэкап PostgreSQL
docker exec tg-postgres-prod pg_dump -U telegram_bot_user telegram_bot_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Бэкап MinIO data
docker exec tg-minio-prod tar czf - /data | cat > "$BACKUP_DIR/minio_$DATE.tar.gz"

# Удаляйте старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Сделайте скрипт исполняемым:
```bash
chmod +x backup.sh
```

Настройте cron для автоматических бэкапов:
```bash
crontab -e

# Добавьте (бэкап каждый день в 3:00)
0 3 * * * /root/your-project/backup.sh >> /root/backups/backup.log 2>&1
```

### Обновление приложения

```bash
cd /root/your-project

# Получите последние изменения
git pull origin main

# Пересоберите и перезапустите
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Запустите миграции (если есть новые)
docker-compose -f docker-compose.production.yml run --rm backend npm run migration:run
```

---

## 🔒 Чеклист безопасности

- [ ] Изменены все пароли в `.env.production`
- [ ] JWT_SECRET сгенерирован (минимум 64 символа)
- [ ] Настроен файрвол (UFW):
  ```bash
  ufw allow 22/tcp   # SSH
  ufw allow 80/tcp   # HTTP
  ufw allow 443/tcp  # HTTPS
  ufw enable
  ```
- [ ] SSH доступ только по ключу (отключен пароль)
- [ ] Настроен fail2ban для защиты от брутфорса
- [ ] SSL сертификаты установлены
- [ ] CORS настроен только на ваш домен
- [ ] Rate limiting включен
- [ ] Логи ротируются

---

## 📊 Мониторинг производительности

### Установите мониторинг (опционально)

```bash
# Установите ctop для мониторинга контейнеров
wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
chmod +x /usr/local/bin/ctop

# Запустите
ctop
```

---

## 🎉 Готово!

Ваше приложение теперь работает на:
- **Frontend**: https://app.yourdomain.com
- **Backend API**: https://api.yourdomain.com

### Проверьте что всё работает:
1. ✅ Откройте https://app.yourdomain.com в браузере
2. ✅ Откройте админ бота в Telegram и нажмите Menu Button
3. ✅ Проверьте что данные загружаются
4. ✅ Проверьте что клиентский бот отвечает

---

## 🆘 Помощь

Если что-то не работает:
1. Проверьте логи: `docker-compose -f docker-compose.production.yml logs -f`
2. Проверьте статус: `docker-compose -f docker-compose.production.yml ps`
3. Проверьте Nginx: `nginx -t && systemctl status nginx`
4. Проверьте DNS: `nslookup app.yourdomain.com`

---

**Готово к деплою!** 🚀


