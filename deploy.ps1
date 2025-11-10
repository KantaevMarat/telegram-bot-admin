# Полный скрипт развертывания на сервер
# Использование: .\deploy.ps1 [GIT_REPO_URL]

param(
    [string]$GitRepoUrl = ""
)

$SSH_KEY = "$env:USERPROFILE\.ssh\id_ed25519_new"
$SERVER = "root@79.174.93.115"
$SERVER_PATH = "/root"

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        РАЗВЕРТЫВАНИЕ НА СЕРВЕР                          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Проверка SSH ключа
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "ОШИБКА: SSH ключ не найден: $SSH_KEY" -ForegroundColor Red
    exit 1
}

# Проверка подключения к серверу
Write-Host "Проверка подключения к серверу..." -ForegroundColor Yellow
$testConnection = ssh -i $SSH_KEY -o ConnectTimeout=5 -o BatchMode=yes $SERVER "echo 'OK'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Не удается подключиться к серверу" -ForegroundColor Red
    Write-Host "Проверьте:" -ForegroundColor Yellow
    Write-Host "  1. Доступность сервера" -ForegroundColor White
    Write-Host "  2. Правильность SSH ключа" -ForegroundColor White
    Write-Host "  3. Открыт ли SSH порт" -ForegroundColor White
    exit 1
}

Write-Host "✓ Подключение к серверу успешно" -ForegroundColor Green
Write-Host ""

# Копирование файлов
Write-Host "Копирование файлов на сервер..." -ForegroundColor Yellow
$files = @("server-setup.sh", "server-setup-quick.sh")
foreach ($file in $files) {
    if (Test-Path $file) {
        scp -i $SSH_KEY $file "${SERVER}:${SERVER_PATH}/" | Out-Null
        Write-Host "  ✓ $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Запуск установки на сервере..." -ForegroundColor Yellow
Write-Host ""

# Определение, какой скрипт использовать
# Проверяем, Ubuntu ли это
$checkUbuntu = ssh -i $SSH_KEY $SERVER "cat /etc/os-release 2>/dev/null | grep -i ubuntu || echo ''"
if ($checkUbuntu -match "ubuntu") {
    $setupScript = "server-setup-ubuntu.sh"
    Write-Host "Обнаружен Ubuntu, используется специализированный скрипт" -ForegroundColor Cyan
} else {
    $setupScript = "server-setup-universal.sh"
    Write-Host "Используется универсальный скрипт установки" -ForegroundColor Cyan
}

$defaultRepo = "https://github.com/KantaevMarat/telegram-bot-admin.git"
$repoUrl = if ($GitRepoUrl) { $GitRepoUrl } else { $defaultRepo }

Write-Host "Репозиторий: $repoUrl" -ForegroundColor Cyan
Write-Host ""

# Копирование скрипта
if (Test-Path $setupScript) {
    scp -i $SSH_KEY $setupScript "${SERVER}:${SERVER_PATH}/" | Out-Null
    Write-Host "✓ Скрипт скопирован: $setupScript" -ForegroundColor Green
} elseif (Test-Path "server-setup-universal.sh") {
    $setupScript = "server-setup-universal.sh"
    scp -i $SSH_KEY server-setup-universal.sh "${SERVER}:${SERVER_PATH}/" | Out-Null
    Write-Host "✓ Универсальный скрипт скопирован" -ForegroundColor Green
} elseif (Test-Path "server-setup-minimal.sh") {
    $setupScript = "server-setup-minimal.sh"
    scp -i $SSH_KEY server-setup-minimal.sh "${SERVER}:${SERVER_PATH}/" | Out-Null
    Write-Host "✓ Минимальный скрипт скопирован" -ForegroundColor Green
}

# Запуск установки
ssh -i $SSH_KEY $SERVER "chmod +x $setupScript && bash $setupScript '$repoUrl'"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        УСТАНОВКА ЗАВЕРШЕНА                               ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Следующие шаги:" -ForegroundColor Yellow
Write-Host "1. Подключитесь к серверу:" -ForegroundColor Cyan
Write-Host "   ssh -i `"$SSH_KEY`" $SERVER" -ForegroundColor White
Write-Host ""
Write-Host "2. Настройте .env.production:" -ForegroundColor Cyan
Write-Host "   cd ~/projects/tg-main" -ForegroundColor White
Write-Host "   nano .env.production" -ForegroundColor White
Write-Host ""
Write-Host "3. Запустите проект:" -ForegroundColor Cyan
Write-Host "   docker compose -f docker-compose.production.yml up -d" -ForegroundColor White
Write-Host ""

