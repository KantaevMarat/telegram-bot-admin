# Настройка Git и отправка на сервер

## Проверка текущего состояния Git

```powershell
# Проверка статуса
git status

# Проверка удаленных репозиториев
git remote -v
```

## Если репозиторий еще не инициализирован

```powershell
# Инициализация Git репозитория
git init

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "Initial commit"

# Добавление удаленного репозитория (замените URL на ваш)
git remote add origin https://github.com/your-username/your-repo.git

# Отправка на GitHub/GitLab
git branch -M main
git push -u origin main
```

## Если репозиторий уже настроен

```powershell
# Добавление изменений
git add .

# Коммит
git commit -m "Описание изменений"

# Отправка на сервер
git push
```

## Настройка Git на сервере (после подключения)

```bash
# На сервере
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Клонирование репозитория
cd ~/projects
git clone https://github.com/your-username/your-repo.git tg-main
cd tg-main
```

## Автоматическое развертывание после push

Можно настроить автоматическое обновление на сервере при каждом push:

### На сервере создайте скрипт: `~/update-app.sh`

```bash
#!/bin/bash
cd ~/projects/tg-main
git pull
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

### Настройте GitHub Actions (опционально)

Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: 79.174.93.115
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/projects/tg-main
            git pull
            docker compose -f docker-compose.production.yml build
            docker compose -f docker-compose.production.yml up -d
```

