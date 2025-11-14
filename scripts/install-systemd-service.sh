#!/bin/bash

# ============================================
# Install systemd service for auto-start
# ============================================

set -e

echo "=================================================="
echo "Installing systemd service for Telegram Mini App"
echo "=================================================="

# Проверка что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script must be run as root"
    echo "Please run: sudo ./scripts/install-systemd-service.sh"
    exit 1
fi

# Получение текущей директории проекта
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📁 Project directory: $PROJECT_DIR"

# Создание systemd service файла
SERVICE_FILE="/etc/systemd/system/tg-app.service"

echo ""
echo "📝 Creating systemd service file..."

cat > $SERVICE_FILE << EOF
[Unit]
Description=Telegram Mini App (Docker Compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created: $SERVICE_FILE"

# Перезагрузка systemd
echo ""
echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload
echo "✅ Systemd daemon reloaded"

# Включение автозапуска
echo ""
echo "🚀 Enabling auto-start on boot..."
systemctl enable tg-app.service
echo "✅ Auto-start enabled"

# Вывод статуса
echo ""
echo "=================================================="
echo "✅ systemd Service Installed Successfully!"
echo "=================================================="
echo ""
echo "Available commands:"
echo "  Start service:    sudo systemctl start tg-app"
echo "  Stop service:     sudo systemctl stop tg-app"
echo "  Restart service:  sudo systemctl restart tg-app"
echo "  Check status:     sudo systemctl status tg-app"
echo "  View logs:        sudo journalctl -u tg-app -f"
echo "  Disable auto-start: sudo systemctl disable tg-app"
echo ""
echo "Service will automatically start on system boot"
echo ""

