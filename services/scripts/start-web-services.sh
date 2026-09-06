#!/bin/bash

# TradingAgents Web Services Startup Script
# This script starts the web frontend and API services using Docker Compose

set -e

echo "🚀 Starting TradingAgents Web Services..."

# Change to services directory
cd "$(dirname "$0")/.."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build and start services
echo "📦 Building and starting web services..."
docker-compose -f docker-compose.web.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
timeout=120
counter=0

while [ $counter -lt $timeout ]; do
    if docker-compose -f docker-compose.web.yml ps | grep -q "healthy"; then
        echo "✅ Services are ready!"
        break
    fi
    
    if [ $counter -eq $timeout ]; then
        echo "❌ Timeout waiting for services to be ready"
        docker-compose -f docker-compose.web.yml logs
        exit 1
    fi
    
    sleep 2
    counter=$((counter + 2))
    echo "   Waiting... ($counter/$timeout seconds)"
done

# Show service status
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.web.yml ps

echo ""
echo "🌐 Web Services are now running:"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:3001"
echo ""
echo "📝 To view logs: docker-compose -f docker-compose.web.yml logs -f"
echo "🛑 To stop:      docker-compose -f docker-compose.web.yml down"