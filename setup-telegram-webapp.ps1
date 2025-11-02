# Скрипт для настройки Telegram Web App
# PowerShell script для Windows

Write-Host "🚀 Настройка Telegram Web App для админ-бота" -ForegroundColor Cyan
Write-Host ""

# Получаем токен бота из .env
$envContent = Get-Content .env
$botToken = ($envContent | Select-String "ADMIN_BOT_TOKEN=(.+)").Matches.Groups[1].Value

if (-not $botToken) {
    Write-Host "❌ ADMIN_BOT_TOKEN не найден в .env файле!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Bot Token: $botToken" -ForegroundColor Green
Write-Host ""

# Запрашиваем Web App URL
Write-Host "📝 Введите URL вашего Web App (например, https://1234-5678.ngrok-free.app):" -ForegroundColor Yellow
Write-Host "   Этот URL должен быть доступен через HTTPS!" -ForegroundColor Yellow
Write-Host ""
$webAppUrl = Read-Host "Web App URL"

if ([string]::IsNullOrWhiteSpace($webAppUrl)) {
    Write-Host "❌ URL не может быть пустым!" -ForegroundColor Red
    exit 1
}

if (-not $webAppUrl.StartsWith("https://")) {
    Write-Host "⚠️  Внимание: URL должен начинаться с https://" -ForegroundColor Yellow
    Write-Host "   Telegram не поддерживает HTTP для Mini Apps!" -ForegroundColor Yellow
    $confirm = Read-Host "Продолжить? (y/n)"
    if ($confirm -ne "y") {
        exit 0
    }
}

Write-Host ""
Write-Host "🔧 Настраиваем Menu Button..." -ForegroundColor Cyan

# Формируем JSON для API запроса
$apiUrl = "https://api.telegram.org/bot$botToken/setChatMenuButton"
$body = @{
    menu_button = @{
        type = "web_app"
        text = "🎛 Админка"
        web_app = @{
            url = $webAppUrl
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json"
    
    if ($response.ok) {
        Write-Host ""
        Write-Host "✅ Menu Button успешно настроен!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 Как открыть админку в Telegram:" -ForegroundColor Cyan
        Write-Host "   1. Откройте вашего бота в Telegram" -ForegroundColor White
        Write-Host "   2. Найдите иконку меню (☰) в левом нижнем углу поля ввода" -ForegroundColor White
        Write-Host "   3. Нажмите на кнопку '🎛 Админка'" -ForegroundColor White
        Write-Host "   4. Админ-панель откроется внутри Telegram!" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ Ошибка настройки: $($response.description)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Ошибка выполнения запроса: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Проверьте:" -ForegroundColor Yellow
    Write-Host "   - Правильность токена бота" -ForegroundColor White
    Write-Host "   - Доступность интернета" -ForegroundColor White
}

Write-Host ""
Write-Host "💡 Полезные команды:" -ForegroundColor Cyan
Write-Host "   Проверить текущие настройки:" -ForegroundColor White
Write-Host "   curl `"https://api.telegram.org/bot$botToken/getChatMenuButton`"" -ForegroundColor Gray
Write-Host ""
Write-Host "   Удалить Menu Button:" -ForegroundColor White
Write-Host "   curl -X POST `"https://api.telegram.org/bot$botToken/setChatMenuButton`" -H `"Content-Type: application/json`" -d '{`"menu_button`":{`"type`":`"default`"}}'`"" -ForegroundColor Gray
Write-Host ""

# Обновляем .env файл
Write-Host "📝 Обновляем .env файл..." -ForegroundColor Cyan
$envUpdated = $false
$newEnvContent = @()

foreach ($line in $envContent) {
    if ($line -match "^TELEGRAM_WEB_APP_URL=") {
        $newEnvContent += "TELEGRAM_WEB_APP_URL=$webAppUrl"
        $envUpdated = $true
    } else {
        $newEnvContent += $line
    }
}

if ($envUpdated) {
    $newEnvContent | Set-Content .env
    Write-Host "✅ .env файл обновлен!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Перезапустите сервисы для применения изменений:" -ForegroundColor Yellow
    Write-Host "   docker-compose restart" -ForegroundColor White
} else {
    Write-Host "⚠️  TELEGRAM_WEB_APP_URL не найден в .env" -ForegroundColor Yellow
    Write-Host "   Добавьте вручную: TELEGRAM_WEB_APP_URL=$webAppUrl" -ForegroundColor White
}

Write-Host ""
Write-Host "✨ Готово!" -ForegroundColor Green

