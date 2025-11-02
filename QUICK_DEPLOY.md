# 🚀 Быстрый деплой на продакшн

## 📝 Краткая инструкция (10 минут)

### 1️⃣ Подготовка сервера

```bash
# Подключитесь к серверу
ssh root@YOUR_SERVER_IP

# Установите Docker и Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose-plugin git -y

# Клонируйте проект
git clone https://github.com/yourusername/your-repo.git
cd your-repo
```

### 2️⃣ Настройка окружения

```bash
# Создайте .env.production
nano .env.production
```

Скопируйте и **ОБЯЗАТЕЛЬНО измените пароли**:

```bash
NODE_ENV=production
PORT=3000
FRONTEND_PORT=8080

# === ДОМЕНЫ ===
FRONTEND_URL=https://app.yourdomain.com
API_URL=https://api.yourdomain.com
VITE_API_URL=https://api.yourdomain.com
VITE_TELEGRAM_BOT_USERNAME=your_client_bot

# === БАЗА ДАННЫХ ===
DB_HOST=postgres
DB_PORT=5432
DB_NAME=telegram_bot_db
DB_USER=telegram_bot_user
DB_PASSWORD=Qw3rTy789uiOp456AsDf

# === JWT (сгенерируйте: openssl rand -hex 32) ===
JWT_SECRET=f7e8d9c6b5a4938271605d4e3c2b1a0f9e8d7c6b5a4938271605d4e3c2b1a0f

# === TELEGRAM ===
TELEGRAM_BOT_TOKEN=8330680651:AAErG1_zzA0aX4_O7s-aaQlcCseLF7i8cIE
ADMIN_BOT_TOKEN=8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro
TELEGRAM_WEB_APP_URL=https://app.yourdomain.com

# === REDIS ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=Mn9Bv8Cx7Zl6Qw5Er4Ty3

# === MINIO ===
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=Pl0Ok9Ij8Uh7Yg6Tf5Re4
MINIO_BUCKET_NAME=telegram-bot-uploads
MINIO_USE_SSL=false

# === БЕЗОПАСНОСТЬ ===
CORS_ORIGIN=https://app.yourdomain.com
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
LOG_LEVEL=info
TZ=Europe/Moscow
```

### 3️⃣ Запуск

```bash
# Сделайте скрипт исполняемым
chmod +x deploy.sh

# Запустите деплой
./deploy.sh
```

Скрипт автоматически:
- ✅ Соберёт Docker образы
- ✅ Запустит базы данных
- ✅ Выполнит миграции
- ✅ Запустит все сервисы

### 4️⃣ Добавьте себя как админа

```bash
# Замените YOUR_TELEGRAM_ID на ваш ID
docker-compose -f docker-compose.production.yml run --rm backend npm run cli:add-admin YOUR_TELEGRAM_ID
```

### 5️⃣ Настройка Nginx + SSL

```bash
# Установите Nginx и Certbot
apt install nginx certbot python3-certbot-nginx -y

# Создайте конфиг для frontend
nano /etc/nginx/sites-available/frontend
```

Вставьте:
```nginx
server {
    listen 80;
    server_name app.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
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

```bash
# Создайте конфиг для backend
nano /etc/nginx/sites-available/backend
```

Вставьте:
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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
# Активируйте конфиги
ln -s /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/

# Проверьте конфигурацию
nginx -t

# Перезапустите Nginx
systemctl restart nginx

# Получите SSL сертификаты
certbot --nginx -d app.yourdomain.com
certbot --nginx -d api.yourdomain.com
```

### 6️⃣ Настройте Telegram ботов

```bash
# Настройте Menu Button для админ бота
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

### 7️⃣ Настройте автоматические бэкапы

```bash
# Сделайте скрипт исполняемым
chmod +x backup.sh

# Добавьте в cron (бэкап каждый день в 3:00)
crontab -e

# Добавьте строку:
0 3 * * * /root/your-project/backup.sh >> /root/backups/backup.log 2>&1
```

---

## ✅ Готово!

Ваше приложение работает:
- 🌐 **Frontend**: https://app.yourdomain.com
- 🔌 **Backend**: https://api.yourdomain.com

### Полезные команды:

```bash
# Смотреть логи
docker-compose -f docker-compose.production.yml logs -f

# Перезапустить сервисы
docker-compose -f docker-compose.production.yml restart

# Остановить всё
docker-compose -f docker-compose.production.yml down

# Обновить приложение
git pull
./deploy.sh
```

---

## 🔒 Безопасность

```bash
# Настройте файрвол
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable

# Установите fail2ban
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📊 Мониторинг

```bash
# Установите ctop для мониторинга контейнеров
wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
chmod +x /usr/local/bin/ctop

# Запустите
ctop
```

---

## 🆘 Проблемы?

1. **Проверьте логи:**
   ```bash
   docker-compose -f docker-compose.production.yml logs -f backend
   ```

2. **Проверьте статус:**
   ```bash
   docker-compose -f docker-compose.production.yml ps
   ```

3. **Перезапустите сервисы:**
   ```bash
   docker-compose -f docker-compose.production.yml restart
   ```

4. **Проверьте DNS:**
   ```bash
   nslookup app.yourdomain.com
   ```

---

**Полная документация**: `DEPLOYMENT_GUIDE.md`


