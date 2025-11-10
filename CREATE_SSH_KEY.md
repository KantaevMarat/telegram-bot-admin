# 🔑 Создание SSH ключа для GitHub

## Команда для создания SSH ключа:

```powershell
ssh-keygen -t ed25519 -C "your_email@example.com" -f "$env:USERPROFILE\.ssh\id_ed25519_github"
```

**Или проще (создаст ключ с именем по умолчанию):**

```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Где `your_email@example.com` - ваш email на GitHub (например: `marat@example.com`)

---

## Что делать после создания:

### 1. При создании ключа:
- **Enter file location**: Нажмите Enter (используется путь по умолчанию)
- **Enter passphrase**: Введите пароль для защиты ключа (или нажмите Enter для пустого пароля)
- **Enter passphrase again**: Повторите пароль

### 2. Показать публичный ключ:

```powershell
cat "$env:USERPROFILE\.ssh\id_ed25519_github.pub"
```

Или если использовали имя по умолчанию:

```powershell
cat "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

### 3. Скопировать ключ в буфер обмена:

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519_github.pub" | Set-Clipboard
```

### 4. Добавить ключ в GitHub:

1. Откройте: https://github.com/settings/keys
2. Нажмите "New SSH key"
3. Вставьте скопированный ключ
4. Название: "Windows PC" (или любое)
5. Нажмите "Add SSH key"

### 5. Настроить SSH config (если нужно):

```powershell
# Создать/отредактировать config
notepad "$env:USERPROFILE\.ssh\config"
```

Добавьте:

```
Host github.com
    HostName github.com
    User git
    IdentityFile C:\Users\Марат\.ssh\id_ed25519_github
    IdentitiesOnly yes
```

### 6. Проверить подключение:

```powershell
ssh -T git@github.com
```

Должно вывести: `Hi MaratKantaev! You've successfully authenticated...`

### 7. Переключить remote на SSH:

```powershell
git remote set-url origin git@github.com:KantaevMarat/telegram-bot-admin.git
```

### 8. Выполнить push:

```powershell
git push origin sync/cleanup/2025-10-29
```

---

## Готово! 🎉

