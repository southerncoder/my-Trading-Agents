#!/bin/bash

# TradingAgents Web Services Startup Script
# Starts the web frontend and API backend in Docker containers

set -e

FRESH=false
BUILD=false
LOGS=false
STOP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fresh)
            FRESH=true
            shift
            ;;
        --build)
            BUILD=true
            shift
            ;;
        --logs)
            LOGS=true
            shift
            ;;
        --stop)
            STOP=true
            shift
            ;;
        *)
            echo "Unknown option $1"
            echo "Usage: $0 [--fresh] [--build] [--logs] [--stop]"
            exit 1
            ;;
    esac
done

echo "🚀 TradingAgents Web Services Manager"
echo "====================================="

if [ "$STOP" = true ]; then
    echo "🛑 Stopping web services..."
    docker-compose -f docker-compose.web.yml down
    echo "✅ Web services stopped"
    exit 0
fi

if [ "$FRESH" = true ]; then
    echo "🧹 Cleaning up existing containers and volumes..."
    docker-compose -f docker-compose.web.yml down -v --remove-orphans
    docker system prune -f
fi

if [ "$BUILD" = true ]; then
    echo "🔨 Building web services..."
    docker-compose -f docker-compose.web.yml build --no-cache
fi

echo "🚀 Starting TradingAgents web services..."

# Start services
docker-compose -f docker-compose.web.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."

max_wait=120 # 2 minutes
waited=0
interval=5

while [ $waited -lt $max_wait ]; do
    sleep $interval
    waited=$((waited + interval))
    
    api_health=$(docker-compose -f docker-compose.web.yml ps --services --filter "status=running" | grep -c "web-api" || true)
    frontend_health=$(docker-compose -f docker-compose.web.yml ps --services --filter "status=running" | grep -c "web-frontend" || true)
    
    if [ "$api_health" -eq 1 ] && [ "$frontend_health" -eq 1 ]; then
        echo "✅ All services are healthy!"
        break
    fi
    
    echo "⏳ Still waiting... ($waited/$max_wait seconds)"
done

if [ $waited -ge $max_wait ]; then
    echo "❌ Services failed to start within $max_wait seconds"
    echo "📋 Checking service status..."
    docker-compose -f docker-compose.web.yml ps
    exit 1
fi

echo ""
echo "🎉 TradingAgents Web Services Started Successfully!"
echo "================================================="
echo ""
echo "🌐 Web Frontend:  http://localhost"
echo "🔌 API Backend:   http://localhost:38401"
echo "📡 WebSocket:     ws://localhost:38401/ws"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.web.yml ps

if [ "$LOGS" = true ]; then
    echo ""
    echo "📋 Following logs (Ctrl+C to exit)..."
    docker-compose -f docker-compose.web.yml logs -f
fi

echo ""
echo "💡 Useful Commands:"
echo "  View logs:     docker-compose -f docker-compose.web.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.web.yml down"
echo "  Restart:       ./scripts/start-web-services.sh --fresh"