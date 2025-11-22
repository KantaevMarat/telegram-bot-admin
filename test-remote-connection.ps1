# Тестовый скрипт для проверки подключения и выполнения простой команды
$server = "79.174.93.115"
$user = "root"

Write-Host "Тест подключения к $user@$server" -ForegroundColor Cyan
Write-Host "Выполнение простой команды: uname -a" -ForegroundColor Yellow
Write-Host ""

# Простая команда для теста
$testCommand = "uname -a"
$testCommand | ssh "$user@$server" "bash -s"

Write-Host "`nЕсли команда выполнилась успешно, подключение работает!" -ForegroundColor Green

