# Инструкция по развертыванию на сервере

## Подключение к серверу

```bash
ssh -i ~/.ssh/id_ed25519_new root@79.174.93.115
# При запросе введите пароль: 627846
```

## Вариант 1: Автоматическая установка (рекомендуется)

### Шаг 1: Загрузите скрипт на сервер

```bash
# На вашем локальном компьютере
scp -i ~/.ssh/id_ed25519_new server-setup.sh root@79.174.93.115:/root/
scp -i ~/.ssh/id_ed25519_new server-setup-quick.sh root@79.174.93.115:/root/
```

### Шаг 2: Запустите скрипт на сервере

```bash
# Подключитесь к серверу
ssh -i ~/.ssh/id_ed25519_new root@79.174.93.115

# Сделайте скрипт исполняемым
chmod +x server-setup.sh
chmod +x server-setup-quick.sh

# Запустите полную установку (интерактивная)
bash server-setup.sh

# ИЛИ быстрая установка (укажите URL вашего репозитория)
bash server-setup-quick.sh https://github.com/your-username/your-repo.git
```

## Вариант 2: Ручная установка

### 1. Установка Docker и Docker Compose

```bash
# Обновление системы
apt-get update

# Установка зависимостей
apt-get install -y curl git

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker $USER

# Проверка установки
docker --version
docker compose version
```

### 2. Настройка Git

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. Клонирование репозитория

```bash
cd ~
mkdir -p projects
cd projects
git clone https://github.com/your-username/your-repo.git tg-main
cd tg-main
```

### 4. Настройка переменных окружения

```bash
# Создание .env.production из примера
cp env.example.txt .env.production

# Редактирование файла
nano .env.production
```

**Важно настроить:**
- `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота
- `TELEGRAM_WEBHOOK_URL` - URL для webhook (например: `https://api.marranasuete.ru/api/bot/webhook`)
- `ADMIN_BOT_TOKEN` - токен админ-бота
- `JWT_SECRET` - секретный ключ для JWT (сгенерируйте случайную строку)
- `DB_PASSWORD`, `REDIS_PASSWORD` - надежные пароли
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` - учетные данные MinIO
- `VITE_API_URL` - URL вашего API (например: `https://api.marranasuete.ru`)

### 5. Создание необходимых директорий

```bash
mkdir -p backend/uploads
```

### 6. Запуск проекта

```bash
# Сборка и запуск контейнеров
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# Проверка статуса
docker compose -f docker-compose.production.yml ps

# Просмотр логов
docker compose -f docker-compose.production.yml logs -f
```

## Настройка файрвола

```bash
# Установка UFW (если не установлен)
apt-get install -y ufw

# Открытие необходимых портов
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Backend API
ufw allow 8080/tcp  # Frontend
ufw allow 9000/tcp  # MinIO
ufw allow 9001/tcp  # MinIO Console

# Включение файрвола
ufw enable
ufw status
```

## Настройка Nginx (опционально, для домена)

Если у вас есть домен, настройте Nginx как reverse proxy:

```bash
apt-get install -y nginx certbot python3-certbot-nginx

# Создание конфигурации
nano /etc/nginx/sites-available/tg-app
```

Конфигурация Nginx:
```nginx
server {
    listen 80;
    server_name api.marranasuete.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name marranasuete.ru;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активация конфигурации
ln -s /etc/nginx/sites-available/tg-app /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Получение SSL сертификата
certbot --nginx -d api.marranasuete.ru -d marranasuete.ru
```

## Полезные команды

```bash
# Остановка контейнеров
docker compose -f docker-compose.production.yml down

# Перезапуск контейнеров
docker compose -f docker-compose.production.yml restart

# Просмотр логов конкретного сервиса
docker compose -f docker-compose.production.yml logs -f backend

# Выполнение команд в контейнере
docker compose -f docker-compose.production.yml exec backend sh

# Обновление проекта
cd ~/projects/tg-main
git pull
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# Очистка неиспользуемых образов
docker system prune -a
```

## Проверка работоспособности

```bash
# Проверка статуса контейнеров
docker compose -f docker-compose.production.yml ps

# Проверка логов
docker compose -f docker-compose.production.yml logs

# Проверка доступности API
curl http://localhost:3000

# Проверка доступности Frontend
curl http://localhost:8080
```

## Решение проблем

### Проблема: Контейнеры не запускаются
```bash
# Проверьте логи
docker compose -f docker-compose.production.yml logs

# Проверьте .env.production файл
cat .env.production
```

### Проблема: Порты заняты
```bash
# Проверьте, какие порты заняты
netstat -tulpn | grep LISTEN

# Измените порты в docker-compose.production.yml или .env.production
```

### Проблема: Недостаточно места на диске
```bash
# Проверьте использование диска
df -h

# Очистка Docker
docker system prune -a --volumes
```

