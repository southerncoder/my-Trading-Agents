# Dependency Maintenance Scheduler
# Manages scheduled dependency maintenance tasks and procedures

param(
    [string]$Action = "status",
    [string]$Service = "all",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Configuration
$MaintenanceConfig = @{
    schedule = @{
        security_updates = @{
            frequency = "daily"
            time = "06:00"
            enabled = $true
        }
        minor_updates = @{
            frequency = "weekly"
            day = "sunday"
            time = "02:00"
            enabled = $true
        }
        major_updates = @{
            frequency = "monthly"
            day = "first_sunday"
            time = "01:00"
            enabled = $false  # Requires manual approval
        }
        vulnerability_scan = @{
            frequency = "daily"
            time = "05:00"
            enabled = $true
        }
        compatibility_check = @{
            frequency = "weekly"
            day = "saturday"
            time = "23:00"
            enabled = $true
        }
        maintenance_report = @{
            frequency = "monthly"
            day = "last_day"
            time = "23:30"
            enabled = $true
        }
    }
    thresholds = @{
        critical_vulnerabilities = 0
        high_vulnerabilities = 5
        outdated_packages_warning = 10
        outdated_packages_critical = 25
        days_since_last_update = 30
    }
    notifications = @{
        slack_webhook = $env:SLACK_WEBHOOK_URL
        email_recipients = @($env:MAINTENANCE_EMAIL_RECIPIENTS -split ',')
        teams_webhook = $env:TEAMS_WEBHOOK_URL
    }
}

$Services = @("trading-agents", "reddit-service", "yahoo-finance-service", "google-news-service", "finance-aggregator-service")

function Write-MaintenanceLog {
    param($Message, $Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Write-Host $LogEntry
    
    $LogPath = "logs/dependency-maintenance.log"
    $LogDir = Split-Path $LogPath -Parent
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    $LogEntry | Out-File -FilePath $LogPath -Append -Encoding UTF8
}

function Get-MaintenanceStatus {
    Write-MaintenanceLog "Getting maintenance status for all services"
    
    $Status = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        services = @{}
        overall = @{
            critical_issues = 0
            warnings = 0
            last_update = $null
            next_scheduled = $null
        }
    }
    
    foreach ($svc in $Services) {
        if (Test-Path "services/$svc/package.json") {
            Write-MaintenanceLog "Checking status for $svc"
            
            $ServiceStatus = @{
                vulnerabilities = @{
                    critical = 0
                    high = 0
                    moderate = 0
                    low = 0
                    total = 0
                }
                outdated_packages = 0
                last_update = $null
                last_scan = $null
                health = "unknown"
            }
            
            # Check for recent backups (indicates recent updates)
            $BackupPattern = "backups/dependency-updates/$svc-*"
            if (Test-Path $BackupPattern) {
                $LatestBackup = Get-ChildItem $BackupPattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                if ($LatestBackup) {
                    $ServiceStatus.last_update = $LatestBackup.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                }
            }
            
            # Check vulnerability status
            try {
                Set-Location "services/$svc"
                $AuditResult = npm audit --json 2>$null | ConvertFrom-Json
                if ($AuditResult.metadata) {
                    $ServiceStatus.vulnerabilities.critical = $AuditResult.metadata.vulnerabilities.critical
                    $ServiceStatus.vulnerabilities.high = $AuditResult.metadata.vulnerabilities.high
                    $ServiceStatus.vulnerabilities.moderate = $AuditResult.metadata.vulnerabilities.moderate
                    $ServiceStatus.vulnerabilities.low = $AuditResult.metadata.vulnerabilities.low
                    $ServiceStatus.vulnerabilities.total = $AuditResult.metadata.vulnerabilities.total
                }
                
                # Check outdated packages
                $OutdatedResult = npm outdated --json 2>$null
                if ($OutdatedResult) {
                    $OutdatedPackages = $OutdatedResult | ConvertFrom-Json
                    $ServiceStatus.outdated_packages = ($OutdatedPackages.PSObject.Properties | Measure-Object).Count
                }
                
                Set-Location ../..
            } catch {
                Write-MaintenanceLog "Error checking $svc status: $($_.Exception.Message)" "ERROR"
                Set-Location ../..
            }
            
            # Determine health status
            if ($ServiceStatus.vulnerabilities.critical -gt $MaintenanceConfig.thresholds.critical_vulnerabilities) {
                $ServiceStatus.health = "critical"
                $Status.overall.critical_issues++
            } elseif ($ServiceStatus.vulnerabilities.high -gt $MaintenanceConfig.thresholds.high_vulnerabilities -or 
                      $ServiceStatus.outdated_packages -gt $MaintenanceConfig.thresholds.outdated_packages_critical) {
                $ServiceStatus.health = "warning"
                $Status.overall.warnings++
            } elseif ($ServiceStatus.vulnerabilities.total -eq 0 -and $ServiceStatus.outdated_packages -lt $MaintenanceConfig.thresholds.outdated_packages_warning) {
                $ServiceStatus.health = "healthy"
            } else {
                $ServiceStatus.health = "attention"
            }
            
            $Status.services[$svc] = $ServiceStatus
        }
    }
    
    return $Status
}

function New-MaintenanceReport {
    param($Status)
    
    $ReportPath = "reports/dependency-maintenance-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"
    $ReportDir = Split-Path $ReportPath -Parent
    
    if (-not (Test-Path $ReportDir)) {
        New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
    }
    
    $Report = @"
# Dependency Maintenance Report

**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Executive Summary

- **Critical Issues**: $($Status.overall.critical_issues)
- **Warnings**: $($Status.overall.warnings)
- **Services Monitored**: $($Status.services.Count)

"@
    
    # Overall health status
    if ($Status.overall.critical_issues -gt 0) {
        $Report += "- **Overall Status**: 🚨 **CRITICAL** - Immediate action required`n"
    } elseif ($Status.overall.warnings -gt 0) {
        $Report += "- **Overall Status**: ⚠️ **WARNING** - Attention needed`n"
    } else {
        $Report += "- **Overall Status**: ✅ **HEALTHY** - All systems normal`n"
    }
    
    $Report += "`n## Service Details`n`n"
    
    foreach ($service in $Status.services.Keys) {
        $svcStatus = $Status.services[$service]
        $healthIcon = switch ($svcStatus.health) {
            "critical" { "🚨" }
            "warning" { "⚠️" }
            "attention" { "🔍" }
            "healthy" { "✅" }
            default { "❓" }
        }
        
        $Report += @"
### $healthIcon $service

**Health**: $($svcStatus.health.ToUpper())
**Last Update**: $($svcStatus.last_update ?? 'Never')

#### Vulnerabilities
- Critical: $($svcStatus.vulnerabilities.critical)
- High: $($svcStatus.vulnerabilities.high)
- Moderate: $($svcStatus.vulnerabilities.moderate)
- Low: $($svcStatus.vulnerabilities.low)
- **Total**: $($svcStatus.vulnerabilities.total)

#### Package Status
- Outdated packages: $($svcStatus.outdated_packages)

"@
        
        # Add recommendations
        if ($svcStatus.health -eq "critical") {
            $Report += "**🚨 URGENT**: Critical vulnerabilities detected. Update immediately.`n`n"
        } elseif ($svcStatus.health -eq "warning") {
            $Report += "**⚠️ ACTION NEEDED**: High vulnerabilities or many outdated packages.`n`n"
        } elseif ($svcStatus.health -eq "attention") {
            $Report += "**🔍 REVIEW**: Some issues detected, schedule maintenance.`n`n"
        } else {
            $Report += "**✅ GOOD**: Service is healthy.`n`n"
        }
    }
    
    $Report += @"

## Maintenance Schedule

### Automated Tasks
- **Security Updates**: Daily at 06:00 UTC
- **Minor Updates**: Weekly on Sundays at 02:00 UTC
- **Vulnerability Scans**: Daily at 05:00 UTC
- **Compatibility Checks**: Weekly on Saturdays at 23:00 UTC

### Manual Tasks
- **Major Updates**: Monthly (manual approval required)
- **Breaking Change Reviews**: As needed
- **Maintenance Reports**: Monthly

## Recommended Actions

"@
    
    $CriticalServices = $Status.services.Keys | Where-Object { $Status.services[$_].health -eq "critical" }
    $WarningServices = $Status.services.Keys | Where-Object { $Status.services[$_].health -eq "warning" }
    
    if ($CriticalServices.Count -gt 0) {
        $Report += "### 🚨 Immediate Actions Required`n"
        foreach ($service in $CriticalServices) {
            $Report += "- **$service**: Address critical vulnerabilities immediately`n"
        }
        $Report += "`n"
    }
    
    if ($WarningServices.Count -gt 0) {
        $Report += "### ⚠️ Actions Needed This Week`n"
        foreach ($service in $WarningServices) {
            $Report += "- **$service**: Schedule maintenance to address warnings`n"
        }
        $Report += "`n"
    }
    
    $Report += @"
### 📅 Upcoming Maintenance
- Next security scan: $(Get-Date -Date (Get-Date).Date.AddDays(1).AddHours(6) -Format "yyyy-MM-dd HH:mm")
- Next minor update check: $(Get-Date -Date (Get-Date -Day 1).Date.AddMonths(1).AddDays(6).AddHours(2) -Format "yyyy-MM-dd HH:mm")
- Next monthly report: $(Get-Date -Date (Get-Date -Day 1).Date.AddMonths(1).AddDays(-1).AddHours(23).AddMinutes(30) -Format "yyyy-MM-dd HH:mm")

## Maintenance Procedures

1. **Daily**: Automated security scans and vulnerability checks
2. **Weekly**: Minor dependency updates and compatibility validation
3. **Monthly**: Comprehensive review and major update planning
4. **As Needed**: Breaking change analysis and manual updates

"@
    
    $Report | Out-File -FilePath $ReportPath -Encoding UTF8
    Write-MaintenanceLog "Maintenance report generated: $ReportPath"
    return $ReportPath
}

function Send-MaintenanceNotification {
    param($Status, $ReportPath)
    
    $CriticalCount = $Status.overall.critical_issues
    $WarningCount = $Status.overall.warnings
    
    $Message = if ($CriticalCount -gt 0) {
        "🚨 CRITICAL: $CriticalCount services have critical dependency issues requiring immediate attention!"
    } elseif ($WarningCount -gt 0) {
        "⚠️ WARNING: $WarningCount services have dependency warnings that need attention."
    } else {
        "✅ All services are healthy. Dependency maintenance is up to date."
    }
    
    Write-MaintenanceLog "Sending maintenance notification: $Message"
    
    # Slack notification
    if ($MaintenanceConfig.notifications.slack_webhook) {
        try {
            $SlackPayload = @{
                text = "Dependency Maintenance Report"
                attachments = @(
                    @{
                        color = if ($CriticalCount -gt 0) { "danger" } elseif ($WarningCount -gt 0) { "warning" } else { "good" }
                        title = "Dependency Maintenance Status"
                        text = $Message
                        fields = @(
                            @{
                                title = "Critical Issues"
                                value = $CriticalCount
                                short = $true
                            }
                            @{
                                title = "Warnings"
                                value = $WarningCount
                                short = $true
                            }
                            @{
                                title = "Report"
                                value = $ReportPath
                                short = $false
                            }
                        )
                        footer = "Dependency Maintenance Scheduler"
                        ts = [int][double]::Parse((Get-Date -UFormat %s))
                    }
                )
            } | ConvertTo-Json -Depth 10
            
            Invoke-RestMethod -Uri $MaintenanceConfig.notifications.slack_webhook -Method Post -Body $SlackPayload -ContentType "application/json"
            Write-MaintenanceLog "Slack notification sent successfully"
        } catch {
            Write-MaintenanceLog "Failed to send Slack notification: $($_.Exception.Message)" "ERROR"
        }
    }
    
    # Email notification (if configured)
    if ($MaintenanceConfig.notifications.email_recipients.Count -gt 0) {
        Write-MaintenanceLog "Email notifications would be sent to: $($MaintenanceConfig.notifications.email_recipients -join ', ')"
        # Email implementation would go here
    }
}

function Start-MaintenanceTask {
    param($TaskType)
    
    Write-MaintenanceLog "Starting maintenance task: $TaskType"
    
    switch ($TaskType) {
        "security_scan" {
            Write-MaintenanceLog "Running security vulnerability scan"
            foreach ($svc in $Services) {
                if (Test-Path "services/$svc/package.json") {
                    & "./scripts/dependency-monitor.ps1" -Service $svc
                }
            }
        }
        "minor_updates" {
            Write-MaintenanceLog "Running minor dependency updates"
            foreach ($svc in $Services) {
                if (Test-Path "services/$svc/package.json") {
                    & "./scripts/dependency-update.ps1" -Service $svc
                }
            }
        }
        "compatibility_check" {
            Write-MaintenanceLog "Running API compatibility checks"
            foreach ($svc in $Services) {
                if (Test-Path "services/$svc/package.json") {
                    & "./scripts/dependency-api-compatibility-validator.ps1" -Service $svc -AllPackages
                }
            }
        }
        "breaking_change_analysis" {
            Write-MaintenanceLog "Running breaking change analysis"
            foreach ($svc in $Services) {
                if (Test-Path "services/$svc/package.json") {
                    & "./scripts/dependency-breaking-change-detector.ps1" -Service $svc -AllPackages
                }
            }
        }
        "maintenance_report" {
            Write-MaintenanceLog "Generating maintenance report"
            $Status = Get-MaintenanceStatus
            $ReportPath = New-MaintenanceReport -Status $Status
            Send-MaintenanceNotification -Status $Status -ReportPath $ReportPath
        }
        default {
            Write-MaintenanceLog "Unknown maintenance task: $TaskType" "ERROR"
        }
    }
}

function Show-MaintenanceSchedule {
    Write-Host "📅 Dependency Maintenance Schedule" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($task in $MaintenanceConfig.schedule.Keys) {
        $config = $MaintenanceConfig.schedule[$task]
        $status = if ($config.enabled) { "✅ Enabled" } else { "❌ Disabled" }
        
        Write-Host "$task" -ForegroundColor Yellow
        Write-Host "  Frequency: $($config.frequency)" -ForegroundColor Gray
        if ($config.day) { Write-Host "  Day: $($config.day)" -ForegroundColor Gray }
        if ($config.time) { Write-Host "  Time: $($config.time) UTC" -ForegroundColor Gray }
        Write-Host "  Status: $status" -ForegroundColor Gray
        Write-Host ""
    }
}

# Main execution
Write-MaintenanceLog "Dependency Maintenance Scheduler started with action: $Action"

switch ($Action.ToLower()) {
    "status" {
        Write-Host "📊 Getting maintenance status..." -ForegroundColor Blue
        $Status = Get-MaintenanceStatus
        
        Write-Host ""
        Write-Host "🏥 Overall Health Status" -ForegroundColor Cyan
        Write-Host "Critical Issues: $($Status.overall.critical_issues)" -ForegroundColor $(if ($Status.overall.critical_issues -gt 0) { 'Red' } else { 'Green' })
        Write-Host "Warnings: $($Status.overall.warnings)" -ForegroundColor $(if ($Status.overall.warnings -gt 0) { 'Yellow' } else { 'Green' })
        Write-Host ""
        
        foreach ($service in $Status.services.Keys) {
            $svcStatus = $Status.services[$service]
            $color = switch ($svcStatus.health) {
                "critical" { "Red" }
                "warning" { "Yellow" }
                "attention" { "Cyan" }
                "healthy" { "Green" }
                default { "Gray" }
            }
            
            Write-Host "$service`: $($svcStatus.health.ToUpper())" -ForegroundColor $color
            Write-Host "  Vulnerabilities: $($svcStatus.vulnerabilities.total) (Critical: $($svcStatus.vulnerabilities.critical))" -ForegroundColor Gray
            Write-Host "  Outdated: $($svcStatus.outdated_packages) packages" -ForegroundColor Gray
            Write-Host "  Last Update: $($svcStatus.last_update ?? 'Never')" -ForegroundColor Gray
            Write-Host ""
        }
    }
    
    "schedule" {
        Show-MaintenanceSchedule
    }
    
    "report" {
        Write-Host "📄 Generating maintenance report..." -ForegroundColor Blue
        $Status = Get-MaintenanceStatus
        $ReportPath = New-MaintenanceReport -Status $Status
        Write-Host "Report generated: $ReportPath" -ForegroundColor Green
        
        if (-not $Force) {
            Send-MaintenanceNotification -Status $Status -ReportPath $ReportPath
        }
    }
    
    "run" {
        if (-not $Service -or $Service -eq "all") {
            Write-Host "❌ Please specify a maintenance task to run" -ForegroundColor Red
            Write-Host "Available tasks: security_scan, minor_updates, compatibility_check, breaking_change_analysis, maintenance_report" -ForegroundColor Yellow
            exit 1
        }
        
        Start-MaintenanceTask -TaskType $Service
    }
    
    "notify" {
        Write-Host "📢 Sending maintenance notifications..." -ForegroundColor Blue
        $Status = Get-MaintenanceStatus
        Send-MaintenanceNotification -Status $Status -ReportPath "Current Status"
    }
    
    default {
        Write-Host "❌ Unknown action: $Action" -ForegroundColor Red
        Write-Host "Available actions: status, schedule, report, run, notify" -ForegroundColor Yellow
        exit 1
    }
}

Write-MaintenanceLog "Dependency Maintenance Scheduler completed"