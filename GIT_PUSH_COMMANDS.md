# 🚀 Команды для Git Push

## После добавления SSH ключа в GitHub:

```bash
# 1. Добавить все изменения
git add .

# 2. Сделать commit
git commit -m "feat: production-ready deployment configuration

- Added production docker-compose.yml with all services
- Added nginx reverse proxy with SSL support
- Added SSL certificate automation scripts
- Added systemd service for auto-start
- Added comprehensive documentation
- Cleaned up temporary files
- Added deployment and management scripts"

# 3. Push в репозиторий
git push origin sync/cleanup/2025-10-29
```

## Или если хотите запушить в main:

```bash
git push origin sync/cleanup/2025-10-29:main
```

## Альтернатива: Использовать Personal Access Token

Если не хотите настраивать SSH, можно использовать токен:

1. Создайте токен: https://github.com/settings/tokens
2. Выберите scope: `repo`
3. Скопируйте токен
4. Используйте команды:

```bash
# Вернуть HTTPS remote
git remote set-url origin https://github.com/KantaevMarat/telegram-bot-admin.git

# При push введите:
# Username: MaratKantaev
# Password: <ваш_токен_вместо_пароля>
git push origin sync/cleanup/2025-10-29
```

