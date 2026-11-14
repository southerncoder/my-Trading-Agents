# Breaking Change Detection Script
# Detects potential breaking changes in major version updates

param(
    [string]$Service = "trading-agents",
    [string]$Package = "",
    [string]$FromVersion = "",
    [string]$ToVersion = "",
    [switch]$AllPackages
)

$ErrorActionPreference = "Stop"

$ServicePath = "services/$Service"
$BreakingChangesDB = @{
    "winston" = @{
        "3.0.0" = @{
            changes = @(
                "Logger.log() signature changed - now requires level as first parameter",
                "Transport configuration format changed",
                "Default log format changed to JSON",
                "Some transport options renamed"
            )
            migration = @(
                "Update logger.log(message) to logger.log('info', message)",
                "Review transport configurations",
                "Update log format expectations in tests"
            )
            testFiles = @("tests/**/*log*.test.ts", "src/**/*logger*.ts")
        }
        "3.18.0" = @{
            changes = @(
                "New logging API methods introduced",
                "Deprecated methods may show warnings",
                "Performance improvements may affect timing"
            )
            migration = @(
                "Review deprecated method usage",
                "Update to new API methods where applicable"
            )
            testFiles = @("tests/**/*log*.test.ts", "src/**/*logger*.ts")
        }
    }
    "express" = @{
        "5.0.0" = @{
            changes = @(
                "Middleware signature changes",
                "Router behavior changes",
                "Error handling changes",
                "Some deprecated methods removed"
            )
            migration = @(
                "Update middleware to use new signature",
                "Review error handling patterns",
                "Update router configurations"
            )
            testFiles = @("tests/**/*express*.test.ts", "src/**/*server*.ts", "src/**/*middleware*.ts")
        }
    }
    "@getzep/zep-js" = @{
        "2.0.0" = @{
            changes = @(
                "Client initialization API changed",
                "Memory API methods renamed",
                "Session management changes",
                "Authentication flow updated"
            )
            migration = @(
                "Update ZepClient initialization",
                "Migrate memory API calls to new methods",
                "Update session management code",
                "Review authentication setup"
            )
            testFiles = @("tests/**/*zep*.test.ts", "src/**/*memory*.ts", "src/**/*zep*.ts")
        }
    }
    "langchain" = @{
        "0.3.0" = @{
            changes = @(
                "Provider abstraction changes",
                "Chain interface updates",
                "Memory system changes"
            )
            migration = @(
                "Update provider configurations",
                "Review chain implementations",
                "Update memory integrations"
            )
            testFiles = @("tests/**/*langchain*.test.ts", "src/**/*chain*.ts", "src/**/*llm*.ts")
        }
    }
    "@langchain/langgraph" = @{
        "0.6.0" = @{
            changes = @(
                "Graph definition API changes",
                "Node execution model updates",
                "State management changes"
            )
            migration = @(
                "Update graph definitions",
                "Review node implementations",
                "Update state management"
            )
            testFiles = @("tests/**/*graph*.test.ts", "src/**/*workflow*.ts", "src/**/*agent*.ts")
        }
    }
}

function Get-PackageVersion {
    param($PackageName)
    
    Set-Location $ServicePath
    try {
        $PackageJson = Get-Content "package.json" | ConvertFrom-Json
        $CurrentVersion = $PackageJson.dependencies.$PackageName
        if (-not $CurrentVersion) {
            $CurrentVersion = $PackageJson.devDependencies.$PackageName
        }
        return $CurrentVersion -replace '[^0-9.]', ''
    } finally {
        Set-Location ../..
    }
}

function Compare-Versions {
    param($Version1, $Version2)
    
    $v1Parts = $Version1.Split('.') | ForEach-Object { [int]$_ }
    $v2Parts = $Version2.Split('.') | ForEach-Object { [int]$_ }
    
    for ($i = 0; $i -lt [Math]::Max($v1Parts.Length, $v2Parts.Length); $i++) {
        $v1Part = if ($i -lt $v1Parts.Length) { $v1Parts[$i] } else { 0 }
        $v2Part = if ($i -lt $v2Parts.Length) { $v2Parts[$i] } else { 0 }
        
        if ($v1Part -lt $v2Part) { return -1 }
        if ($v1Part -gt $v2Part) { return 1 }
    }
    return 0
}

function Test-BreakingChange {
    param($PackageName, $FromVer, $ToVer)
    
    Write-Host "🔍 Checking for breaking changes: $PackageName ($FromVer → $ToVer)" -ForegroundColor Blue
    
    if (-not $BreakingChangesDB.ContainsKey($PackageName)) {
        Write-Host "⚠️  No breaking change data available for $PackageName" -ForegroundColor Yellow
        return @{
            hasBreakingChanges = $false
            severity = "unknown"
            changes = @()
            migration = @()
            testFiles = @()
        }
    }
    
    $packageData = $BreakingChangesDB[$PackageName]
    $breakingChanges = @()
    $migrations = @()
    $testFiles = @()
    
    foreach ($version in $packageData.Keys) {
        if ((Compare-Versions $FromVer $version) -lt 0 -and (Compare-Versions $version $ToVer) -le 0) {
            $versionData = $packageData[$version]
            $breakingChanges += $versionData.changes
            $migrations += $versionData.migration
            $testFiles += $versionData.testFiles
        }
    }
    
    $severity = if ($breakingChanges.Count -gt 0) {
        $majorVersionChange = (Compare-Versions $FromVer.Split('.')[0] $ToVer.Split('.')[0]) -ne 0
        if ($majorVersionChange) { "high" } else { "medium" }
    } else { "low" }
    
    return @{
        hasBreakingChanges = $breakingChanges.Count -gt 0
        severity = $severity
        changes = $breakingChanges
        migration = $migrations
        testFiles = $testFiles | Select-Object -Unique
    }
}

