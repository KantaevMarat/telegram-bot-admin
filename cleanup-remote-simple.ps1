# Упрощенная версия - команды передаются построчно
# Использование: .\cleanup-remote-simple.ps1

$server = "79.174.93.115"
$user = "root"

Write-Host "=== Очистка удаленного сервера ===" -ForegroundColor Cyan
Write-Host "Сервер: $user@$server" -ForegroundColor Yellow
Write-Host "Пароль: marranasuete223" -ForegroundColor Yellow
Write-Host ""

# Создаем команды как массив строк и объединяем через \n
$commands = @(
    'echo "=== Начало очистки удаленного сервера ==="',
    '',
    '# Очистка сборочных директорий',
    'echo "Очистка сборочных директорий..."',
    'for dir in /var/www/builds /var/www/dist /root/project/dist /root/project/builds /home/root/project/dist /opt/app/dist /opt/app/builds; do',
    '    if [ -d "$dir" ]; then',
    '        echo "Удаление содержимого: $dir"',
    '        rm -rf "$dir"/*',
    '        echo "✓ Очищено: $dir"',
    '    fi',
    'done',
    '',
    '# Очистка Docker',
    'echo ""',
    'echo "=== Очистка Docker ==="',
    'CONTAINERS=$(docker ps -a -q 2>/dev/null || echo "")',
    'if [ -n "$CONTAINERS" ]; then',
    '    echo "Остановка всех контейнеров..."',
    '    docker stop $CONTAINERS || true',
    '    echo "✓ Контейнеры остановлены"',
    '    echo "Удаление всех контейнеров..."',
    '    docker rm $CONTAINERS || true',
    '    echo "✓ Контейнеры удалены"',
    'else',
    '    echo "Нет контейнеров для очистки"',
    'fi',
    '',
    'echo "Полная очистка Docker (образы, сети, тома)..."',
    'docker system prune -a --volumes -f 2>/dev/null || echo "Docker не установлен или недоступен"',
    'echo "✓ Docker система очищена"',
    '',
    '# Очистка временных файлов',
    'echo ""',
    'echo "=== Очистка временных файлов ==="',
    'find /tmp -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true',
    'find /var/tmp -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true',
    'echo "✓ Временные файлы очищены"',
    '',
    '# Показать использование диска',
    'echo ""',
    'echo "=== Использование диска ==="',
    'df -h /',
    '',
    'echo ""',
    'echo "=== Очистка завершена ==="'
)

# Объединяем команды через \n (LF)
$cleanupScript = $commands -join "`n"

Write-Host "Передача команд на сервер..." -ForegroundColor Green
Write-Host "Введите пароль когда будет запрошен" -ForegroundColor Yellow
Write-Host ""

# Передаем команды через SSH
$cleanupScript | ssh "$user@$server" "bash -s"

Write-Host "`n=== Готово ===" -ForegroundColor Green

