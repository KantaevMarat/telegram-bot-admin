# Telegram Bots Setup Script for PowerShell

Write-Host "Bot Setup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Bot tokens
$CLIENT_BOT_TOKEN = "8330680651:AAErG1_zzA0aX4_O7s-aaQlcCseLF7i8cIE"
$ADMIN_BOT_TOKEN = "8339258038:AAHd4UGAxiDxI57TBi5_REn1GBOg1n50cro"

Write-Host "Checking bot information..." -ForegroundColor Yellow
Write-Host ""

# Get client bot info
Write-Host "1. Client Bot (for users):" -ForegroundColor White
try {
    $clientResponse = Invoke-RestMethod -Uri "https://api.telegram.org/bot$CLIENT_BOT_TOKEN/getMe" -Method Get
    if ($clientResponse.ok) {
        $CLIENT_USERNAME = $clientResponse.result.username
        Write-Host "   OK Username: @$CLIENT_USERNAME" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: Cannot get client bot info" -ForegroundColor Red
        Write-Host "   Check token: $CLIENT_BOT_TOKEN" -ForegroundColor Yellow
        $CLIENT_USERNAME = ""
    }
} catch {
    Write-Host "   ERROR getting client bot info" -ForegroundColor Red
    $CLIENT_USERNAME = ""
}
Write-Host ""

# Get admin bot info
Write-Host "2. Admin Bot (for administrators):" -ForegroundColor White
try {
    $adminResponse = Invoke-RestMethod -Uri "https://api.telegram.org/bot$ADMIN_BOT_TOKEN/getMe" -Method Get
    if ($adminResponse.ok) {
        $ADMIN_USERNAME = $adminResponse.result.username
        Write-Host "   OK Username: @$ADMIN_USERNAME" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: Cannot get admin bot info" -ForegroundColor Red
        Write-Host "   Check token: $ADMIN_BOT_TOKEN" -ForegroundColor Yellow
        $ADMIN_USERNAME = ""
    }
} catch {
    Write-Host "   ERROR getting admin bot info" -ForegroundColor Red
    $ADMIN_USERNAME = ""
}
Write-Host ""

# Create .env file if not exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    
    if (Test-Path "env.example.txt") {
        Copy-Item "env.example.txt" ".env"
        
        # Read file content
        $envContent = Get-Content ".env" -Raw
        
        # Replace tokens
        $envContent = $envContent -replace "TELEGRAM_BOT_TOKEN=.*", "TELEGRAM_BOT_TOKEN=$CLIENT_BOT_TOKEN"
        $envContent = $envContent -replace "ADMIN_BOT_TOKEN=.*", "ADMIN_BOT_TOKEN=$ADMIN_BOT_TOKEN"
        
        if ($CLIENT_USERNAME) {
            $envContent = $envContent -replace "TELEGRAM_BOT_USERNAME=.*", "TELEGRAM_BOT_USERNAME=$CLIENT_USERNAME"
            $envContent = $envContent -replace "VITE_TELEGRAM_BOT_USERNAME=.*", "VITE_TELEGRAM_BOT_USERNAME=$CLIENT_USERNAME"
        }
        
        # Save back
        Set-Content ".env" $envContent
        
        Write-Host "   .env file created and configured" -ForegroundColor Green
    } else {
        Write-Host "   env.example.txt not found" -ForegroundColor Red
    }
} else {
    Write-Host ".env file already exists, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Your bots:" -ForegroundColor Cyan
if ($CLIENT_USERNAME) {
    Write-Host "   Client bot: https://t.me/$CLIENT_USERNAME" -ForegroundColor White
}
if ($ADMIN_USERNAME) {
    Write-Host "   Admin bot: https://t.me/$ADMIN_USERNAME" -ForegroundColor White
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Configure domain in .env (TELEGRAM_WEB_APP_URL)" -ForegroundColor White
Write-Host "   2. Start project: docker-compose up -d" -ForegroundColor White
Write-Host "   3. Add admin: npm run add-admin YOUR_TG_ID password" -ForegroundColor White
Write-Host ""