function New-BreakingChangeReport {
    param($Results)
    
    $ReportPath = "reports/breaking-changes-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"
    $ReportDir = Split-Path $ReportPath -Parent
    
    if (-not (Test-Path $ReportDir)) {
        New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
    }
    
    $Report = @"
# Breaking Changes Analysis Report

**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Service**: $Service

## Summary

"@
    
    $HighRiskCount = ($Results | Where-Object { $_.severity -eq "high" }).Count
    $MediumRiskCount = ($Results | Where-Object { $_.severity -eq "medium" }).Count
    $LowRiskCount = ($Results | Where-Object { $_.severity -eq "low" }).Count
    
    $Report += @"

- **High Risk**: $HighRiskCount packages
- **Medium Risk**: $MediumRiskCount packages  
- **Low Risk**: $LowRiskCount packages

"@
    
    foreach ($result in $Results) {
        if ($result.hasBreakingChanges) {
            $Report += @"

## $($result.package) ($($result.fromVersion) → $($result.toVersion))

**Risk Level**: $($result.severity.ToUpper())

### Breaking Changes
$(($result.changes | ForEach-Object { "- $_" }) -join "`n")

### Migration Steps
$(($result.migration | ForEach-Object { "- $_" }) -join "`n")

### Files to Review
$(($result.testFiles | ForEach-Object { "- $_" }) -join "`n")

"@
        }
    }
    
    $Report += @"

## Recommended Actions

1. **High Risk Packages**: Manual review and testing required before update
2. **Medium Risk Packages**: Automated testing with manual verification
3. **Low Risk Packages**: Can be updated with standard testing

## Testing Strategy

1. Run existing test suite
2. Focus testing on identified files
3. Perform integration testing
4. Manual verification of critical paths

"@
    
    $Report | Out-File -FilePath $ReportPath -Encoding UTF8
    Write-Host "📄 Breaking changes report generated: $ReportPath" -ForegroundColor Green
    return $ReportPath
}

# Main execution
Write-Host "🔍 Breaking Change Detector" -ForegroundColor Cyan

if (-not (Test-Path "$ServicePath/package.json")) {
    Write-Host "❌ Service not found: $ServicePath" -ForegroundColor Red
    exit 1
}

$Results = @()

if ($AllPackages) {
    Write-Host "📦 Analyzing all packages for breaking changes..." -ForegroundColor Blue
    
    Set-Location $ServicePath
    $OutdatedResult = npm outdated --json 2>$null
    Set-Location ../..
    
    if ($OutdatedResult) {
        $OutdatedPackages = $OutdatedResult | ConvertFrom-Json
        
        foreach ($pkg in $OutdatedPackages.PSObject.Properties) {
            $packageName = $pkg.Name
            $packageData = $pkg.Value
            $currentVersion = $packageData.current -replace '[^0-9.]', ''
            $latestVersion = $packageData.latest -replace '[^0-9.]', ''
            
            $analysis = Test-BreakingChange -PackageName $packageName -FromVer $currentVersion -ToVer $latestVersion
            $analysis.package = $packageName
            $analysis.fromVersion = $currentVersion
            $analysis.toVersion = $latestVersion
            
            $Results += $analysis
            
            if ($analysis.hasBreakingChanges) {
                Write-Host "⚠️  Breaking changes detected in $packageName" -ForegroundColor Yellow
            } else {
                Write-Host "✅ No breaking changes detected in $packageName" -ForegroundColor Green
            }
        }
    }
} elseif ($Package -and $FromVersion -and $ToVersion) {
    Write-Host "📦 Analyzing specific package: $Package" -ForegroundColor Blue
    
    $analysis = Test-BreakingChange -PackageName $Package -FromVer $FromVersion -ToVer $ToVersion
    $analysis.package = $Package
    $analysis.fromVersion = $FromVersion
    $analysis.toVersion = $ToVersion
    
    $Results += $analysis
    
    if ($analysis.hasBreakingChanges) {
        Write-Host "⚠️  Breaking changes detected!" -ForegroundColor Yellow
        Write-Host "Changes:" -ForegroundColor Yellow
        $analysis.changes | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    } else {
        Write-Host "✅ No breaking changes detected" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Please specify either -AllPackages or provide -Package, -FromVersion, and -ToVersion" -ForegroundColor Red
    exit 1
}

# Generate report
if ($Results.Count -gt 0) {
    $ReportPath = New-BreakingChangeReport -Results $Results
    
    $HighRiskPackages = $Results | Where-Object { $_.severity -eq "high" -and $_.hasBreakingChanges }
    if ($HighRiskPackages.Count -gt 0) {
        Write-Host "🚨 HIGH RISK: $($HighRiskPackages.Count) packages have high-risk breaking changes" -ForegroundColor Red
        Write-Host "Manual review required before updating these packages:" -ForegroundColor Red
        $HighRiskPackages | ForEach-Object { Write-Host "  - $($_.package)" -ForegroundColor Red }
        exit 1
    } else {
        Write-Host "✅ Breaking change analysis completed" -ForegroundColor Green
    }
}