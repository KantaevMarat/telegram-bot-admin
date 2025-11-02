# 🚀 Быстрая инструкция по SSH

## 📋 Ваш SSH ключ создан!

### 🔑 Публичный ключ (добавьте на VPS):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEyE02UZAsg/LIbVspUHbQCFg1qZlQzzBZIRV4KZuWP2 marat@telegram-bot-admin
```

**☝️ Ключ уже в буфере обмена - просто нажмите Ctrl+V при создании VPS!**

---

## 🌐 Создание VPS с SSH ключом:

### Hetzner (Рекомендуется - €4.51/мес):

1. Перейдите: https://www.hetzner.com/cloud
2. Зарегистрируйтесь
3. Создайте проект → **Add Server**
4. Выберите:
   - Location: **Falkenstein, Germany** (или любой)
   - Image: **Ubuntu 22.04**
   - Type: **CPX11** (2 vCPU, 4GB RAM, 40GB SSD)
   - SSH Keys: **Add SSH Key** → вставьте ключ выше
   - Server name: `telegram-bot-admin`
5. Создайте сервер (3-5 минут)
6. Скопируйте IP адрес сервера

### DigitalOcean ($12/мес, $200 бонус):

1. Перейдите: https://www.digitalocean.com/
2. Зарегистрируйтесь (получите $200 бонус на 60 дней)
3. Создайте Droplet:
   - Image: **Ubuntu 22.04 LTS**
   - Droplet Type: **Basic** → **Regular** → **4GB RAM** ($12/мес)
   - Authentication: **SSH keys** → **New SSH Key** → вставьте ключ
   - Hostname: `telegram-bot-admin`
4. Создайте Droplet
5. Скопируйте IP адрес

### Timeweb (Россия - ~600₽/мес):

1. Перейдите: https://timeweb.com/ru/services/vds/
2. Выберите **Cloud M** (2 vCPU, 4GB RAM)
3. При создании добавьте SSH ключ в **"Дополнительные настройки"**
4. Скопируйте IP адрес

---

## 🔌 Подключение к VPS:

```powershell
# Замените YOUR_SERVER_IP на реальный IP
ssh -i "$env:USERPROFILE\.ssh\telegram_bot_admin" root@YOUR_SERVER_IP
```

**Пример:**
```powershell
ssh -i "$env:USERPROFILE\.ssh\telegram_bot_admin" root@123.45.67.89
```

При первом подключении напишите `yes` и нажмите Enter.

---

## 🚀 После подключения - деплой:

```bash
# 1. Установите Docker
curl -fsSL https://get.docker.com | sh

# 2. Клонируйте проект
git clone https://github.com/KantaevMarat/telegram-bot-admin.git
cd telegram-bot-admin

# 3. Создайте .env.production
nano .env.production
# Вставьте конфигурацию из QUICK_DEPLOY.md

# 4. Запустите деплой
chmod +x deploy.sh
./deploy.sh

# 5. Добавьте себя как админа
docker-compose -f docker-compose.production.yml run --rm backend npm run cli:add-admin YOUR_TELEGRAM_ID
```

---

## 📝 Упрощённое подключение (опционально):

Создайте файл `C:\Users\Марат\.ssh\config`:

```
Host telegram-bot
    HostName YOUR_SERVER_IP
    User root
    IdentityFile C:\Users\Марат\.ssh\telegram_bot_admin
```

Затем подключайтесь просто:
```powershell
ssh telegram-bot
```

---

## 💡 Полезные команды:

```powershell
# Скопировать SSH ключ в буфер обмена
Get-Content "$env:USERPROFILE\.ssh\telegram_bot_admin.pub" | Set-Clipboard

# Показать SSH ключ
Get-Content "$env:USERPROFILE\.ssh\telegram_bot_admin.pub"

# Подключиться к серверу
ssh -i "$env:USERPROFILE\.ssh\telegram_bot_admin" root@YOUR_SERVER_IP
```

---

**Следующий шаг:** Создайте VPS на Hetzner или DigitalOcean! 🎯

