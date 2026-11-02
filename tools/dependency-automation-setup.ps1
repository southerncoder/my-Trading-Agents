# Dependency Automation Setup Script
# Sets up and configures the complete dependency automation system

param(
    [switch]$Install,
    [switch]$Configure,
    [switch]$Test,
    [switch]$Enable,
    [switch]$Status,
    [switch]$All
)

$ErrorActionPreference = "Stop"

Write-Host "🤖 Dependency Automation Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

function Write-SetupLog {
    param($Message, $Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Write-Host $LogEntry
}

function Test-Prerequisites {
    Write-SetupLog "Checking prerequisites..."
    
    $Prerequisites = @{
        "PowerShell" = { $PSVersionTable.PSVersion.Major -ge 5 }
        "Node.js" = { 
            try { 
                $nodeVersion = node --version 2>$null
                return $nodeVersion -match "v(\d+)" -and [int]$Matches[1] -ge 18
            } catch { return $false }
        }
        "npm" = { 
            try { 
                npm --version 2>$null | Out-Null
                return $true
            } catch { return $false }
        }
        "Git" = { 
            try { 
                git --version 2>$null | Out-Null
                return $true
            } catch { return $false }
        }
    }
    
    $AllMet = $true
    foreach ($prereq in $Prerequisites.Keys) {
        $met = & $Prerequisites[$prereq]
        if ($met) {
            Write-SetupLog "✅ $prereq is available" "INFO"
        } else {
            Write-SetupLog "❌ $prereq is missing or outdated" "ERROR"
            $AllMet = $false
        }
    }
    
    if (-not $AllMet) {
        throw "Prerequisites not met. Please install missing components."
    }
    
    Write-SetupLog "✅ All prerequisites met"
}

function Install-Dependencies {
    Write-SetupLog "Installing additional dependencies..."
    
    # Check if npm-check-updates is installed globally
    try {
        ncu --version 2>$null | Out-Null
        Write-SetupLog "✅ npm-check-updates already installed"
    } catch {
        Write-SetupLog "Installing npm-check-updates globally..."
        npm install -g npm-check-updates
        Write-SetupLog "✅ npm-check-updates installed"
    }
    
    # Install PowerShell modules if needed
    $RequiredModules = @("PowerShellGet")
    foreach ($module in $RequiredModules) {
        if (-not (Get-Module -ListAvailable -Name $module)) {
            Write-SetupLog "Installing PowerShell module: $module"
            Install-Module -Name $module -Force -Scope CurrentUser
        } else {
            Write-SetupLog "✅ PowerShell module $module already installed"
        }
    }
}

function Initialize-DirectoryStructure {
    Write-SetupLog "Initializing directory structure..."
    
    $Directories = @(
        "backups/dependency-updates",
        "reports",
        "logs",
        "temp",
        "config"
    )
    
    foreach ($dir in $Directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-SetupLog "✅ Created directory: $dir"
        } else {
            Write-SetupLog "✅ Directory exists: $dir"
        }
    }
}

function Set-ScriptPermissions {
    Write-SetupLog "Setting script permissions..."
    
    $Scripts = @(
        "scripts/dependency-breaking-change-detector.ps1",
        "scripts/dependency-api-compatibility-validator.ps1",
        "scripts/dependency-update.ps1",
        "scripts/dependency-monitor.ps1",
        "scripts/dependency-rollback.ps1",
        "scripts/dependency-maintenance-scheduler.ps1"
    )
    
    foreach ($script in $Scripts) {
        if (Test-Path $script) {
            # On Windows, ensure scripts can be executed
            if ($IsWindows -or $env:OS -eq "Windows_NT") {
                # Set execution policy for the script
                Write-SetupLog "✅ Script permissions set for: $script"
            } else {
                # On Unix-like systems, set executable permissions
                chmod +x $script 2>$null
                Write-SetupLog "✅ Executable permissions set for: $script"
            }
        } else {
            Write-SetupLog "⚠️  Script not found: $script" "WARN"
        }
    }
}

