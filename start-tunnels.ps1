# Скрипт для запуска localtunnel туннелей для frontend и backend
# PowerShell script для Windows

Write-Host "🚀 Запуск Localtunnel туннелей..." -ForegroundColor Cyan
Write-Host ""

# Проверяем установлен ли localtunnel
$ltInstalled = Get-Command npx -ErrorAction SilentlyContinue
if (-not $ltInstalled) {
    Write-Host "❌ NPX не найден! Установите Node.js: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Используем subdomains:" -ForegroundColor Yellow
Write-Host "   Frontend: myproh5" -ForegroundColor White
Write-Host "   Backend:  myproh5-api" -ForegroundColor White
Write-Host ""
Write-Host "📡 URLs будут:" -ForegroundColor Cyan
Write-Host "   Frontend: https://myproh5.loca.lt" -ForegroundColor Green
Write-Host "   Backend:  https://myproh5-api.loca.lt" -ForegroundColor Green
Write-Host ""

# Функция для запуска туннеля в фоне
function Start-Tunnel {
    param(
        [string]$Port,
        [string]$Subdomain,
        [string]$Name
    )
    
    Write-Host "🔄 Запускаем туннель для $Name (порт $Port)..." -ForegroundColor Cyan
    
    $job = Start-Job -ScriptBlock {
        param($p, $s)
        npx localtunnel --port $p --subdomain $s
    } -ArgumentList $Port, $Subdomain
    
    return $job
}

# Запускаем туннели
$frontendJob = Start-Tunnel -Port 5173 -Subdomain "myproh5" -Name "Frontend"
$backendJob = Start-Tunnel -Port 3000 -Subdomain "myproh5-api" -Name "Backend"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Туннели запущены!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Информация о туннелях:" -ForegroundColor Cyan
Write-Host "   Frontend Job ID: $($frontendJob.Id)" -ForegroundColor White
Write-Host "   Backend Job ID:  $($backendJob.Id)" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  ВАЖНО: Обход экрана Localtunnel" -ForegroundColor Yellow
Write-Host "   При первом открытии каждого URL нажмите 'Click to Continue'" -ForegroundColor White
Write-Host ""
Write-Host "   1. Откройте https://myproh5.loca.lt → нажмите Continue" -ForegroundColor Gray
Write-Host "   2. Откройте https://myproh5-api.loca.lt → нажмите Continue" -ForegroundColor Gray
Write-Host ""

Write-Host "🔧 Теперь обновите .env файл:" -ForegroundColor Cyan
Write-Host ""
Write-Host "TELEGRAM_WEB_APP_URL=https://myproh5.loca.lt" -ForegroundColor Gray
Write-Host "VITE_API_URL=https://myproh5-api.loca.lt" -ForegroundColor Gray
Write-Host ""

$updateEnv = Read-Host "Обновить .env автоматически? (y/n)"
if ($updateEnv -eq "y") {
    $envContent = Get-Content .env
    $newEnvContent = @()
    
    foreach ($line in $envContent) {
        if ($line -match "^TELEGRAM_WEB_APP_URL=") {
            $newEnvContent += "TELEGRAM_WEB_APP_URL=https://myproh5.loca.lt"
        } elseif ($line -match "^VITE_API_URL=") {
            $newEnvContent += "VITE_API_URL=https://myproh5-api.loca.lt"
        } else {
            $newEnvContent += $line
        }
    }
    
    $newEnvContent | Set-Content .env
    Write-Host "✅ .env обновлен!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Перезапустите frontend:" -ForegroundColor Yellow
    Write-Host "   docker-compose restart frontend" -ForegroundColor White
}

Write-Host ""
Write-Host "📝 Полезные команды:" -ForegroundColor Cyan
Write-Host "   Проверить статус: Get-Job" -ForegroundColor White
Write-Host "   Посмотреть вывод:  Receive-Job $($frontendJob.Id)" -ForegroundColor White
Write-Host "   Остановить все:    Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor White
Write-Host ""

Write-Host "🎯 Туннели работают в фоне. Нажмите Ctrl+C чтобы остановить." -ForegroundColor Green
Write-Host ""

# Мониторим логи
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Проверяем статус джобов
        $frontendStatus = Get-Job -Id $frontendJob.Id
        $backendStatus = Get-Job -Id $backendJob.Id
        
        if ($frontendStatus.State -ne "Running" -or $backendStatus.State -ne "Running") {
            Write-Host "⚠️  Один из туннелей остановился!" -ForegroundColor Yellow
            Write-Host "   Frontend: $($frontendStatus.State)" -ForegroundColor White
            Write-Host "   Backend:  $($backendStatus.State)" -ForegroundColor White
            
            # Показываем ошибки
            if ($frontendStatus.State -eq "Failed") {
                Write-Host "Frontend Error:" -ForegroundColor Red
                Receive-Job -Id $frontendJob.Id
            }
            if ($backendStatus.State -eq "Failed") {
                Write-Host "Backend Error:" -ForegroundColor Red
                Receive-Job -Id $backendJob.Id
            }
            
            break
        }
    }
} finally {
    Write-Host ""
    Write-Host "🛑 Останавливаем туннели..." -ForegroundColor Yellow
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    Write-Host "✅ Готово!" -ForegroundColor Green
}

