# 🚀 DEPLOYMENT GUIDE

## 📋 Содержание

1. [Локальная разработка](#локальная-разработка)
2. [Staging деплой](#staging-деплой)
3. [Production деплой](#production-деплой)
4. [Откат (Rollback)](#откат-rollback)
5. [Troubleshooting](#troubleshooting)

---

## 🏠 Локальная разработка

### Prerequisites

```bash
# Проверьте версии
node --version   # >= 18.0.0
npm --version    # >= 9.0.0
docker --version # >= 20.0.0
git --version    # >= 2.0.0
```

### Быстрый старт

```bash
# 1. Клонирование
git clone <repository-url>
cd tg-main

# 2. Создание .env
cp env.example.txt .env
# Отредактируйте .env:
# - Добавьте TELEGRAM_BOT_TOKEN
# - Установите сильный JWT_SECRET

# 3. Запуск инфраструктуры
docker-compose up -d postgres redis minio

# 4. Backend setup
cd backend
npm install
npm run migration:run
npm run seed
npm run cli:add-admin  # Создать первого админа

# 5. Backend запуск
npm run start:dev

# 6. Frontend setup (в новом терминале)
cd ../frontend
npm install
npm run dev

# 7. Настройка Telegram webhook (в новом терминале)
# Установите ngrok: https://ngrok.com/download
ngrok http 3000
# Скопируйте URL (https://xxxx.ngrok-free.app)

cd backend
npm run setup-webhook
# Введите bot token и ngrok URL
```

### Проверка работоспособности

1. **Backend**: http://localhost:3000/api/docs (Swagger)
2. **Frontend**: http://localhost:5173
3. **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
4. **Telegram Bot**: Отправьте /start боту

### Остановка

```bash
# Остановить docker сервисы
docker-compose down

# Сохранить данные
docker-compose down  # volumes сохраняются

# Удалить все данные
docker-compose down -v
```

---

## 🧪 Staging деплой

### Архитектура Staging

```
Internet → Nginx (443) → Backend (3000)
                      → Frontend (5173)
                      → PostgreSQL (5432)
                      → Redis (6379)
                      → MinIO (9000)
```

### 1. Подготовка сервера

```bash
# SSH к staging серверу
ssh user@staging.yourdomain.com

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка
docker --version
docker-compose --version
```

### 2. Подготовка environment

```bash
# Клонировать репозиторий
git clone <repository-url> /opt/tg-app
cd /opt/tg-app

# Создать .env для staging
cat > .env << EOF
NODE_ENV=staging
BACKEND_PORT=3000
FRONTEND_PORT=5173

# Database
DATABASE_URL=postgresql://tguser:STRONG_PASSWORD@postgres:5432/tg_app_staging
POSTGRES_USER=tguser
POSTGRES_PASSWORD=STRONG_PASSWORD
POSTGRES_DB=tg_app_staging

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Telegram
TELEGRAM_BOT_TOKEN=YOUR_STAGING_BOT_TOKEN
TELEGRAM_WEBHOOK_URL=https://staging.yourdomain.com/api/bot/webhook
TELEGRAM_BOT_USERNAME=YourStagingBot

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$(openssl rand -base64 24)
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=$(openssl rand -base64 24)
MINIO_BUCKET=telegram-media
MINIO_USE_SSL=false

# Frontend
VITE_API_URL=https://staging.yourdomain.com
VITE_TELEGRAM_BOT_USERNAME=YourStagingBot
EOF

# Защитить .env
chmod 600 .env
```

### 3. Настройка Nginx

```bash
# Установить Nginx
sudo apt update
sudo apt install nginx

# SSL сертификат (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d staging.yourdomain.com

# Nginx конфигурация
sudo nano /etc/nginx/sites-available/tg-app-staging
```

```nginx
# /etc/nginx/sites-available/tg-app-staging
upstream backend {
    server localhost:3000;
}

upstream frontend {
    server localhost:5173;
}

server {
    listen 80;
    server_name staging.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/staging.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активировать конфигурацию
sudo ln -s /etc/nginx/sites-available/tg-app-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Первый деплой

```bash
cd /opt/tg-app

# Запустить сервисы
docker-compose up -d

# Проверить статус
docker-compose ps

# Проверить логи
docker-compose logs -f backend

# Применить миграции
docker-compose exec backend npm run migration:run

# Создать тестовые данные
docker-compose exec backend npm run seed

# Создать первого админа
docker-compose exec backend npm run cli:add-admin

# Настроить webhook
docker-compose exec backend npm run setup-webhook
```

### 5. Smoke тесты

```bash
# Health check
curl https://staging.yourdomain.com/api/health

# Backend swagger
open https://staging.yourdomain.com/api/docs

# Frontend
open https://staging.yourdomain.com

# Telegram bot
# Отправьте /start боту в Telegram
```

### 6. Обновление staging

```bash
cd /opt/tg-app

# Backup БД перед обновлением
docker-compose exec postgres pg_dump -U tguser tg_app_staging > backup_$(date +%Y%m%d_%H%M%S).sql

# Pull изменений
git pull origin main

# Rebuild и restart
docker-compose down
docker-compose up -d --build

# Применить миграции
docker-compose exec backend npm run migration:run

# Проверить логи
docker-compose logs -f
```

---

## 🏭 Production деплой

### ⚠️ ВАЖНО: Чеклист перед production деплоем

- [ ] Staging работает стабильно минимум 24 часа
- [ ] Все тесты проходят
- [ ] Security audit пройден
- [ ] Load testing выполнен
- [ ] Backup стратегия готова
- [ ] Rollback план готов
- [ ] Мониторинг настроен
- [ ] Получено одобрение

### 1. Подготовка production сервера

**Минимальные требования**:
- CPU: 2+ cores
- RAM: 4+ GB
- Disk: 50+ GB SSD
- OS: Ubuntu 22.04 LTS

```bash
# SSH к production серверу
ssh user@yourdomain.com

# Установка Docker (аналогично staging)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Production environment

```bash
cd /opt/tg-app

# Создать production .env
cat > .env << EOF
NODE_ENV=production
BACKEND_PORT=3000
FRONTEND_PORT=5173

# Database (используйте managed DB если возможно)
DATABASE_URL=postgresql://prod_user:VERY_STRONG_PASSWORD@postgres:5432/tg_app_prod
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=VERY_STRONG_PASSWORD_$(openssl rand -base64 32)
POSTGRES_DB=tg_app_prod

# Redis (используйте managed Redis если возможно)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$(openssl rand -base64 32)

# JWT - КРИТИЧНО СИЛЬНЫЙ
JWT_SECRET=$(openssl rand -base64 48)
JWT_EXPIRES_IN=7d

# Telegram - PRODUCTION BOT
TELEGRAM_BOT_TOKEN=YOUR_PRODUCTION_BOT_TOKEN
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/bot/webhook
TELEGRAM_BOT_USERNAME=YourProductionBot

# MinIO (или используйте AWS S3)
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=admin_$(openssl rand -base64 16)
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)
MINIO_ACCESS_KEY=admin_$(openssl rand -base64 16)
MINIO_SECRET_KEY=$(openssl rand -base64 32)
MINIO_BUCKET=telegram-media-prod
MINIO_USE_SSL=false

# Frontend
VITE_API_URL=https://yourdomain.com
VITE_TELEGRAM_BOT_USERNAME=YourProductionBot

# App settings
MIN_DEPOSIT=10
MIN_WITHDRAW=20
REF_BONUS=5
WORK_COOLDOWN_SEC=3600

# Monitoring
LOG_LEVEL=info
EOF

# Защитить .env
chmod 600 .env
chown root:root .env
```

### 3. Production Nginx

```nginx
# /etc/nginx/sites-available/tg-app-production
upstream backend {
    server localhost:3000;
    keepalive 32;
}

upstream frontend {
    server localhost:5173;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=30r/m;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://yourdomain.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.yourdomain.com;
    return 301 https://yourdomain.com$request_uri;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;

    # Webhook with rate limiting
    location /api/bot/webhook {
        limit_req zone=webhook_limit burst=5 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API with rate limiting
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check (без rate limit)
    location /api/health {
        proxy_pass http://backend;
        access_log off;
    }
}
```

### 4. Production деплой процесс

```bash
cd /opt/tg-app

# 1. BACKUP - КРИТИЧНО!
echo "=== CREATING BACKUP ==="
docker-compose exec postgres pg_dump -U prod_user -Fc tg_app_prod > /backups/tg_app_prod_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
ls -lh /backups/

# 2. Pull latest code
echo "=== PULLING LATEST CODE ==="
git fetch --all
git checkout main
git pull origin main

# 3. Build images
echo "=== BUILDING DOCKER IMAGES ==="
docker-compose build --no-cache

# 4. Stop old version (optional: use rolling update instead)
echo "=== STOPPING OLD VERSION ==="
docker-compose down

# 5. Start new version
echo "=== STARTING NEW VERSION ==="
docker-compose up -d

# 6. Wait for services to be ready
echo "=== WAITING FOR SERVICES ==="
sleep 30

# 7. Run migrations
echo "=== RUNNING MIGRATIONS ==="
docker-compose exec backend npm run migration:run

# 8. Health check
echo "=== HEALTH CHECK ==="
curl -f https://yourdomain.com/api/health || echo "FAILED"

# 9. Check logs
echo "=== CHECKING LOGS ==="
docker-compose logs --tail=50 backend

# 10. Setup webhook
echo "=== SETTING UP WEBHOOK ==="
docker-compose exec backend npm run setup-webhook
```

### 5. Post-deployment verification

```bash
# Health check
curl https://yourdomain.com/api/health

# API docs
open https://yourdomain.com/api/docs

# Frontend
open https://yourdomain.com

# Check logs for errors
docker-compose logs --tail=100 backend | grep ERROR
docker-compose logs --tail=100 frontend | grep ERROR

# Database connections
docker-compose exec postgres psql -U prod_user -d tg_app_prod -c "SELECT COUNT(*) FROM users;"

# Redis connection
docker-compose exec redis redis-cli ping

# MinIO health
curl http://localhost:9000/minio/health/live
```

### 6. Мониторинг (первые 2 часа)

```bash
# CPU / Memory usage
docker stats

# Application logs (в реальном времени)
docker-compose logs -f backend

# Error logs
docker-compose logs backend | grep -i error

# Database connections
docker-compose exec postgres psql -U prod_user -d tg_app_prod -c "SELECT count(*) FROM pg_stat_activity WHERE datname='tg_app_prod';"

# Redis info
docker-compose exec redis redis-cli info stats
```

---

## ⏮️ Откат (Rollback)

### Быстрый откат (< 5 минут)

```bash
cd /opt/tg-app

# 1. Stop current version
docker-compose down

# 2. Checkout previous version
git log --oneline -5  # Найти предыдущий commit
git checkout <previous-commit-hash>

# 3. Revert migrations (если были)
# Узнать сколько миграций откатить
docker-compose up -d postgres
docker-compose exec postgres psql -U prod_user -d tg_app_prod -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"

# Откатить N миграций
docker-compose exec backend npm run migration:revert  # Повторить N раз

# 4. Start previous version
docker-compose up -d

# 5. Health check
curl https://yourdomain.com/api/health

# 6. Verify functionality
# - Check frontend loads
# - Test bot /start command
# - Check admin panel login
```

### Полный откат с восстановлением БД

```bash
cd /opt/tg-app

# 1. Stop все сервисы
docker-compose down

# 2. Restore database от backup
# Найти последний working backup
ls -lht /backups/ | head -5

# Restore
docker-compose up -d postgres
sleep 10

# Drop current database (ОСТОРОЖНО!)
docker-compose exec postgres psql -U prod_user -c "DROP DATABASE tg_app_prod;"
docker-compose exec postgres psql -U prod_user -c "CREATE DATABASE tg_app_prod;"

# Restore from dump
docker-compose exec -T postgres pg_restore -U prod_user -d tg_app_prod < /backups/tg_app_prod_YYYYMMDD_HHMMSS.dump

# 3. Checkout working version
git checkout <working-commit-hash>

# 4. Start services
docker-compose up -d

# 5. Verify
curl https://yourdomain.com/api/health
```

### Откат Nginx конфигурации

```bash
# Если проблемы с Nginx
sudo cp /etc/nginx/sites-available/tg-app-production /etc/nginx/sites-available/tg-app-production.broken
sudo nano /etc/nginx/sites-available/tg-app-production
# Откатить изменения

sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔧 Troubleshooting

### Backend не стартует

```bash
# Проверить логи
docker-compose logs backend

# Проверить environment
docker-compose exec backend printenv

# Проверить подключение к БД
docker-compose exec postgres psql -U prod_user -d tg_app_prod -c "SELECT 1;"

# Проверить подключение к Redis
docker-compose exec redis redis-cli ping

# Restart backend
docker-compose restart backend
```

### Frontend не загружается

```bash
# Проверить логи
docker-compose logs frontend

# Проверить сборку
docker-compose exec frontend npm run build

# Проверить Nginx
sudo nginx -t
sudo systemctl status nginx

# Проверить CORS headers
curl -I https://yourdomain.com
```

### Telegram webhook не работает

```bash
# Проверить webhook info
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Удалить webhook
curl https://api.telegram.org/bot<TOKEN>/deleteWebhook

# Установить заново
docker-compose exec backend npm run setup-webhook

# Проверить логи при отправке /start
docker-compose logs -f backend
```

### Database миграции не применяются

```bash
# Проверить текущее состояние миграций
docker-compose exec postgres psql -U prod_user -d tg_app_prod -c "SELECT * FROM migrations;"

# Проверить lock
docker-compose exec postgres psql -U prod_user -d tg_app_prod -c "SELECT * FROM pg_locks WHERE relation::regclass::text = 'migrations';"

# Принудительно разблокировать (ОСТОРОЖНО!)
docker-compose exec postgres psql -U prod_user -d tg_app_prod -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'tg_app_prod' AND pid <> pg_backend_pid();"

# Попробовать снова
docker-compose exec backend npm run migration:run
```

### Нехватка памяти

```bash
# Проверить использование
docker stats

# Проверить системную память
free -h

# Restart сервисов по одному
docker-compose restart postgres
sleep 10
docker-compose restart redis
sleep 10
docker-compose restart backend
sleep 10
docker-compose restart frontend
```

### SSL сертификат истек

```bash
# Обновить Let's Encrypt сертификат
sudo certbot renew
sudo systemctl reload nginx

# Проверить expiration date
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null | openssl x509 -noout -dates
```

---

## 📚 Дополнительные ресурсы

### Логирование

```bash
# Настроить централизованное логирование (опционально)
# Например, с использованием Loki + Grafana или ELK stack

# Ротация логов Docker
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### Backup автоматизация

```bash
# Создать cron job для ежедневных backup
crontab -e
```

```bash
# Ежедневный backup в 02:00
0 2 * * * docker-compose -f /opt/tg-app/docker-compose.yml exec postgres pg_dump -U prod_user -Fc tg_app_prod > /backups/tg_app_prod_$(date +\%Y\%m\%d).dump && find /backups -name "*.dump" -mtime +7 -delete
```

### Мониторинг

Рекомендуемые инструменты:
- **Prometheus + Grafana** - метрики
- **Loki** - логи
- **Uptimerobot** - uptime monitoring
- **Sentry** - error tracking

---

**Конец руководства**

Для вопросов и проблем: создайте issue в репозитории