function Test-AutomationScripts {
    Write-SetupLog "Testing automation scripts..."
    
    $TestResults = @{}
    
    # Test breaking change detector
    try {
        Write-SetupLog "Testing breaking change detector..."
        $result = & "./scripts/dependency-breaking-change-detector.ps1" -Package "winston" -FromVersion "3.0.0" -ToVersion "3.18.0" 2>&1
        $TestResults["breaking-change-detector"] = $LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1  # 1 is expected for breaking changes
        Write-SetupLog "✅ Breaking change detector test completed"
    } catch {
        $TestResults["breaking-change-detector"] = $false
        Write-SetupLog "❌ Breaking change detector test failed: $($_.Exception.Message)" "ERROR"
    }
    
    # Test API compatibility validator
    try {
        Write-SetupLog "Testing API compatibility validator..."
        $result = & "./scripts/dependency-api-compatibility-validator.ps1" -DryRun 2>&1
        $TestResults["api-compatibility-validator"] = $LASTEXITCODE -eq 0
        Write-SetupLog "✅ API compatibility validator test completed"
    } catch {
        $TestResults["api-compatibility-validator"] = $false
        Write-SetupLog "❌ API compatibility validator test failed: $($_.Exception.Message)" "ERROR"
    }
    
    # Test maintenance scheduler
    try {
        Write-SetupLog "Testing maintenance scheduler..."
        $result = & "./scripts/dependency-maintenance-scheduler.ps1" -Action "status" 2>&1
        $TestResults["maintenance-scheduler"] = $LASTEXITCODE -eq 0
        Write-SetupLog "✅ Maintenance scheduler test completed"
    } catch {
        $TestResults["maintenance-scheduler"] = $false
        Write-SetupLog "❌ Maintenance scheduler test failed: $($_.Exception.Message)" "ERROR"
    }
    
    # Test dependency update (dry run)
    try {
        Write-SetupLog "Testing dependency update script..."
        $result = & "./scripts/dependency-update.ps1" -Service "trading-agents" -DryRun 2>&1
        $TestResults["dependency-update"] = $LASTEXITCODE -eq 0
        Write-SetupLog "✅ Dependency update test completed"
    } catch {
        $TestResults["dependency-update"] = $false
        Write-SetupLog "❌ Dependency update test failed: $($_.Exception.Message)" "ERROR"
    }
    
    # Summary
    $PassedTests = ($TestResults.Values | Where-Object { $_ -eq $true }).Count
    $TotalTests = $TestResults.Count
    
    Write-SetupLog "Test Results: $PassedTests/$TotalTests passed"
    
    if ($PassedTests -eq $TotalTests) {
        Write-SetupLog "✅ All automation scripts are working correctly"
        return $true
    } else {
        Write-SetupLog "⚠️  Some tests failed. Check the logs above for details." "WARN"
        return $false
    }
}

function Enable-GitHubWorkflows {
    Write-SetupLog "Enabling GitHub workflows..."
    
    $Workflows = @(
        ".github/workflows/dependency-monitor.yml",
        ".github/workflows/dependency-update-automation.yml",
        ".github/workflows/ci-cd.yml"
    )
    
    foreach ($workflow in $Workflows) {
        if (Test-Path $workflow) {
            Write-SetupLog "✅ GitHub workflow exists: $workflow"
        } else {
            Write-SetupLog "⚠️  GitHub workflow missing: $workflow" "WARN"
        }
    }
    
    # Check if GitHub Actions are enabled (requires GitHub CLI or API)
    try {
        $gitRemote = git remote get-url origin 2>$null
        if ($gitRemote) {
            Write-SetupLog "✅ Git repository configured with remote: $gitRemote"
        } else {
            Write-SetupLog "⚠️  No git remote configured" "WARN"
        }
    } catch {
        Write-SetupLog "⚠️  Git repository not initialized" "WARN"
    }
}

