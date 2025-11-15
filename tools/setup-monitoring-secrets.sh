#!/bin/bash

# =====================================================================================
# Setup Monitoring Secrets
# =====================================================================================
# This script sets up the required secrets for the monitoring system PostgreSQL database.
# It creates the docker secrets directory and generates a secure password if needed.
# =====================================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up monitoring secrets...${NC}"

# Create secrets directory if it doesn't exist
SECRETS_DIR="./docker/secrets"
if [ ! -d "$SECRETS_DIR" ]; then
    echo -e "${YELLOW}Creating secrets directory: $SECRETS_DIR${NC}"
    mkdir -p "$SECRETS_DIR"
fi

# Check if PostgreSQL password secret exists
POSTGRES_SECRET="$SECRETS_DIR/postgres_password.txt"
if [ ! -f "$POSTGRES_SECRET" ]; then
    echo -e "${YELLOW}PostgreSQL password secret not found. Creating new secure password...${NC}"
    
    # Generate a secure random password
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32 | tr -d "=+/" | cut -c1-25 > "$POSTGRES_SECRET"
    elif command -v python3 &> /dev/null; then
        python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(25)))" > "$POSTGRES_SECRET"
    else
        echo -e "${RED}Error: Neither openssl nor python3 found. Please install one of them or manually create $POSTGRES_SECRET${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Created PostgreSQL password secret: $POSTGRES_SECRET${NC}"
else
    echo -e "${GREEN}PostgreSQL password secret already exists: $POSTGRES_SECRET${NC}"
fi

# Set proper permissions
chmod 600 "$POSTGRES_SECRET"

# Update .env.local if it exists
ENV_FILE=".env.local"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Updating $ENV_FILE with PostgreSQL configuration...${NC}"
    
    # Read the generated password
    POSTGRES_PASSWORD=$(cat "$POSTGRES_SECRET")
    
    # Check if POSTGRES_PASSWORD is already set
    if grep -q "^POSTGRES_PASSWORD=" "$ENV_FILE"; then
        echo -e "${YELLOW}POSTGRES_PASSWORD already set in $ENV_FILE${NC}"
    else
        echo "" >> "$ENV_FILE"
        echo "# PostgreSQL Configuration for Monitoring" >> "$ENV_FILE"
        echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> "$ENV_FILE"
        echo -e "${GREEN}Added POSTGRES_PASSWORD to $ENV_FILE${NC}"
    fi
    
    # Add other PostgreSQL settings if not present
    if ! grep -q "^POSTGRES_HOST=" "$ENV_FILE"; then
        echo "POSTGRES_HOST=postgresql" >> "$ENV_FILE"
    fi
    if ! grep -q "^POSTGRES_PORT=" "$ENV_FILE"; then
        echo "POSTGRES_PORT=5432" >> "$ENV_FILE"
    fi
    if ! grep -q "^POSTGRES_DB=" "$ENV_FILE"; then
        echo "POSTGRES_DB=trading_agents" >> "$ENV_FILE"
    fi
    if ! grep -q "^POSTGRES_USER=" "$ENV_FILE"; then
        echo "POSTGRES_USER=postgres" >> "$ENV_FILE"
    fi
else
    echo -e "${YELLOW}No .env.local file found. Please create one based on .env.monitoring.example${NC}"
fi

echo -e "${GREEN}Monitoring secrets setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review your .env.local file"
echo "2. Start the monitoring system with:"
echo "   docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d"
echo ""
echo -e "${YELLOW}Database Information:${NC}"
echo "- PostgreSQL will be available at localhost:5432"
echo "- Database: trading_agents"
echo "- Username: postgres"
echo "- Password: (stored in $POSTGRES_SECRET)"