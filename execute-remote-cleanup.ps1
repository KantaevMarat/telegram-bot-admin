# PowerShell скрипт для выполнения очистки на удаленном сервере
# Использование: .\execute-remote-cleanup.ps1

$server = "79.174.93.115"
$user = "root"
$password = "marranasuete223"

Write-Host "=== Выполнение очистки на удаленном сервере ===" -ForegroundColor Cyan
Write-Host "Сервер: $user@$server" -ForegroundColor Yellow

# Команды очистки (правильно экранированные для PowerShell)
$cleanupCommands = @'
echo "=== Начало очистки удаленного сервера ==="

# Очистка сборочных директорий
echo "Очистка сборочных директорий..."
for dir in /var/www/builds /var/www/dist /root/project/dist /root/project/builds /home/root/project/dist /opt/app/dist /opt/app/builds; do
    if [ -d "$dir" ]; then
        echo "Удаление содержимого: $dir"
        rm -rf "$dir"/*
        echo "✓ Очищено: $dir"
    fi
done

# Очистка Docker
echo ""
echo "=== Очистка Docker ==="
CONTAINERS=$(docker ps -a -q 2>/dev/null || echo "")
if [ -n "$CONTAINERS" ]; then
    echo "Остановка всех контейнеров..."
    docker stop $CONTAINERS || true
    echo "✓ Контейнеры остановлены"
    echo "Удаление всех контейнеров..."
    docker rm $CONTAINERS || true
    echo "✓ Контейнеры удалены"
else
    echo "Нет контейнеров для очистки"
fi

echo "Полная очистка Docker (образы, сети, тома)..."
docker system prune -a --volumes -f 2>/dev/null || echo "Docker не установлен или недоступен"
echo "✓ Docker система очищена"

# Очистка временных файлов
echo ""
echo "=== Очистка временных файлов ==="
find /tmp -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
find /var/tmp -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
echo "✓ Временные файлы очищены"

# Показать использование диска
echo ""
echo "=== Использование диска ==="
df -h /

echo ""
echo "=== Очистка завершена ==="
'@

# Проверка наличия sshpass или ssh
$useSshpass = $false
try {
    $null = sshpass -V 2>&1
    $useSshpass = $true
    Write-Host "Найден sshpass, будет использован для автоматической аутентификации" -ForegroundColor Green
} catch {
    Write-Host "sshpass не найден, будет использован обычный ssh (потребуется ввод пароля)" -ForegroundColor Yellow
}

if ($useSshpass) {
    # Использование sshpass для автоматической аутентификации
    Write-Host "Выполнение через sshpass..." -ForegroundColor Green
    $cleanupCommands | sshpass -p $password ssh -o StrictHostKeyChecking=no "$user@$server" "bash -s"
} else {
    # Обычный ssh (потребуется ввод пароля вручную)
    Write-Host "`nВыполнение через SSH (потребуется ввод пароля: $password)" -ForegroundColor Yellow
    Write-Host "Введите пароль когда будет запрошен" -ForegroundColor Yellow
    $cleanupCommands | ssh -o StrictHostKeyChecking=no "$user@$server" "bash -s"
}

Write-Host "`n=== Готово ===" -ForegroundColor Green
