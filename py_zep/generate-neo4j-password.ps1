#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Generates a secure random password for Neo4j and updates environment configuration
.DESCRIPTION
    This script generates a cryptographically secure random password for Neo4j,
    stores it in the secrets directory, and updates the environment configuration.
    Should be run before docker-compose up.
#>

# Set error action preference
$ErrorActionPreference = "Stop"

# Define paths
$BaseDir = $PSScriptRoot
$SecretsDir = Join-Path $BaseDir "secrets"
$EnvFile = Join-Path $BaseDir ".env.local"
$Neo4jPasswordFile = Join-Path $SecretsDir "neo4j_password.txt"
$Neo4jUserFile = Join-Path $SecretsDir "neo4j_user.txt"

Write-Host "Neo4j Password Generator for Trading Agents" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Create secrets directory if it doesn't exist
if (-not (Test-Path $SecretsDir)) {
    Write-Host "Creating secrets directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null
}

# Generate a cryptographically secure random password
Write-Host "Generating secure random password..." -ForegroundColor Green

# Generate 32-character password with mixed case and numbers only (no special chars for Docker compatibility)
$PasswordChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
$Password = ""
$Random = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$Bytes = New-Object byte[] 1

for ($i = 0; $i -lt 32; $i++) {
    $Random.GetBytes($Bytes)
    $Index = $Bytes[0] % $PasswordChars.Length
    $Password += $PasswordChars[$Index]
}

$Random.Dispose()

Write-Host "Generated $($Password.Length)-character secure password" -ForegroundColor Green

# Store Neo4j credentials in secrets files
Write-Host "Storing credentials in secrets directory..." -ForegroundColor Yellow

# Write user (default is neo4j)
"neo4j" | Out-File -FilePath $Neo4jUserFile -Encoding ASCII -NoNewline
Write-Host "   Wrote Neo4j user to: $Neo4jUserFile" -ForegroundColor Gray

# Write password
$Password | Out-File -FilePath $Neo4jPasswordFile -Encoding ASCII -NoNewline
Write-Host "   Wrote Neo4j password to: $Neo4jPasswordFile" -ForegroundColor Gray

# Update .env.local file with new password
if (Test-Path $EnvFile) {
    Write-Host "Updating .env.local with new Neo4j password..." -ForegroundColor Yellow
    
    $EnvContent = Get-Content $EnvFile -Raw
    
    # Update NEO4J_PASSWORD line
    $EnvContent = $EnvContent -replace "NEO4J_PASSWORD=.*", "NEO4J_PASSWORD=$Password"
    
    # Write back to file
    $EnvContent | Out-File -FilePath $EnvFile -Encoding ASCII -NoNewline
    
    Write-Host "Updated .env.local with new password" -ForegroundColor Green
} else {
    Write-Host ".env.local not found, password only stored in secrets/" -ForegroundColor Yellow
}

# Set environment variables for current session
$env:NEO4J_USER = "neo4j"
$env:NEO4J_PASSWORD = $Password

Write-Host "" -ForegroundColor White
Write-Host "Neo4j Password Setup Complete!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   • Password stored in: $Neo4jPasswordFile" -ForegroundColor Gray
Write-Host "   • User stored in: $Neo4jUserFile" -ForegroundColor Gray
Write-Host "   • Environment variables updated" -ForegroundColor Gray
Write-Host "   • Current session variables set" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "Ready to run: docker-compose up" -ForegroundColor Green
Write-Host "" -ForegroundColor White

# Security reminder
Write-Host "Security Notes:" -ForegroundColor Yellow
Write-Host "   • Password is cryptographically secure (32 chars)" -ForegroundColor Gray
Write-Host "   • Secrets directory should be in .gitignore" -ForegroundColor Gray
Write-Host "   • Rotate password periodically in production" -ForegroundColor Gray
Write-Host "" -ForegroundColor White