# API Compatibility Validation Script
# Validates API compatibility before dependency updates

param(
    [string]$Service = "trading-agents",
    [string]$Package = "",
    [string]$Version = "",
    [switch]$AllPackages,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$ServicePath = "services/$Service"
$TempTestDir = "temp/api-compatibility-tests"

# API compatibility test definitions
$APICompatibilityTests = @{
    "winston" = @{
        testScript = @"
// Winston API Compatibility Test
const winston = require('winston');

// Test basic logger creation
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console()
    ]
});

// Test logging methods
logger.info('Test info message');
logger.error('Test error message');
logger.warn('Test warning message');

// Test legacy API (if still supported)
try {
    logger.log('info', 'Legacy API test');
    console.log('✅ Legacy API compatible');
} catch (error) {
    console.log('⚠️ Legacy API not compatible:', error.message);
}

console.log('✅ Winston API compatibility test passed');
"@
        expectedOutput = @("Test info message", "Test error message", "Winston API compatibility test passed")
        criticalAPIs = @("createLogger", "transports.Console", "format.json")
    }
    
    "express" = @{
        testScript = @"
// Express API Compatibility Test
const express = require('express');

const app = express();

// Test middleware
app.use(express.json());
app.use((req, res, next) => {
    console.log('Middleware test');
    next();
});

// Test routing
app.get('/test', (req, res) => {
    res.json({ message: 'Express API test' });
});

// Test error handling
app.use((err, req, res, next) => {
    console.log('Error handler test');
    res.status(500).json({ error: err.message });
});

console.log('✅ Express API compatibility test passed');
"@
        expectedOutput = @("Express API compatibility test passed")
        criticalAPIs = @("express", "express.json", "app.use", "app.get")
    }
    
    "@getzep/zep-js" = @{
        testScript = @"
// Zep.js API Compatibility Test
const { ZepClient } = require('@getzep/zep-js');

// Test client creation (without actual connection)
try {
    const client = new ZepClient({
        apiKey: 'test-key',
        baseURL: 'http://localhost:8000'
    });
    
    console.log('✅ ZepClient creation successful');
    
    // Test method existence
    if (typeof client.memory === 'object') {
        console.log('✅ Memory API available');
    }
    
    if (typeof client.user === 'object') {
        console.log('✅ User API available');
    }
    
    console.log('✅ Zep.js API compatibility test passed');
} catch (error) {
    console.log('❌ Zep.js API compatibility failed:', error.message);
    process.exit(1);
}
"@
        expectedOutput = @("ZepClient creation successful", "Zep.js API compatibility test passed")
        criticalAPIs = @("ZepClient", "memory", "user")
    }
    
    "langchain" = @{
        testScript = @"
// LangChain API Compatibility Test
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage } = require('langchain/schema');

try {
    // Test model creation (without API key)
    const model = new ChatOpenAI({
        openAIApiKey: 'test-key',
        modelName: 'gpt-3.5-turbo'
    });
    
    console.log('✅ ChatOpenAI creation successful');
    
    // Test message creation
    const message = new HumanMessage('Test message');
    console.log('✅ HumanMessage creation successful');
    
    console.log('✅ LangChain API compatibility test passed');
} catch (error) {
    console.log('❌ LangChain API compatibility failed:', error.message);
    process.exit(1);
}
"@
        expectedOutput = @("ChatOpenAI creation successful", "LangChain API compatibility test passed")
        criticalAPIs = @("ChatOpenAI", "HumanMessage")
    }
    
    "@langchain/langgraph" = @{
        testScript = @"
// LangGraph API Compatibility Test
const { StateGraph, END } = require('@langchain/langgraph');

try {
    // Test graph creation
    const workflow = new StateGraph({
        channels: {
            messages: {
                value: (x, y) => x.concat(y),
                default: () => []
            }
        }
    });
    
    console.log('✅ StateGraph creation successful');
    
    // Test node addition
    workflow.addNode('test_node', async (state) => {
        return { messages: ['test'] };
    });
    
    console.log('✅ Node addition successful');
    
    console.log('✅ LangGraph API compatibility test passed');
} catch (error) {
    console.log('❌ LangGraph API compatibility failed:', error.message);
    process.exit(1);
}
"@
        expectedOutput = @("StateGraph creation successful", "LangGraph API compatibility test passed")
        criticalAPIs = @("StateGraph", "addNode", "END")
    }
}

