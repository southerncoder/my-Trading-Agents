#!/bin/bash

# Trading Agents - Unified Docker Compose Startup Script
# Starts all services using the unified docker-compose.yml

set -e

# Color functions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${MAGENTA}\n🚀 Trading Agents - Unified Docker Compose Startup${NC}"
    echo -e "${MAGENTA}================================${NC}"
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${CYAN}📋 $1${NC}"; }

# Parse command line arguments
BUILD=false
FRESH=false
DETACHED=false
SERVICES=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD=true
            shift
            ;;
        --fresh)
            FRESH=true
            shift
            ;;
        --detached|-d)
            DETACHED=true
            shift
            ;;
        --services)
            SERVICES="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --build     Force rebuild of containers"
            echo "  --fresh     Clean start (removes volumes)"
            echo "  --detached  Run in background"
            echo "  --services  Specify services to start (comma-separated)"
            echo "  --help      Show this help"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_header

# Verify Docker is running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! docker --version &> /dev/null; then
    print_error "Docker is not running"
    exit 1
fi

print_success "Docker is available"

# Verify docker compose is available
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available"
    exit 1
fi

print_success "Docker Compose is available"

# Check if unified docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    print_error "Unified docker-compose.yml not found in current directory"
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_success "Found unified docker-compose.yml"

# Environment file checks
print_info "\nEnvironment Configuration Check:"
env_files=(".env.local" "py_zep/.env.local" "services/reddit-service/.env.local")

for env_file in "${env_files[@]}"; do
    if [ -f "$env_file" ]; then
        print_success "$env_file exists"
    else
        print_warning "$env_file not found (optional but recommended)"
    fi
done

# Fresh start - remove volumes if requested
if [ "$FRESH" = true ]; then
    print_warning "\n🧹 Fresh start requested - removing all volumes and data"
    print_warning "This will DELETE all Neo4j data, logs, and persistent storage!"
    
    read -p "Are you sure? Type 'YES' to confirm: " confirm
    if [ "$confirm" = "YES" ]; then
        print_info "Stopping all services..."
        docker compose down -v --remove-orphans
        
        print_info "Removing volumes..."
        docker volume prune -f
        
        print_success "Clean start completed"
    else
        print_info "Fresh start cancelled"
        FRESH=false
    fi
fi

# Build containers if requested
if [ "$BUILD" = true ]; then
    print_info "\n🔨 Building containers..."
    if [ -n "$SERVICES" ]; then
        docker compose build $SERVICES
    else
        docker compose build
    fi
    print_success "Build completed successfully"
fi

# Prepare docker compose command
compose_args="up"

if [ "$DETACHED" = true ]; then
    compose_args="$compose_args --detach"
fi

if [ -n "$SERVICES" ]; then
    compose_args="$compose_args $SERVICES"
    print_info "\n🎯 Starting selected services: $SERVICES"
else
    print_info "\n🎯 Starting all services..."
fi

# Start services
print_info "\n🚀 Starting Trading Agents services..."
print_info "Services will start in the following order:"
print_info "  1. Neo4j Database"
print_info "  2. Zep Graphiti Memory Service"
print_info "  3. Reddit Sentiment Service"
print_info "  4. Trading Agents Application"

docker compose $compose_args

if [ "$DETACHED" = true ]; then
    print_success "\n✅ All services started successfully in background"
    
    # Show service status
    print_info "\n📊 Service Status:"
    docker compose ps
    
    print_info "\n🌐 Service URLs:"
    print_info "  • Neo4j Browser: http://localhost:7474"
    print_info "  • Zep Graphiti API: http://localhost:8000"
    print_info "  • Reddit Service: http://localhost:3001"
    print_info "  • Trading Agents: Container running"
    
    print_info "\n📝 Useful Commands:"
    print_info "  • View logs: docker compose logs -f [service-name]"
    print_info "  • Stop services: docker compose down"
    print_info "  • Service status: docker compose ps"
    print_info "  • Restart service: docker compose restart [service-name]"
fi

print_success "\n🎉 Trading Agents services startup completed!"