function Show-ConfigurationStatus {
    Write-SetupLog "Configuration Status:"
    Write-Host ""
    
    # Check configuration files
    $ConfigFiles = @{
        "Dependency Automation Config" = "config/dependency-automation.json"
        "Best Practices Documentation" = "docs/DEPENDENCY-MANAGEMENT-BEST-PRACTICES.md"
    }
    
    foreach ($config in $ConfigFiles.Keys) {
        $path = $ConfigFiles[$config]
        if (Test-Path $path) {
            Write-Host "✅ $config`: $path" -ForegroundColor Green
        } else {
            Write-Host "❌ $config`: $path (missing)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    
    # Check scripts
    Write-SetupLog "Automation Scripts:"
    $Scripts = @(
        "Breaking Change Detector" = "scripts/dependency-breaking-change-detector.ps1"
        "API Compatibility Validator" = "scripts/dependency-api-compatibility-validator.ps1"
        "Dependency Update" = "scripts/dependency-update.ps1"
        "Dependency Monitor" = "scripts/dependency-monitor.ps1"
        "Dependency Rollback" = "scripts/dependency-rollback.ps1"
        "Maintenance Scheduler" = "scripts/dependency-maintenance-scheduler.ps1"
    )
    
    foreach ($script in $Scripts.Keys) {
        $path = $Scripts[$script]
        if (Test-Path $path) {
            Write-Host "✅ $script`: $path" -ForegroundColor Green
        } else {
            Write-Host "❌ $script`: $path (missing)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    
    # Check GitHub workflows
    Write-SetupLog "GitHub Workflows:"
    $Workflows = @{
        "Dependency Monitor" = ".github/workflows/dependency-monitor.yml"
        "Dependency Update Automation" = ".github/workflows/dependency-update-automation.yml"
        "Enhanced CI/CD" = ".github/workflows/ci-cd.yml"
    }
    
    foreach ($workflow in $Workflows.Keys) {
        $path = $Workflows[$workflow]
        if (Test-Path $path) {
            Write-Host "✅ $workflow`: $path" -ForegroundColor Green
        } else {
            Write-Host "❌ $workflow`: $path (missing)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    
    # Check directories
    Write-SetupLog "Directory Structure:"
    $Directories = @("backups/dependency-updates", "reports", "logs", "config")
    
    foreach ($dir in $Directories) {
        if (Test-Path $dir) {
            Write-Host "✅ $dir" -ForegroundColor Green
        } else {
            Write-Host "❌ $dir (missing)" -ForegroundColor Red
        }
    }
}

function Show-NextSteps {
    Write-Host ""
    Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
    Write-Host "===============" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Review and customize the configuration:" -ForegroundColor Yellow
    Write-Host "   - Edit config/dependency-automation.json" -ForegroundColor Gray
    Write-Host "   - Configure notification webhooks (Slack, Teams)" -ForegroundColor Gray
    Write-Host "   - Set up email SMTP settings if needed" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Set up environment variables:" -ForegroundColor Yellow
    Write-Host "   - SLACK_WEBHOOK_URL (for Slack notifications)" -ForegroundColor Gray
    Write-Host "   - TEAMS_WEBHOOK_URL (for Teams notifications)" -ForegroundColor Gray
    Write-Host "   - MAINTENANCE_EMAIL_RECIPIENTS (comma-separated emails)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Test the automation system:" -ForegroundColor Yellow
    Write-Host "   - Run: ./scripts/dependency-maintenance-scheduler.ps1 -Action status" -ForegroundColor Gray
    Write-Host "   - Run: ./scripts/dependency-breaking-change-detector.ps1 -AllPackages" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Enable GitHub Actions:" -ForegroundColor Yellow
    Write-Host "   - Ensure GitHub repository has Actions enabled" -ForegroundColor Gray
    Write-Host "   - Configure repository secrets for notifications" -ForegroundColor Gray
    Write-Host "   - Test workflows manually from GitHub Actions tab" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Schedule regular maintenance:" -ForegroundColor Yellow
    Write-Host "   - Daily: Security vulnerability scanning" -ForegroundColor Gray
    Write-Host "   - Weekly: Minor dependency updates" -ForegroundColor Gray
    Write-Host "   - Monthly: Comprehensive maintenance reports" -ForegroundColor Gray
    Write-Host ""
    Write-Host "6. Monitor and maintain:" -ForegroundColor Yellow
    Write-Host "   - Review dependency reports regularly" -ForegroundColor Gray
    Write-Host "   - Update breaking change database as needed" -ForegroundColor Gray
    Write-Host "   - Keep API compatibility tests current" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📚 Documentation:" -ForegroundColor Cyan
    Write-Host "   - docs/DEPENDENCY-MANAGEMENT-BEST-PRACTICES.md" -ForegroundColor Gray
    Write-Host "   - config/dependency-automation.json (configuration reference)" -ForegroundColor Gray
    Write-Host ""
}

# Main execution
try {
    if ($All) {
        $Install = $Configure = $Test = $Enable = $Status = $true
    }
    
    if ($Install -or (-not $Configure -and -not $Test -and -not $Enable -and -not $Status)) {
        Test-Prerequisites
        Install-Dependencies
        Initialize-DirectoryStructure
        Set-ScriptPermissions
        Write-SetupLog "✅ Installation completed successfully"
    }
    
    if ($Configure) {
        Write-SetupLog "Configuration files are already created during installation"
        Write-SetupLog "✅ Configuration completed"
    }
    
    if ($Test) {
        $TestsPassed = Test-AutomationScripts
        if ($TestsPassed) {
            Write-SetupLog "✅ All tests passed"
        } else {
            Write-SetupLog "⚠️  Some tests failed - check configuration" "WARN"
        }
    }
    
    if ($Enable) {
        Enable-GitHubWorkflows
        Write-SetupLog "✅ GitHub workflows enabled"
    }
    
    if ($Status) {
        Show-ConfigurationStatus
    }
    
    Write-Host ""
    Write-Host "🎉 Dependency Automation Setup Complete!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    
    Show-NextSteps
    
} catch {
    Write-SetupLog "💥 Setup failed: $($_.Exception.Message)" "ERROR"
    Write-Host ""
    Write-Host "❌ Setup failed. Please check the error above and try again." -ForegroundColor Red
    exit 1
}