function New-TempPackageJson {
    param($PackageName, $Version)
    
    $TempPackageJson = @{
        name = "api-compatibility-test"
        version = "1.0.0"
        type = "commonjs"
        dependencies = @{}
    }
    
    $TempPackageJson.dependencies[$PackageName] = $Version
    
    # Add peer dependencies if needed
    switch ($PackageName) {
        "winston" { }
        "express" { }
        "@getzep/zep-js" { }
        "langchain" {
            $TempPackageJson.dependencies["@langchain/openai"] = "latest"
        }
        "@langchain/langgraph" {
            $TempPackageJson.dependencies["langchain"] = "latest"
        }
    }
    
    return $TempPackageJson
}

function Test-APICompatibility {
    param($PackageName, $Version)
    
    Write-Host "🧪 Testing API compatibility: $PackageName@$Version" -ForegroundColor Blue
    
    if (-not $APICompatibilityTests.ContainsKey($PackageName)) {
        Write-Host "⚠️  No API compatibility test available for $PackageName" -ForegroundColor Yellow
        return @{
            compatible = $true
            severity = "unknown"
            errors = @()
            warnings = @()
        }
    }
    
    # Create temporary test environment
    if (Test-Path $TempTestDir) {
        Remove-Item -Path $TempTestDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $TempTestDir -Force | Out-Null
    
    try {
        Set-Location $TempTestDir
        
        # Create package.json
        $PackageJson = New-TempPackageJson -PackageName $PackageName -Version $Version
        $PackageJson | ConvertTo-Json -Depth 10 | Out-File -FilePath "package.json" -Encoding UTF8
        
        # Install the package
        Write-Host "  📦 Installing $PackageName@$Version..." -ForegroundColor Gray
        $InstallOutput = npm install 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install $PackageName@$Version`: $InstallOutput"
        }
        
        # Create test script
        $TestData = $APICompatibilityTests[$PackageName]
        $TestData.testScript | Out-File -FilePath "test.js" -Encoding UTF8
        
        # Run compatibility test
        Write-Host "  🧪 Running compatibility test..." -ForegroundColor Gray
        $TestOutput = node test.js 2>&1
        $TestExitCode = $LASTEXITCODE
        
        # Analyze results
        $Errors = @()
        $Warnings = @()
        $Compatible = $true
        
        if ($TestExitCode -ne 0) {
            $Compatible = $false
            $Errors += "Test script failed with exit code $TestExitCode"
        }
        
        # Check for expected output
        foreach ($expectedLine in $TestData.expectedOutput) {
            if ($TestOutput -notmatch [regex]::Escape($expectedLine)) {
                $Warnings += "Expected output not found: $expectedLine"
            }
        }
        
        # Check for error patterns
        $ErrorPatterns = @(
            "TypeError",
            "ReferenceError", 
            "is not a function",
            "Cannot read property",
            "Cannot read properties",
            "Module not found"
        )
        
        foreach ($pattern in $ErrorPatterns) {
            if ($TestOutput -match $pattern) {
                $Compatible = $false
                $Errors += "API error detected: $pattern"
            }
        }
        
        # Check for deprecation warnings
        if ($TestOutput -match "deprecated|deprecation") {
            $Warnings += "Deprecation warnings detected"
        }
        
        $Severity = if (-not $Compatible) { "high" } elseif ($Warnings.Count -gt 0) { "medium" } else { "low" }
        
        Write-Host "  $(if ($Compatible) { '✅' } else { '❌' }) Compatibility: $(if ($Compatible) { 'PASS' } else { 'FAIL' })" -ForegroundColor $(if ($Compatible) { 'Green' } else { 'Red' })
        
        return @{
            compatible = $Compatible
            severity = $Severity
            errors = $Errors
            warnings = $Warnings
            output = $TestOutput
        }
        
    } catch {
        Write-Host "  ❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            compatible = $false
            severity = "high"
            errors = @($_.Exception.Message)
            warnings = @()
            output = ""
        }
    } finally {
        Set-Location ../../..
        if (Test-Path $TempTestDir) {
            Remove-Item -Path $TempTestDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function New-CompatibilityReport {
    param($Results)
    
    $ReportPath = "reports/api-compatibility-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"
    $ReportDir = Split-Path $ReportPath -Parent
    
    if (-not (Test-Path $ReportDir)) {
        New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
    }
    
    $Report = @"
# API Compatibility Validation Report

**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Service**: $Service

## Summary

"@
    
    $CompatibleCount = ($Results | Where-Object { $_.compatible }).Count
    $IncompatibleCount = ($Results | Where-Object { -not $_.compatible }).Count
    $WarningCount = ($Results | Where-Object { $_.warnings.Count -gt 0 }).Count
    
    $Report += @"

- **Compatible**: $CompatibleCount packages
- **Incompatible**: $IncompatibleCount packages
- **With Warnings**: $WarningCount packages

"@
    
    foreach ($result in $Results) {
        $status = if ($result.compatible) { "✅ COMPATIBLE" } else { "❌ INCOMPATIBLE" }
        $Report += @"

## $($result.package)@$($result.version)

**Status**: $status
**Severity**: $($result.severity.ToUpper())

"@
        
        if ($result.errors.Count -gt 0) {
            $Report += @"

### Errors
$(($result.errors | ForEach-Object { "- $_" }) -join "`n")

"@
        }
        
        if ($result.warnings.Count -gt 0) {
            $Report += @"

### Warnings
$(($result.warnings | ForEach-Object { "- $_" }) -join "`n")

"@
        }
        
        if ($result.output) {
            $Report += @"

### Test Output
``````
$($result.output)
``````

"@
        }
    }
    
    $Report += @"

## Recommendations

"@
    
    $IncompatiblePackages = $Results | Where-Object { -not $_.compatible }
    if ($IncompatiblePackages.Count -gt 0) {
        $Report += @"

### ❌ Incompatible Packages
These packages have API compatibility issues and should not be updated without code changes:

$(($IncompatiblePackages | ForEach-Object { "- **$($_.package)@$($_.version)**: $($_.errors -join ', ')" }) -join "`n")

"@
    }
    
    $WarningPackages = $Results | Where-Object { $_.compatible -and $_.warnings.Count -gt 0 }
    if ($WarningPackages.Count -gt 0) {
        $Report += @"

### ⚠️ Packages with Warnings
These packages are compatible but have warnings that should be reviewed:

$(($WarningPackages | ForEach-Object { "- **$($_.package)@$($_.version)**: $($_.warnings -join ', ')" }) -join "`n")

"@
    }
    
    $Report | Out-File -FilePath $ReportPath -Encoding UTF8
    Write-Host "📄 API compatibility report generated: $ReportPath" -ForegroundColor Green
    return $ReportPath
}

