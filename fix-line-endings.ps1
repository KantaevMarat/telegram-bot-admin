# Скрипт для конвертации окончаний строк в Unix формат (LF)
# Использование: .\fix-line-endings.ps1

$files = @("cleanup-remote-server.sh", "cleanup-remote-direct.sh", "cleanup-remote-one-liner.sh")

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Конвертация $file..." -ForegroundColor Yellow
        $content = Get-Content $file -Raw
        $content = $content -replace "`r`n", "`n" -replace "`r", "`n"
        [System.IO.File]::WriteAllText((Resolve-Path $file), $content, [System.Text.UTF8Encoding]::new($false))
        Write-Host "✓ $file конвертирован в Unix формат (LF)" -ForegroundColor Green
    } else {
        Write-Host "Файл не найден: $file" -ForegroundColor Red
    }
}

Write-Host "`nГотово! Теперь можно использовать:" -ForegroundColor Green
Write-Host "Get-Content cleanup-remote-server.sh | ssh root@79.174.93.115 'bash -s'" -ForegroundColor Cyan

