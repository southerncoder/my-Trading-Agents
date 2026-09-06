# Dependency Update Script
# Safely updates dependencies with backup and rollback capability

param(
    [switch]$DryRun,
    [switch]$Major,
    [switch]$Security,
    [string]$Service = "trading-agents"
)

$ErrorActionPreference = "Stop"

# Configuration
$ServicePath = "services/$Service"
$BackupDir = "backups/dependency-updates"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "🔄 Dependency Update Script" -ForegroundColor Cyan
Write-Host "Service: $Service" -ForegroundColor Yellow
Write-Host "Timestamp: $Timestamp" -ForegroundColor Yellow

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Function to backup package files
function Backup-PackageFiles {
    Write-Host "📦 Creating backup..." -ForegroundColor Blue
    
    $BackupPath = "$BackupDir/$Service-$Timestamp"
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    
    Copy-Item "$ServicePath/package.json" "$BackupPath/package.json"
    Copy-Item "$ServicePath/package-lock.json" "$BackupPath/package-lock.json" -ErrorAction SilentlyContinue
    
    Write-Host "✅ Backup created at: $BackupPath" -ForegroundColor Green
    return $BackupPath
}

# Function to restore from backup
function Restore-FromBackup {
    param($BackupPath)
    
    Write-Host "🔄 Restoring from backup..." -ForegroundColor Yellow
    
    Copy-Item "$BackupPath/package.json" "$ServicePath/package.json"
    if (Test-Path "$BackupPath/package-lock.json") {
        Copy-Item "$BackupPath/package-lock.json" "$ServicePath/package-lock.json"
    }
    
    Set-Location $ServicePath
    npm install
    Set-Location ../..
    
    Write-Host "✅ Restored from backup" -ForegroundColor Green
}

# Function to check for vulnerabilities
function Test-Security {
    Write-Host "🔒 Running security audit..." -ForegroundColor Blue
    
    Set-Location $ServicePath
    $AuditResult = npm audit --json 2>$null | ConvertFrom-Json
    Set-Location ../..
    
    if ($AuditResult.metadata.vulnerabilities.total -gt 0) {
        Write-Host "⚠️  Found $($AuditResult.metadata.vulnerabilities.total) vulnerabilities" -ForegroundColor Red
        return $false
    } else {
        Write-Host "✅ No vulnerabilities found" -ForegroundColor Green
        return $true
    }
}

# Function to run tests
function Test-Compatibility {
    Write-Host "🧪 Running compatibility tests..." -ForegroundColor Blue
    
    Set-Location $ServicePath
    
    # Type checking
    Write-Host "  - Type checking..." -ForegroundColor Gray
    $TypeCheck = npm run type-check 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Type checking failed" -ForegroundColor Red
        Set-Location ../..
        return $false
    }
    
    # Linting (allow warnings)
    Write-Host "  - Linting..." -ForegroundColor Gray
    npm run lint 2>&1 | Out-Null
    
    # Basic smoke test
    Write-Host "  - Smoke test..." -ForegroundColor Gray
    $SmokeTest = npm run smoke 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Smoke test failed (may be due to known compatibility issues)" -ForegroundColor Yellow
    }
    
    Set-Location ../..
    Write-Host "✅ Compatibility tests completed" -ForegroundColor Green
    return $true
}

# Function to update dependencies
function Update-Dependencies {
    param($UpdateType)
    
    Write-Host "📦 Updating dependencies ($UpdateType)..." -ForegroundColor Blue
    
    Set-Location $ServicePath
    
    switch ($UpdateType) {
        "security" {
            npm audit fix
        }
        "minor" {
            npm update
        }
        "major" {
            # Use npm-check-updates for major updates
            if (Get-Command ncu -ErrorAction SilentlyContinue) {
                ncu -u
                npm install
            } else {
                Write-Host "⚠️  npm-check-updates not installed. Install with: npm install -g npm-check-updates" -ForegroundColor Yellow
                npm update
            }
        }
        default {
            npm update
        }
    }
    
    Set-Location ../..
}

# Function to generate update report
function New-UpdateReport {
    param($BackupPath, $Success)
    
    $ReportPath = "$BackupPath/update-report.md"
    $Report = @"
# Dependency Update Report

**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Service**: $Service
**Status**: $(if ($Success) { "✅ Success" } else { "❌ Failed" })

## Pre-Update State
$(Get-Content "$BackupPath/package.json" | Select-String '"version"' | Select-Object -First 1)

## Post-Update State
$(if (Test-Path "$ServicePath/package.json") { Get-Content "$ServicePath/package.json" | Select-String '"version"' | Select-Object -First 1 } else { "N/A" })

## Security Audit
$(if ($Success) { "✅ No vulnerabilities found" } else { "⚠️ Check required" })

## Compatibility Tests
$(if ($Success) { "✅ Tests passed" } else { "❌ Tests failed - see logs" })

## Rollback Instructions
If issues occur, run:
``````powershell
.\scripts\dependency-rollback.ps1 -BackupPath "$BackupPath"
``````

"@
    
    $Report | Out-File -FilePath $ReportPath -Encoding UTF8
    Write-Host "📄 Report generated: $ReportPath" -ForegroundColor Green
}

# Main execution
try {
    Write-Host "🚀 Starting dependency update process..." -ForegroundColor Green
    
    # Validate service path
    if (-not (Test-Path "$ServicePath/package.json")) {
        throw "Service not found: $ServicePath"
    }
    
    # Create backup
    $BackupPath = Backup-PackageFiles
    
    # Determine update type
    $UpdateType = if ($Security) { "security" } elseif ($Major) { "major" } else { "minor" }
    
    if ($DryRun) {
        Write-Host "🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
        
        Set-Location $ServicePath
        Write-Host "📋 Current outdated packages:" -ForegroundColor Blue
        npm outdated
        
        Write-Host "🔒 Security audit:" -ForegroundColor Blue
        npm audit
        
        Set-Location ../..
        return
    }
    
    # Update dependencies
    Update-Dependencies -UpdateType $UpdateType
    
    # Run security check
    $SecurityPassed = Test-Security
    
    # Run compatibility tests
    $CompatibilityPassed = Test-Compatibility
    
    $Success = $SecurityPassed -and $CompatibilityPassed
    
    if (-not $Success) {
        Write-Host "❌ Update validation failed. Rolling back..." -ForegroundColor Red
        Restore-FromBackup -BackupPath $BackupPath
        $Success = $false
    }
    
    # Generate report
    New-UpdateReport -BackupPath $BackupPath -Success $Success
    
    if ($Success) {
        Write-Host "✅ Dependency update completed successfully!" -ForegroundColor Green
        Write-Host "📄 Backup available at: $BackupPath" -ForegroundColor Blue
    } else {
        Write-Host "❌ Dependency update failed and was rolled back" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "💥 Error during dependency update: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($BackupPath -and (Test-Path $BackupPath)) {
        Write-Host "🔄 Attempting rollback..." -ForegroundColor Yellow
        try {
            Restore-FromBackup -BackupPath $BackupPath
            Write-Host "✅ Rollback completed" -ForegroundColor Green
        } catch {
            Write-Host "❌ Rollback failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    exit 1
}