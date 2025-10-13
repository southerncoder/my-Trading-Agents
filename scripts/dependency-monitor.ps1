# Dependency Monitoring Script
# Monitors dependencies for security vulnerabilities and outdated packages

param(
    [switch]$Continuous,
    [int]$IntervalMinutes = 60,
    [string]$Service = "trading-agents",
    [string]$OutputPath = "logs/dependency-monitor.log"
)

$ErrorActionPreference = "Stop"

$ServicePath = "services/$Service"

# Ensure log directory exists
$LogDir = Split-Path $OutputPath -Parent
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param($Message, $Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Write-Host $LogEntry
    $LogEntry | Out-File -FilePath $OutputPath -Append -Encoding UTF8
}

function Test-Dependencies {
    Write-Log "Starting dependency check for service: $Service"
    
    if (-not (Test-Path "$ServicePath/package.json")) {
        Write-Log "Service not found: $ServicePath" "ERROR"
        return $false
    }
    
    Set-Location $ServicePath
    
    try {
        # Check for security vulnerabilities
        Write-Log "Checking for security vulnerabilities..."
        $AuditResult = npm audit --json 2>$null | ConvertFrom-Json
        
        if ($AuditResult.metadata.vulnerabilities.total -gt 0) {
            $VulnCount = $AuditResult.metadata.vulnerabilities.total
            $HighVulns = $AuditResult.metadata.vulnerabilities.high
            $CriticalVulns = $AuditResult.metadata.vulnerabilities.critical
            
            Write-Log "SECURITY ALERT: Found $VulnCount vulnerabilities (Critical: $CriticalVulns, High: $HighVulns)" "WARN"
            
            # Log details of critical and high vulnerabilities
            if ($AuditResult.vulnerabilities) {
                foreach ($vuln in $AuditResult.vulnerabilities.PSObject.Properties) {
                    $vulnData = $vuln.Value
                    if ($vulnData.severity -in @("critical", "high")) {
                        Write-Log "  - $($vulnData.title): $($vulnData.severity) severity in $($vuln.Name)" "WARN"
                    }
                }
            }
            
            return $false
        } else {
            Write-Log "✅ No security vulnerabilities found"
        }
        
        # Check for outdated packages
        Write-Log "Checking for outdated packages..."
        $OutdatedResult = npm outdated --json 2>$null
        
        if ($OutdatedResult) {
            $OutdatedPackages = $OutdatedResult | ConvertFrom-Json
            $OutdatedCount = ($OutdatedPackages.PSObject.Properties | Measure-Object).Count
            
            Write-Log "Found $OutdatedCount outdated packages:" "INFO"
            
            foreach ($pkg in $OutdatedPackages.PSObject.Properties) {
                $pkgData = $pkg.Value
                Write-Log "  - $($pkg.Name): $($pkgData.current) → $($pkgData.latest)" "INFO"
            }
        } else {
            Write-Log "✅ All packages are up to date"
        }
        
        # Check package integrity
        Write-Log "Verifying package integrity..."
        $IntegrityCheck = npm ls --json 2>$null | ConvertFrom-Json
        
        if ($IntegrityCheck.problems) {
            Write-Log "Package integrity issues found:" "WARN"
            foreach ($problem in $IntegrityCheck.problems) {
                Write-Log "  - $problem" "WARN"
            }
        } else {
            Write-Log "✅ Package integrity verified"
        }
        
        return $true
        
    } catch {
        Write-Log "Error during dependency check: $($_.Exception.Message)" "ERROR"
        return $false
    } finally {
        Set-Location ../..
    }
}

function Send-Alert {
    param($Message)
    
    Write-Log "ALERT: $Message" "ALERT"
    
    # Here you could add integration with notification systems:
    # - Email notifications
    # - Slack webhooks
    # - Teams notifications
    # - PagerDuty alerts
    
    # Example: Write to a separate alert log
    $AlertPath = "logs/dependency-alerts.log"
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$Timestamp] $Message" | Out-File -FilePath $AlertPath -Append -Encoding UTF8
}

function New-DependencyReport {
    $ReportPath = "reports/dependency-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $ReportDir = Split-Path $ReportPath -Parent
    
    if (-not (Test-Path $ReportDir)) {
        New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
    }
    
    Set-Location $ServicePath
    
    try {
        $Report = @{
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            service = $Service
            audit = npm audit --json 2>$null | ConvertFrom-Json
            outdated = npm outdated --json 2>$null | ConvertFrom-Json
            list = npm ls --json 2>$null | ConvertFrom-Json
        }
        
        $Report | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportPath -Encoding UTF8
        Write-Log "Dependency report generated: $ReportPath"
        
    } catch {
        Write-Log "Error generating dependency report: $($_.Exception.Message)" "ERROR"
    } finally {
        Set-Location ../..
    }
}

# Main execution
Write-Log "🔍 Dependency Monitor Started"
Write-Log "Service: $Service"
Write-Log "Continuous: $Continuous"
Write-Log "Interval: $IntervalMinutes minutes"

do {
    $CheckPassed = Test-Dependencies
    
    if (-not $CheckPassed) {
        Send-Alert "Dependency issues detected in $Service service"
    }
    
    # Generate daily report (at midnight or first run)
    $CurrentHour = (Get-Date).Hour
    if ($CurrentHour -eq 0 -or -not (Test-Path "reports/dependency-report-$(Get-Date -Format 'yyyyMMdd')*.json")) {
        New-DependencyReport
    }
    
    if ($Continuous) {
        Write-Log "Waiting $IntervalMinutes minutes until next check..."
        Start-Sleep -Seconds ($IntervalMinutes * 60)
    }
    
} while ($Continuous)

Write-Log "🔍 Dependency Monitor Completed"