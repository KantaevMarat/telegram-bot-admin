#!/bin/bash

# ============================================
# Quick logs viewer
# ============================================

echo "=================================================="
echo "📋 Docker Compose Logs Viewer"
echo "=================================================="
echo ""
echo "Available services:"
echo "  1. All services"
echo "  2. Backend"
echo "  3. Frontend"
echo "  4. Nginx"
echo "  5. PostgreSQL"
echo "  6. Redis"
echo "  7. MinIO"
echo ""
read -p "Select service (1-7): " choice

case $choice in
    1)
        echo "Showing logs for all services..."
        docker compose logs -f
        ;;
    2)
        echo "Showing backend logs..."
        docker compose logs -f backend
        ;;
    3)
        echo "Showing frontend logs..."
        docker compose logs -f frontend
        ;;
    4)
        echo "Showing nginx logs..."
        docker compose logs -f nginx
        ;;
    5)
        echo "Showing PostgreSQL logs..."
        docker compose logs -f postgres
        ;;
    6)
        echo "Showing Redis logs..."
        docker compose logs -f redis
        ;;
    7)
        echo "Showing MinIO logs..."
        docker compose logs -f minio
        ;;
    *)
        echo "Invalid choice. Showing all logs..."
        docker compose logs -f
        ;;
esac

