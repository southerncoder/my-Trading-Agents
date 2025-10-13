# Dependency Rollback Script
# Rolls back dependencies to a previous backup

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    [string]$Service = "trading-agents"
)

$ErrorActionPreference = "Stop"

$ServicePath = "services/$Service"

Write-Host "🔄 Dependency Rollback Script" -ForegroundColor Cyan
Write-Host "Service: $Service" -ForegroundColor Yellow
Write-Host "Backup Path: $BackupPath" -ForegroundColor Yellow

# Validate inputs
if (-not (Test-Path $BackupPath)) {
    Write-Host "❌ Backup path not found: $BackupPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$BackupPath/package.json")) {
    Write-Host "❌ Backup package.json not found in: $BackupPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$ServicePath/package.json")) {
    Write-Host "❌ Service not found: $ServicePath" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "🔄 Rolling back dependencies..." -ForegroundColor Blue
    
    # Restore package files
    Copy-Item "$BackupPath/package.json" "$ServicePath/package.json"
    if (Test-Path "$BackupPath/package-lock.json") {
        Copy-Item "$BackupPath/package-lock.json" "$ServicePath/package-lock.json"
    }
    
    # Reinstall dependencies
    Write-Host "📦 Reinstalling dependencies..." -ForegroundColor Blue
    Set-Location $ServicePath
    npm install
    Set-Location ../..
    
    # Verify rollback
    Write-Host "🔒 Running security audit..." -ForegroundColor Blue
    Set-Location $ServicePath
    $AuditResult = npm audit --json 2>$null | ConvertFrom-Json
    Set-Location ../..
    
    if ($AuditResult.metadata.vulnerabilities.total -gt 0) {
        Write-Host "⚠️  Warning: $($AuditResult.metadata.vulnerabilities.total) vulnerabilities found after rollback" -ForegroundColor Yellow
    } else {
        Write-Host "✅ No vulnerabilities found" -ForegroundColor Green
    }
    
    Write-Host "✅ Rollback completed successfully!" -ForegroundColor Green
    Write-Host "📄 Restored from backup: $BackupPath" -ForegroundColor Blue
    
} catch {
    Write-Host "💥 Error during rollback: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}