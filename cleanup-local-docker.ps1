# Скрипт для полной очистки локального Docker
# Использование: .\cleanup-local-docker.ps1

Write-Host "=== Начало очистки локального Docker ===" -ForegroundColor Cyan

# Проверка доступности Docker
try {
    docker --version | Out-Null
    Write-Host "Docker найден" -ForegroundColor Green
} catch {
    Write-Host "ОШИБКА: Docker не найден или не запущен!" -ForegroundColor Red
    Write-Host "Убедитесь, что Docker Desktop запущен" -ForegroundColor Yellow
    exit 1
}

# 1. Остановка всех контейнеров
Write-Host "`nОстановка всех контейнеров..." -ForegroundColor Yellow
$containers = docker ps -a -q
if ($containers) {
    docker stop $containers
    Write-Host "✓ Контейнеры остановлены" -ForegroundColor Green
} else {
    Write-Host "Нет запущенных контейнеров" -ForegroundColor Gray
}

# 2. Удаление всех контейнеров
Write-Host "`nУдаление всех контейнеров..." -ForegroundColor Yellow
if ($containers) {
    docker rm $containers
    Write-Host "✓ Контейнеры удалены" -ForegroundColor Green
} else {
    Write-Host "Нет контейнеров для удаления" -ForegroundColor Gray
}

# 3. Полная очистка Docker системы
Write-Host "`nПолная очистка Docker (образы, сети, тома)..." -ForegroundColor Yellow
docker system prune -a --volumes -f
Write-Host "✓ Docker система очищена" -ForegroundColor Green

# 4. Показать использование диска
Write-Host "`n=== Использование диска Docker ===" -ForegroundColor Cyan
docker system df

Write-Host "`n=== Очистка завершена ===" -ForegroundColor Green