# Main execution
Write-Host "🧪 API Compatibility Validator" -ForegroundColor Cyan

if (-not (Test-Path "$ServicePath/package.json")) {
    Write-Host "❌ Service not found: $ServicePath" -ForegroundColor Red
    exit 1
}

$Results = @()

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - Showing available compatibility tests" -ForegroundColor Yellow
    Write-Host "Available API compatibility tests:" -ForegroundColor Blue
    $APICompatibilityTests.Keys | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    exit 0
}

if ($AllPackages) {
    Write-Host "📦 Testing API compatibility for all outdated packages..." -ForegroundColor Blue
    
    Set-Location $ServicePath
    $OutdatedResult = npm outdated --json 2>$null
    Set-Location ../..
    
    if ($OutdatedResult) {
        $OutdatedPackages = $OutdatedResult | ConvertFrom-Json
        
        foreach ($pkg in $OutdatedPackages.PSObject.Properties) {
            $packageName = $pkg.Name
            $packageData = $pkg.Value
            $latestVersion = $packageData.latest
            
            if ($APICompatibilityTests.ContainsKey($packageName)) {
                $result = Test-APICompatibility -PackageName $packageName -Version $latestVersion
                $result.package = $packageName
                $result.version = $latestVersion
                $Results += $result
            } else {
                Write-Host "⚠️  No API compatibility test for $packageName" -ForegroundColor Yellow
            }
        }
    }
} elseif ($Package -and $Version) {
    Write-Host "📦 Testing specific package: $Package@$Version" -ForegroundColor Blue
    
    $result = Test-APICompatibility -PackageName $Package -Version $Version
    $result.package = $Package
    $result.version = $Version
    $Results += $result
} else {
    Write-Host "❌ Please specify either -AllPackages or provide -Package and -Version" -ForegroundColor Red
    exit 1
}

# Generate report and determine exit code
if ($Results.Count -gt 0) {
    $ReportPath = New-CompatibilityReport -Results $Results
    
    $IncompatiblePackages = $Results | Where-Object { -not $_.compatible }
    if ($IncompatiblePackages.Count -gt 0) {
        Write-Host "❌ API COMPATIBILITY FAILED: $($IncompatiblePackages.Count) packages are incompatible" -ForegroundColor Red
        Write-Host "Incompatible packages:" -ForegroundColor Red
        $IncompatiblePackages | ForEach-Object { Write-Host "  - $($_.package)@$($_.version)" -ForegroundColor Red }
        exit 1
    } else {
        Write-Host "✅ All packages are API compatible" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  No packages tested" -ForegroundColor Yellow
}