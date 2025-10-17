#!/bin/bash

# Generate Local SSL Certificates for TradingAgents Web API
# This script creates self-signed certificates for local HTTPS development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/../certs"
API_HOST="${API_HOST:-localhost}"
FRONTEND_HOST="${FRONTEND_HOST:-localhost}"

echo "🔐 Generating SSL certificates for TradingAgents Web API..."

# Create certs directory
mkdir -p "$CERTS_DIR"

# Check if mkcert is available
if command -v mkcert &> /dev/null; then
    echo "✅ Using mkcert for locally trusted certificates"
    
    # Install mkcert CA if not already installed
    if ! mkcert -CAROOT &> /dev/null; then
        echo "📋 Installing mkcert CA..."
        mkcert -install
    fi
    
    # Generate certificates for API and frontend
    cd "$CERTS_DIR"
    mkcert -key-file api-key.pem -cert-file api-cert.pem \
        "$API_HOST" "*.${API_HOST}" \
        127.0.0.1 ::1
    
    mkcert -key-file frontend-key.pem -cert-file frontend-cert.pem \
        "$FRONTEND_HOST" "*.${FRONTEND_HOST}" \
        127.0.0.1 ::1
    
    echo "✅ Generated locally trusted certificates using mkcert"
    
elif command -v openssl &> /dev/null; then
    echo "⚠️  mkcert not found, using OpenSSL for self-signed certificates"
    echo "   Note: Browsers will show security warnings for self-signed certs"
    
    cd "$CERTS_DIR"
    
    # Generate API certificate
    openssl req -x509 -newkey rsa:4096 -keyout api-key.pem -out api-cert.pem \
        -days 365 -nodes -subj "/CN=$API_HOST" \
        -addext "subjectAltName=DNS:$API_HOST,DNS:*.$API_HOST,IP:127.0.0.1,IP:::1"
    
    # Generate frontend certificate
    openssl req -x509 -newkey rsa:4096 -keyout frontend-key.pem -out frontend-cert.pem \
        -days 365 -nodes -subj "/CN=$FRONTEND_HOST" \
        -addext "subjectAltName=DNS:$FRONTEND_HOST,DNS:*.$FRONTEND_HOST,IP:127.0.0.1,IP:::1"
    
    echo "✅ Generated self-signed certificates using OpenSSL"
    
else
    echo "❌ Error: Neither mkcert nor openssl found"
    echo "   Please install one of them:"
    echo "   - mkcert: https://github.com/FiloSottile/mkcert#installation"
    echo "   - openssl: Usually available via package manager"
    exit 1
fi

# Set appropriate permissions
chmod 600 "$CERTS_DIR"/*.pem

echo ""
echo "📁 Certificates generated in: $CERTS_DIR"
echo "   - API: api-cert.pem, api-key.pem"
echo "   - Frontend: frontend-cert.pem, frontend-key.pem"
echo ""
echo "🚀 To use HTTPS in development:"
echo "   1. Set HTTPS_ENABLED=true in .env.local"
echo "   2. Restart the web services"
echo "   3. Access API at: https://$API_HOST:3001"
echo "   4. Access Frontend at: https://$FRONTEND_HOST:3000"
echo ""

if command -v mkcert &> /dev/null; then
    echo "✅ Certificates are locally trusted (no browser warnings)"
else
    echo "⚠️  Self-signed certificates will show browser warnings"
    echo "   Click 'Advanced' -> 'Proceed to localhost' to continue"
fi

echo ""
echo "🔒 Security Notes:"
echo "   - These certificates are for local development only"
echo "   - Never use these certificates in production"
echo "   - Certificates expire in 365 days"