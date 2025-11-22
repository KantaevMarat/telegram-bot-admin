# PowerShell команда для очистки удаленного сервера
# Использование: .\cleanup-remote-powershell.ps1
# ИЛИ: Get-Content cleanup-remote-server.sh | ssh root@79.174.93.115 'bash -s'

$server = "79.174.93.115"
$user = "root"

Write-Host "=== Передача скрипта на сервер через SSH ===" -ForegroundColor Cyan
Write-Host "Сервер: $user@$server" -ForegroundColor Yellow
Write-Host "Пароль: marranasuete223" -ForegroundColor Yellow
Write-Host ""

# Вариант 1: Использование Get-Content для передачи файла (с конвертацией CRLF в LF)
Write-Host "Передача скрипта через SSH..." -ForegroundColor Green
$content = [System.IO.File]::ReadAllText("cleanup-remote-server.sh", [System.Text.Encoding]::UTF8)
$content = $content -replace "`r`n", "`n" -replace "`r", "`n"
# Удаляем set -e если есть, так как он вызывает проблемы
$content = $content -replace "set -e\s*`n", ""
$content | ssh "$user@$server" "bash -s"

Write-Host "`n=== Готово ===" -ForegroundColor Green

