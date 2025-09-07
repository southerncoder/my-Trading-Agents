#!/bin/bash

# Trading Agents - Stop All Services Script

set -e

# Color functions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${CYAN}🛑 $1${NC}"; }

REMOVE_VOLUMES=false
REMOVE_IMAGES=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --remove-volumes)
            REMOVE_VOLUMES=true
            shift
            ;;
        --remove-images)
            REMOVE_IMAGES=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --remove-volumes  Remove all volumes (WARNING: deletes data)"
            echo "  --remove-images   Remove built images"
            echo "  --help           Show this help"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${MAGENTA}\n🛑 Trading Agents - Stop All Services${NC}"
echo -e "${MAGENTA}================================${NC}"

if [ "$REMOVE_VOLUMES" = true ]; then
    print_warning "\nWARNING: RemoveVolumes flag detected!"
    print_warning "This will DELETE all Neo4j data, logs, and persistent storage!"
    
    read -p "Are you sure? Type 'YES' to confirm: " confirm
    if [ "$confirm" != "YES" ]; then
        print_info "Operation cancelled"
        exit 0
    fi
fi

print_info "\nStopping Trading Agents services..."

if [ "$REMOVE_VOLUMES" = true ]; then
    docker compose down -v --remove-orphans
    print_success "Services stopped and volumes removed"
else
    docker compose down --remove-orphans
    print_success "Services stopped (data preserved)"
fi

if [ "$REMOVE_IMAGES" = true ]; then
    print_info "🗑️  Removing built images..."
    docker image rm trading-agents:latest reddit-service:latest 2>/dev/null || true
    print_success "Built images removed"
fi

print_success "\n🎉 All services stopped successfully!"