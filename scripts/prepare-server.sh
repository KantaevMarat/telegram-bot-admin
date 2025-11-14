#!/bin/bash

# ============================================
# Server Preparation Script
# Полная подготовка чистого Ubuntu сервера
# ============================================

set -e

echo "=================================================="
echo "🚀 Ubuntu Server Preparation for Production"
echo "=================================================="

# Проверка что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script must be run as root"
    echo "Please run: sudo ./scripts/prepare-server.sh"
    exit 1
fi

echo ""
echo "This script will install and configure:"
echo "  - Docker & Docker Compose"
echo "  - Git"
echo "  - UFW Firewall"
echo "  - System utilities"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# ============================================
# 1. Update System
# ============================================
echo ""
echo "=================================================="
echo "📦 Step 1: Updating system packages"
echo "=================================================="

apt update
apt upgrade -y

echo "✅ System updated"

# ============================================
# 2. Install Docker
# ============================================
echo ""
echo "=================================================="
echo "🐳 Step 2: Installing Docker"
echo "=================================================="

# Remove old versions
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install dependencies
apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
docker compose version

echo "✅ Docker installed successfully"

# ============================================
# 3. Install Git
# ============================================
echo ""
echo "=================================================="
echo "📂 Step 3: Installing Git"
echo "=================================================="

apt install -y git

git --version

echo "✅ Git installed successfully"

# ============================================
# 4. Install utilities
# ============================================
echo ""
echo "=================================================="
echo "🛠️  Step 4: Installing utilities"
echo "=================================================="

apt install -y \
    htop \
    net-tools \
    wget \
    vim \
    nano \
    curl \
    unzip \
    jq

echo "✅ Utilities installed"

# ============================================
# 5. Configure Firewall
# ============================================
echo ""
echo "=================================================="
echo "🔥 Step 5: Configuring Firewall (UFW)"
echo "=================================================="

# Install UFW if not installed
apt install -y ufw

# Reset UFW to default
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT!)
ufw allow 22/tcp
echo "✅ SSH port 22 allowed"

# Allow HTTP and HTTPS
ufw allow 80/tcp
echo "✅ HTTP port 80 allowed"

ufw allow 443/tcp
echo "✅ HTTPS port 443 allowed"

# Enable UFW
ufw --force enable

# Show status
ufw status

echo "✅ Firewall configured"

# ============================================
# 6. Configure system limits
# ============================================
echo ""
echo "=================================================="
echo "⚙️  Step 6: Configuring system limits"
echo "=================================================="

# Increase file descriptor limits
cat >> /etc/security/limits.conf << EOF

# Increased limits for production
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF

# Increase vm.max_map_count for Elasticsearch/MinIO
sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" >> /etc/sysctl.conf

echo "✅ System limits configured"

# ============================================
# 7. Setup timezone
# ============================================
echo ""
echo "=================================================="
echo "🕐 Step 7: Setting timezone"
echo "=================================================="

# Set timezone to UTC (or change as needed)
timedatectl set-timezone UTC

echo "✅ Timezone set to UTC"

# ============================================
# 8. Enable automatic security updates
# ============================================
echo ""
echo "=================================================="
echo "🔒 Step 8: Enabling automatic security updates"
echo "=================================================="

apt install -y unattended-upgrades

# Configure automatic updates
cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

echo "✅ Automatic security updates enabled"

# ============================================
# Final Information
# ============================================
echo ""
echo "=================================================="
echo "✅ Server Preparation Complete!"
echo "=================================================="
echo ""
echo "Installed software:"
echo "  ✅ Docker $(docker --version | cut -d' ' -f3)"
echo "  ✅ Docker Compose $(docker compose version | cut -d' ' -f4)"
echo "  ✅ Git $(git --version | cut -d' ' -f3)"
echo ""
echo "Firewall rules:"
ufw status numbered
echo ""
echo "Next steps:"
echo "  1. Clone your project:"
echo "     cd /root"
echo "     git clone <repository-url> tg-main"
echo "     cd tg-main"
echo ""
echo "  2. Setup environment:"
echo "     cp env.production .env"
echo "     nano .env"
echo ""
echo "  3. Deploy application:"
echo "     chmod +x scripts/*.sh setup-ssl.sh"
echo "     ./scripts/deploy.sh"
echo ""
echo "  4. Setup SSL:"
echo "     ./setup-ssl.sh"
echo ""
echo "  5. Install systemd service:"
echo "     sudo ./scripts/install-systemd-service.sh"
echo ""
echo "Server is ready for production deployment! 🚀"
echo ""

