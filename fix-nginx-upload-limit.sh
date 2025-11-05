#!/bin/bash

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Увеличиваем лимит загрузки файлов для /api...${NC}"

# Backup
cp /etc/nginx/sites-available/app.marranasuete.ru /etc/nginx/sites-available/app.marranasuete.ru.backup.$(date +%s)

# Создаём новую конфигурацию с увеличенным лимитом
cat > /etc/nginx/sites-available/app.marranasuete.ru << 'EOF'
server {
    listen 80;
    server_name app.marranasuete.ru;

    # MinIO proxy через Docker frontend
    location /minio/ {
        proxy_pass http://localhost:8080/minio/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
        client_max_body_size 100M;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Увеличиваем лимит для загрузки файлов
        client_max_body_size 100M;
        proxy_request_buffering off;
    }

    # Proxy frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name app.marranasuete.ru;

    ssl_certificate /etc/letsencrypt/live/app.marranasuete.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.marranasuete.ru/privkey.pem;

    # MinIO proxy через Docker frontend
    location /minio/ {
        proxy_pass http://localhost:8080/minio/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
        client_max_body_size 100M;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Увеличиваем лимит для загрузки файлов
        client_max_body_size 100M;
        proxy_request_buffering off;
    }

    # Proxy frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo -e "${GREEN}✅ Конфигурация обновлена${NC}"

# Проверяем конфигурацию
echo -e "\n${BLUE}🔍 Проверяем конфигурацию Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Конфигурация корректна${NC}"
    
    # Перезагружаем Nginx
    echo -e "\n${BLUE}🔄 Перезагружаем Nginx...${NC}"
    systemctl reload nginx
    
    echo -e "${GREEN}✅ Nginx перезагружен!${NC}"
    echo -e "${GREEN}🎉 Теперь можно загружать файлы до 100 МБ!${NC}"
else
    echo -e "${RED}❌ Ошибка в конфигурации Nginx${NC}"
    echo -e "${BLUE}Восстанавливаем backup...${NC}"
    cp /etc/nginx/sites-available/app.marranasuete.ru.backup.* /etc/nginx/sites-available/app.marranasuete.ru 2>/dev/null
    exit 1
fi

