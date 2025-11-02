# ⚡ Быстрое исправление: Telegram Mini App не загружается

## 🔍 Проблема
Данные не прогружаются в Telegram Mini App, потому что:
- Telegram требует HTTPS URL
- Сейчас в `.env` стоит placeholder: `TELEGRAM_WEB_APP_URL=https://your-domain.com`

## ✅ Решение (5 минут)

### Вариант 1: Через ngrok (Рекомендуется для теста)

#### 1. Установите ngrok
- Скачайте: https://ngrok.com/download
- Или через chocolatey: `choco install ngrok`

#### 2. Зарегистрируйтесь
- https://dashboard.ngrok.com/signup
- Получите токен: https://dashboard.ngrok.com/get-started/your-authtoken
- Выполните: `ngrok config add-authtoken YOUR_TOKEN`

#### 3. Запустите туннель для фронтенда
```bash
ngrok http 5173
```

Вы получите URL типа: `https://1234-abcd-5678.ngrok-free.app`

#### 4. Настройте бота автоматически

**PowerShell:**
```powershell
.\setup-telegram-webapp.ps1
```

Введите ваш ngrok URL когда скрипт попросит.

**Или вручную через curl:**
```bash
curl -X POST "https://api.telegram.org/bot8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro/setChatMenuButton" ^
  -H "Content-Type: application/json" ^
  -d "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"Админка\",\"web_app\":{\"url\":\"ВАШ_NGROK_URL\"}}}"
```

#### 5. Обновите .env
```env
TELEGRAM_WEB_APP_URL=https://ваш-ngrok-url.ngrok-free.app
```

#### 6. Перезапустите
```bash
docker-compose restart
```

#### 7. Откройте в Telegram!
1. Откройте бота: `@YOUR_BOT_USERNAME`
2. Нажмите иконку меню (☰) слева внизу
3. Выберите "Админка"

---

### Вариант 2: Локальный тест (без Telegram)

Если хотите просто протестировать админку без Telegram:

1. Откройте в браузере: http://localhost:5173
2. Нажмите кнопку **"🔧 Dev-вход (ID: 697184435)"**
3. Готово! Админка работает

---

## 🐛 Если всё равно не работает

### Проблема: Backend недоступен

**Решение:** Создайте туннель и для backend:

```bash
# Терминал 1
ngrok http 5173

# Терминал 2  
ngrok http 3000
```

Обновите `.env`:
```env
TELEGRAM_WEB_APP_URL=https://frontend-url.ngrok-free.app
VITE_API_URL=https://backend-url.ngrok-free.app
```

### Проблема: "Неверная подпись данных"

**Решение:** Используйте dev-вход:
1. Откройте http://localhost:5173
2. Нажмите оранжевую кнопку "🔧 Dev-вход"

---

## 📝 Проверка настроек

```bash
# Проверить Menu Button
curl "https://api.telegram.org/bot8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro/getChatMenuButton"

# Удалить Menu Button (сброс)
curl -X POST "https://api.telegram.org/bot8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro/setChatMenuButton" ^
  -H "Content-Type: application/json" ^
  -d "{\"menu_button\":{\"type\":\"default\"}}"
```

---

## 🎯 Итого

**Минимум для работы:**
1. ✅ ngrok запущен → получили HTTPS URL
2. ✅ Menu Button настроен через API
3. ✅ `.env` обновлен с правильным URL
4. ✅ Сервисы перезапущены

**Готово!** 🎉

