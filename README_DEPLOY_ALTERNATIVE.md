# 🚀 Альтернативный способ деплоя

## ❌ Проблема: VPS не может собрать Docker образы из-за нестабильной сети

## ✅ Решение: Собрать образы локально и загрузить на сервер

### Шаг 1: Соберите образы на своей машине

```bash
# На вашей Windows машине
cd C:\Users\Марат\.cursor\worktrees\tg-main\g5hNl

# Соберите образы
docker build -t telegram-bot-admin-backend -f backend/Dockerfile.production ./backend
docker build -t telegram-bot-admin-frontend -f frontend/Dockerfile.production ./frontend

# Сохраните образы в файлы
docker save telegram-bot-admin-backend -o backend-image.tar
docker save telegram-bot-admin-frontend -o frontend-image.tar
```

### Шаг 2: Загрузите образы на сервер

```bash
# С вашей машины скопируйте образы на сервер
scp -i "$env:USERPROFILE\.ssh\telegram_bot_admin" backend-image.tar root@YOUR_SERVER_IP:/root/
scp -i "$env:USERPROFILE\.ssh\telegram_bot_admin" frontend-image.tar root@YOUR_SERVER_IP:/root/
```

### Шаг 3: На сервере загрузите образы

```bash
# На сервере Ubuntu
ssh -i "$env:USERPROFILE\.ssh\telegram_bot_admin" root@YOUR_SERVER_IP

# Загрузите образы
docker load -i /root/backend-image.tar
docker load -i /root/frontend-image.tar

# Переименуйте образы для docker-compose
docker tag telegram-bot-admin-backend telegram-bot-admin-backend:latest
docker tag telegram-bot-admin-frontend telegram-bot-admin-frontend:latest

# Теперь запустите docker-compose
cd ~/telegram-bot-admin
docker compose -f docker-compose.production.yml up -d
```

---

## 🌐 Или используйте Docker Hub

### Вариант с Docker Hub:

```bash
# На вашей машине
docker login

# Соберите и запушьте образы
docker build -t YOUR_DOCKERHUB_USERNAME/telegram-bot-admin-backend:latest -f backend/Dockerfile.production ./backend
docker push YOUR_DOCKERHUB_USERNAME/telegram-bot-admin-backend:latest

docker build -t YOUR_DOCKERHUB_USERNAME/telegram-bot-admin-frontend:latest -f frontend/Dockerfile.production ./frontend
docker push YOUR_DOCKERHUB_USERNAME/telegram-bot-admin-frontend:latest

# На сервере обновите docker-compose.production.yml
nano docker-compose.production.yml

# Замените build на image:
backend:
  image: YOUR_DOCKERHUB_USERNAME/telegram-bot-admin-backend:latest
  # build: ... удалите эту строку

frontend:
  image: YOUR_DOCKERHUB_USERNAME/telegram-bot-admin-frontend:latest
  # build: ... удалите эту строку

# Запустите
docker compose -f docker-compose.production.yml up -d
```

---

## 💡 Рекомендация

Используйте **Вариант 1 (save/load)** - он самый простой и быстрый для тестирования!

