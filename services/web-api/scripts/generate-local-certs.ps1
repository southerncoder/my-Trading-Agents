# Generate Local SSL Certificates for TradingAgents Web API
# This script creates self-signed certificates for local HTTPS development

param(
    [string]$ApiHost = "localhost",
    [string]$FrontendHost = "localhost"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CertsDir = Join-Path $ScriptDir "..\certs"

Write-Host "Generating SSL certificates for TradingAgents Web API..."

# Create certs directory
if (-not (Test-Path $CertsDir)) {
    New-Item -ItemType Directory -Path $CertsDir -Force | Out-Null
}

# Check if mkcert is available
$mkcertPath = Get-Command mkcert -ErrorAction SilentlyContinue

if ($mkcertPath) {
    Write-Host "Using mkcert for locally trusted certificates"
    
    # Install mkcert CA if not already installed
    try {
        & mkcert -install 2>$null
    } catch {
        Write-Host "Installing mkcert CA..."
        & mkcert -install
    }
    
    # Generate certificates for API and frontend
    Push-Location $CertsDir
    try {
        & mkcert -key-file api-key.pem -cert-file api-cert.pem $ApiHost "*.$ApiHost" 127.0.0.1 ::1
        & mkcert -key-file frontend-key.pem -cert-file frontend-cert.pem $FrontendHost "*.$FrontendHost" 127.0.0.1 ::1
        Write-Host "Generated locally trusted certificates using mkcert"
    } finally {
        Pop-Location
    }
    
    $certType = "mkcert"
} else {
    # Check if OpenSSL is available
    $opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
    
    if ($opensslPath) {
        Write-Host "mkcert not found, using OpenSSL for self-signed certificates"
        Write-Host "Note: Browsers will show security warnings for self-signed certs"
        
        Push-Location $CertsDir
        try {
            # Generate API certificate
            & openssl req -x509 -newkey rsa:4096 -keyout api-key.pem -out api-cert.pem -days 365 -nodes -subj "/CN=$ApiHost"
            
            # Generate frontend certificate
            & openssl req -x509 -newkey rsa:4096 -keyout frontend-key.pem -out frontend-cert.pem -days 365 -nodes -subj "/CN=$FrontendHost"
            
            Write-Host "Generated self-signed certificates using OpenSSL"
        } finally {
            Pop-Location
        }
        
        $certType = "openssl"
    } else {
        Write-Host "Error: Neither mkcert nor openssl found" -ForegroundColor Red
        Write-Host "Please install one of them:" -ForegroundColor Red
        Write-Host "- mkcert: choco install mkcert" -ForegroundColor Red
        Write-Host "- openssl: Usually available via Git for Windows or WSL" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Certificates generated in: $CertsDir"
Write-Host "- API: api-cert.pem, api-key.pem"
Write-Host "- Frontend: frontend-cert.pem, frontend-key.pem"
Write-Host ""
Write-Host "To use HTTPS in development:"
Write-Host "1. Set HTTPS_ENABLED=true in .env.local"
Write-Host "2. Restart the web services"
Write-Host "3. Access API at: https://$ApiHost:3001"
Write-Host "4. Access Frontend at: https://$FrontendHost:3000"
Write-Host ""

if ($certType -eq "mkcert") {
    Write-Host "Certificates are locally trusted (no browser warnings)"
} else {
    Write-Host "Self-signed certificates will show browser warnings"
    Write-Host "Click 'Advanced' -> 'Proceed to localhost' to continue"
}

Write-Host ""
Write-Host "Security Notes:"
Write-Host "- These certificates are for local development only"
Write-Host "- Never use these certificates in production"
Write-Host "- Certificates expire in 365 days"