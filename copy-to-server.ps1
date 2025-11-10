# PowerShell скрипт для копирования файлов на сервер
# Использование: .\copy-to-server.ps1

$SSH_KEY = "$env:USERPROFILE\.ssh\id_ed25519_new"
$SERVER = "root@79.174.93.115"
$SERVER_PATH = "/root"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Копирование файлов на сервер" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Проверка существования SSH ключа
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "ОШИБКА: SSH ключ не найден: $SSH_KEY" -ForegroundColor Red
    exit 1
}

Write-Host "SSH ключ: $SSH_KEY" -ForegroundColor Cyan
Write-Host "Сервер: $SERVER" -ForegroundColor Cyan
Write-Host ""

# Файлы для копирования
$files = @(
    "server-setup-ubuntu.sh",
    "install-git-dependencies-ubuntu.sh",
    "server-setup-universal.sh",
    "server-setup-minimal.sh",
    "server-setup.sh",
    "server-setup-quick.sh",
    "docker-compose.production.yml"
)

Write-Host "Копирование файлов..." -ForegroundColor Yellow

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  Копирование $file..." -ForegroundColor White
        scp -i $SSH_KEY $file "${SERVER}:${SERVER_PATH}/"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ $file скопирован" -ForegroundColor Green
        } else {
            Write-Host "    ✗ Ошибка при копировании $file" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠ Файл $file не найден, пропускаем" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Файлы скопированы!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Следующий шаг:" -ForegroundColor Yellow
Write-Host "  Подключитесь к серверу и запустите установку:" -ForegroundColor Cyan
Write-Host "  ssh -i `"$SSH_KEY`" $SERVER" -ForegroundColor White
Write-Host ""
Write-Host "  Затем на сервере:" -ForegroundColor Cyan
Write-Host "  chmod +x server-setup.sh" -ForegroundColor White
Write-Host "  bash server-setup.sh" -ForegroundColor White
Write-Host ""

