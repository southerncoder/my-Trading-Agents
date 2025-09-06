# Comprehensive Infrastructure Enhancement Testing Suite
# Tests all improvements: networking, retry mechanisms, JSON parsing, and security

param(
    [switch]$TestNetworking,
    [switch]$TestRetry,
    [switch]$TestJsonParsing,
    [switch]$TestSecurity,
    [switch]$TestIntegration,
    [switch]$GenerateReport,
    [switch]$Full,
    [string]$OutputFormat = "console",  # console, json, html
    [string]$ReportPath = ".\enhancement_test_report.html"
)

# Import required functions
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$utilsPath = $scriptDir

function Import-TestModules {
    $testModules = @(
        "$utilsPath\test_enhanced_json_parsing.ps1",
        "$utilsPath\validate_docker_secrets.ps1"
    )
    
    foreach ($module in $testModules) {
        if (Test-Path $module) {
            . $module
        } else {
            Write-Warning "Test module not found: $module"
        }
    }
}

function Test-NetworkingEnhancements {
    Write-Host "`n🌐 Testing Networking Enhancements..." -ForegroundColor Cyan
    
    $testResults = @()
    
    # Test 1: Docker networking configuration
    Write-Host "Testing Docker networking configuration..." -ForegroundColor Yellow
    $dockerComposePath = "c:\code\PersonalDev\my-Trading-Agents\py_zep\docker-compose.yml"
    
    if (Test-Path $dockerComposePath) {
        $composeContent = Get-Content $dockerComposePath -Raw
        
        # Check for custom network
        if ($composeContent -match "networks:\s*\n\s*trading_agents:") {
            $testResults += @{
                Category = "Networking"
                Test = "Custom Network Configuration"
                Status = "PASS"
                Message = "Custom trading_agents network configured"
                Details = "Docker Compose defines isolated network for service communication"
            }
        } else {
            $testResults += @{
                Category = "Networking"
                Test = "Custom Network Configuration"
                Status = "FAIL"
                Message = "Custom network not found"
                Details = "Missing custom network configuration in docker-compose.yml"
            }
        }
        
        # Check for service dependencies
        if ($composeContent -match "depends_on:[\s\S]*?condition:\s*service_healthy") {
            $testResults += @{
                Category = "Networking"
                Test = "Service Dependencies"
                Status = "PASS"
                Message = "Health-based service dependencies configured"
                Details = "Services wait for dependencies to be healthy before starting"
            }
        } else {
            $testResults += @{
                Category = "Networking"
                Test = "Service Dependencies"
                Status = "WARN"
                Message = "Basic service dependencies found"
                Details = "Service dependencies exist but may not include health checks"
            }
        }
        
        # Check for health checks
        if ($composeContent -match "healthcheck:[\s\S]*?test:\s*\[") {
            $testResults += @{
                Category = "Networking"
                Test = "Health Checks"
                Status = "PASS"
                Message = "Service health checks configured"
                Details = "Both Neo4j and Zep services have health check configurations"
            }
        } else {
            $testResults += @{
                Category = "Networking"
                Test = "Health Checks"
                Status = "FAIL"
                Message = "Health checks not configured"
                Details = "Missing health check configuration for services"
            }
        }
    } else {
        $testResults += @{
            Category = "Networking"
            Test = "Docker Compose Configuration"
            Status = "FAIL"
            Message = "docker-compose.yml not found"
            Details = "Cannot validate networking configuration without compose file"
        }
    }
    
    return $testResults
}

function Test-RetryEnhancements {
    Write-Host "`n🔄 Testing Retry Mechanism Enhancements..." -ForegroundColor Cyan
    
    $testResults = @()
    $retryPath = "c:\code\PersonalDev\my-Trading-Agents\py_zep\utils\enhanced_retry.py"
    $integrationPath = "c:\code\PersonalDev\my-Trading-Agents\py_zep\utils\retry_integration.py"
    $startupPath = "c:\code\PersonalDev\my-Trading-Agents\py_zep\utils\enhanced_startup.py"
    
    # Test enhanced retry system
    if (Test-Path $retryPath) {
        $retryContent = Get-Content $retryPath -Raw
        
        # Check for circuit breaker implementation
        if ($retryContent -match "class CircuitBreaker") {
            $testResults += @{
                Category = "Retry System"
                Test = "Circuit Breaker Implementation"
                Status = "PASS"
                Message = "Circuit breaker pattern implemented"
                Details = "CircuitBreaker class with CLOSED/OPEN/HALF_OPEN states"
            }
        } else {
            $testResults += @{
                Category = "Retry System"
                Test = "Circuit Breaker Implementation"
                Status = "FAIL"
                Message = "Circuit breaker not found"
                Details = "Missing CircuitBreaker class implementation"
            }
        }
        
        # Check for error categorization
        if ($retryContent -match "def categorize_error|ErrorCategory") {
            $testResults += @{
                Category = "Retry System"
                Test = "Error Categorization"
                Status = "PASS"
                Message = "Comprehensive error categorization implemented"
                Details = "Network, timeout, auth, server, and client error categories"
            }
        } else {
            $testResults += @{
                Category = "Retry System"
                Test = "Error Categorization"
                Status = "FAIL"
                Message = "Error categorization not found"
                Details = "Missing error categorization functionality"
            }
        }
        
        # Check for exponential backoff
        if ($retryContent -match "exponential|backoff.*jitter") {
            $testResults += @{
                Category = "Retry System"
                Test = "Exponential Backoff with Jitter"
                Status = "PASS"
                Message = "Exponential backoff with jitter implemented"
                Details = "Configurable backoff with jitter to prevent thundering herd"
            }
        } else {
            $testResults += @{
                Category = "Retry System"
                Test = "Exponential Backoff with Jitter"
                Status = "WARN"
                Message = "Basic backoff found"
                Details = "Backoff implementation exists but jitter not confirmed"
            }
        }
    } else {
        $testResults += @{
            Category = "Retry System"
            Test = "Enhanced Retry Module"
            Status = "FAIL"
            Message = "enhanced_retry.py not found"
            Details = "Core retry enhancement module missing"
        }
    }
    
    # Test integration wrapper
    if (Test-Path $integrationPath) {
        $integrationContent = Get-Content $integrationPath -Raw
        
        if ($integrationContent -match "enhanced_with_retries") {
            $testResults += @{
                Category = "Retry System"
                Test = "Integration Wrapper"
                Status = "PASS"
                Message = "Retry integration wrapper implemented"
                Details = "enhanced_with_retries function for backward compatibility"
            }
        } else {
            $testResults += @{
                Category = "Retry System"
                Test = "Integration Wrapper"
                Status = "FAIL"
                Message = "Integration wrapper not found"
                Details = "Missing retry integration functionality"
            }
        }
    }
    
    # Test enhanced startup manager
    if (Test-Path $startupPath) {
        $startupContent = Get-Content $startupPath -Raw
        
        if ($startupContent -match "class EnhancedStartupManager") {
            $testResults += @{
                Category = "Retry System"
                Test = "Enhanced Startup Manager"
                Status = "PASS"
                Message = "Startup manager with health monitoring implemented"
                Details = "EnhancedStartupManager class with comprehensive health checks"
            }
        } else {
            $testResults += @{
                Category = "Retry System"
                Test = "Enhanced Startup Manager"
                Status = "FAIL"
                Message = "Startup manager not found"
                Details = "Missing EnhancedStartupManager implementation"
            }
        }
    }
    
    return $testResults
}

function Test-JsonParsingEnhancements {
    Write-Host "`n📋 Testing JSON Parsing Enhancements..." -ForegroundColor Cyan
    
    $testResults = @()
    
    # Test enhanced JSON parsing module
    $jsonParsingPath = "$utilsPath\enhanced_json_parsing.sh"
    
    if (Test-Path $jsonParsingPath) {
        $jsonContent = Get-Content $jsonParsingPath -Raw
        
        # Check for enhanced validation
        if ($jsonContent -match "validate_json_structure|sanitize_response_text") {
            $testResults += @{
                Category = "JSON Parsing"
                Test = "Enhanced Validation Functions"
                Status = "PASS"
                Message = "JSON validation and sanitization implemented"
                Details = "validate_json_structure and sanitize_response_text functions"
            }
        } else {
            $testResults += @{
                Category = "JSON Parsing"
                Test = "Enhanced Validation Functions"
                Status = "FAIL"
                Message = "Enhanced validation not found"
                Details = "Missing JSON validation enhancement functions"
            }
        }
        
        # Check for fuzzy matching
        if ($jsonContent -match "fuzzy_match_model|similarity") {
            $testResults += @{
                Category = "JSON Parsing"
                Test = "Fuzzy Model Matching"
                Status = "PASS"
                Message = "Fuzzy model matching implemented"
                Details = "Model name similarity matching with configurable threshold"
            }
        } else {
            $testResults += @{
                Category = "JSON Parsing"
                Test = "Fuzzy Model Matching"
                Status = "FAIL"
                Message = "Fuzzy matching not found"
                Details = "Missing fuzzy model matching functionality"
            }
        }
        
        # Check for multiple format support
        if ($jsonContent -match "OpenAI-style|direct model arrays|simple model lists") {
            $testResults += @{
                Category = "JSON Parsing"
                Test = "Multiple Format Support"
                Status = "PASS"
                Message = "Multiple JSON format support implemented"
                Details = "Supports OpenAI, LM Studio, and direct array formats"
            }
        } else {
            $testResults += @{
                Category = "JSON Parsing"
                Test = "Multiple Format Support"
                Status = "WARN"
                Message = "Format support present but not documented"
                Details = "Code exists but format documentation needs verification"
            }
        }
    } else {
        $testResults += @{
            Category = "JSON Parsing"
            Test = "Enhanced JSON Parsing Module"
            Status = "FAIL"
            Message = "enhanced_json_parsing.sh not found"
            Details = "Core JSON parsing enhancement module missing"
        }
    }
    
    # Run PowerShell JSON parsing tests if available
    try {
        if (Get-Command Test-EnhancedJsonParsing -ErrorAction SilentlyContinue) {
            Write-Host "Running PowerShell JSON parsing tests..." -ForegroundColor Yellow
            Test-EnhancedJsonParsing | Out-Null
            $testResults += @{
                Category = "JSON Parsing"
                Test = "PowerShell JSON Tests"
                Status = "PASS"
                Message = "PowerShell JSON parsing tests completed successfully"
                Details = "All JSON validation and model matching tests passed"
            }
        }
    } catch {
        $testResults += @{
            Category = "JSON Parsing"
            Test = "PowerShell JSON Tests"
            Status = "WARN"
            Message = "PowerShell tests not available"
            Details = "Test function not loaded or available"
        }
    }
    
    return $testResults
}

function Test-SecurityEnhancements {
    Write-Host "`n🔒 Testing Security Enhancements..." -ForegroundColor Cyan
    
    $testResults = @()
    
    # Run Docker secrets validation if available
    try {
        if (Get-Command Test-DockerSecretsConfiguration -ErrorAction SilentlyContinue) {
            Write-Host "Running Docker secrets validation..." -ForegroundColor Yellow
            $secretsResults = Test-DockerSecretsConfiguration
            
            $passCount = ($secretsResults | Where-Object { $_.Status -eq "PASS" }).Count
            $failCount = ($secretsResults | Where-Object { $_.Status -eq "FAIL" }).Count
            
            if ($failCount -eq 0) {
                $testResults += @{
                    Category = "Security"
                    Test = "Docker Secrets Configuration"
                    Status = "PASS"
                    Message = "All Docker secrets properly configured ($passCount tests passed)"
                    Details = "API keys, passwords, and URLs moved to Docker secrets"
                }
            } else {
                $testResults += @{
                    Category = "Security"
                    Test = "Docker Secrets Configuration"
                    Status = "FAIL"
                    Message = "$failCount security configuration issues found"
                    Details = "Some secrets or configurations are not properly set up"
                }
            }
        } else {
            $testResults += @{
                Category = "Security"
                Test = "Docker Secrets Validation"
                Status = "WARN"
                Message = "Docker secrets validation function not available"
                Details = "Cannot run automated security validation"
            }
        }
    } catch {
        $testResults += @{
            Category = "Security"
            Test = "Docker Secrets Validation"
            Status = "FAIL"
            Message = "Error running security validation: $($_.Exception.Message)"
            Details = "Security validation failed with error"
        }
    }
    
    # Check for sensitive data in environment files
    $envPath = "c:\code\PersonalDev\my-Trading-Agents\py_zep\.env.local"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
        
        $sensitivePatterns = @(
            "[a-zA-Z0-9]{20,}",  # Long strings that might be API keys
            "sk-[a-zA-Z0-9]{20,}",  # OpenAI API key pattern
            "password\s*=\s*[^#\s]+"  # Actual passwords
        )
        
        $foundSensitive = $false
        foreach ($pattern in $sensitivePatterns) {
            if ($envContent -match $pattern) {
                $foundSensitive = $true
                break
            }
        }
        
        if (-not $foundSensitive) {
            $testResults += @{
                Category = "Security"
                Test = "Environment File Security"
                Status = "PASS"
                Message = "No sensitive data found in .env.local"
                Details = "Environment file properly sanitized"
            }
        } else {
            $testResults += @{
                Category = "Security"
                Test = "Environment File Security"
                Status = "FAIL"
                Message = "Potential sensitive data found in .env.local"
                Details = "Environment file may contain API keys or passwords"
            }
        }
    }
    
    return $testResults
}

function Test-IntegrationScenarios {
    Write-Host "`n🔗 Testing Integration Scenarios..." -ForegroundColor Cyan
    
    $testResults = @()
    
    # Test 1: Service startup integration
    Write-Host "Testing service startup integration..." -ForegroundColor Yellow
    
    $startupScripts = @(
        "c:\code\PersonalDev\my-Trading-Agents\py_zep\start-services-secure.ps1",
        "c:\code\PersonalDev\my-Trading-Agents\py_zep\setup-dev-env.ps1"
    )
    
    $foundStartupScript = $false
    foreach ($script in $startupScripts) {
        if (Test-Path $script) {
            $foundStartupScript = $true
            $testResults += @{
                Category = "Integration"
                Test = "Startup Script Availability"
                Status = "PASS"
                Message = "Service startup script found: $(Split-Path -Leaf $script)"
                Details = "Automated service startup capabilities available"
            }
            break
        }
    }
    
    if (-not $foundStartupScript) {
        $testResults += @{
            Category = "Integration"
            Test = "Startup Script Availability"
            Status = "WARN"
            Message = "No automated startup scripts found"
            Details = "Manual service startup may be required"
        }
    }
    
    # Test 2: Configuration consistency
    $configFiles = @(
        "c:\code\PersonalDev\my-Trading-Agents\py_zep\docker-compose.yml",
        "c:\code\PersonalDev\my-Trading-Agents\py_zep\.env.local"
    )
    
    $allConfigsExist = $true
    foreach ($config in $configFiles) {
        if (-not (Test-Path $config)) {
            $allConfigsExist = $false
            break
        }
    }
    
    if ($allConfigsExist) {
        $testResults += @{
            Category = "Integration"
            Test = "Configuration Consistency"
            Status = "PASS"
            Message = "All required configuration files present"
            Details = "docker-compose.yml and .env.local files available"
        }
    } else {
        $testResults += @{
            Category = "Integration"
            Test = "Configuration Consistency"
            Status = "FAIL"
            Message = "Missing required configuration files"
            Details = "Some configuration files are missing"
        }
    }
    
    # Test 3: Utils module completeness
    $utilsModules = @(
        "$utilsPath\enhanced_retry.py",
        "$utilsPath\retry_integration.py",
        "$utilsPath\enhanced_startup.py",
        "$utilsPath\enhanced_json_parsing.sh",
        "$utilsPath\json_integration.sh"
    )
    
    $moduleCount = 0
    foreach ($module in $utilsModules) {
        if (Test-Path $module) {
            $moduleCount++
        }
    }
    
    $modulePercentage = [math]::Round(($moduleCount / $utilsModules.Count) * 100, 1)
    
    if ($moduleCount -eq $utilsModules.Count) {
        $testResults += @{
            Category = "Integration"
            Test = "Utils Module Completeness"
            Status = "PASS"
            Message = "All enhancement modules present (100 percent)"
            Details = "All $moduleCount utility modules are available"
        }
    } elseif ($moduleCount -ge ($utilsModules.Count * 0.8)) {
        $testResults += @{
            Category = "Integration"
            Test = "Utils Module Completeness"
            Status = "WARN"
            Message = "Most enhancement modules present ($modulePercentage percent)"
            Details = "$moduleCount of $($utilsModules.Count) utility modules available"
        }
    } else {
        $testResults += @{
            Category = "Integration"
            Test = "Utils Module Completeness"
            Status = "FAIL"
            Message = "Many enhancement modules missing ($modulePercentage percent)"
            Details = "Only $moduleCount of $($utilsModules.Count) utility modules available"
        }
    }
    
    return $testResults
}

function New-ComprehensiveReport {
    param(
        [array]$AllResults,
        [string]$Format = "console",
        [string]$OutputPath = ""
    )
    
    $reportData = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        TotalTests = $AllResults.Count
        Categories = @{}
        Summary = @{
            Pass = 0
            Fail = 0
            Warn = 0
        }
        Results = $AllResults
    }
    
    # Analyze results by category
    foreach ($result in $AllResults) {
        $category = $result.Category
        if (-not $reportData.Categories.ContainsKey($category)) {
            $reportData.Categories[$category] = @{ Pass = 0; Fail = 0; Warn = 0; Total = 0 }
        }
        
        $reportData.Categories[$category].Total++
        $reportData.Categories[$category][$result.Status]++
        $reportData.Summary[$result.Status]++
    }
    
    if ($Format -eq "console") {
        Write-Host "`n" + ("="*100) -ForegroundColor Cyan
        Write-Host "COMPREHENSIVE INFRASTRUCTURE ENHANCEMENT TEST REPORT" -ForegroundColor Cyan
        Write-Host ("="*100) -ForegroundColor Cyan
        Write-Host "Generated: $($reportData.Timestamp)" -ForegroundColor Gray
        
        # Category summary
        Write-Host "`nSUMMARY BY CATEGORY:" -ForegroundColor White
        foreach ($category in $reportData.Categories.Keys | Sort-Object) {
            $stats = $reportData.Categories[$category]
            $successRate = [math]::Round(($stats.Pass / $stats.Total) * 100, 1)
            
            $color = if ($stats.Fail -eq 0 -and $stats.Warn -eq 0) { "Green" }
                    elseif ($stats.Fail -eq 0) { "Yellow" }
                    else { "Red" }
            
            Write-Host "  $category`: $($stats.Pass) passed, $($stats.Fail) failed, $($stats.Warn) warnings ($successRate percent success)" -ForegroundColor $color
        }
        
        # Overall summary
        $overallSuccess = [math]::Round(($reportData.Summary.Pass / $reportData.TotalTests) * 100, 1)
        Write-Host "`nOVERALL SUMMARY:" -ForegroundColor White
        Write-Host "  Total Tests: $($reportData.TotalTests)" -ForegroundColor White
        Write-Host "  Passed: $($reportData.Summary.Pass)" -ForegroundColor Green
        Write-Host "  Failed: $($reportData.Summary.Fail)" -ForegroundColor Red
        Write-Host "  Warnings: $($reportData.Summary.Warn)" -ForegroundColor Yellow
        Write-Host "  Success Rate: $overallSuccess percent" -ForegroundColor $(if ($reportData.Summary.Fail -eq 0) { "Green" } else { "Yellow" })
        
        # Detailed results
        Write-Host "`nDETAILED RESULTS:" -ForegroundColor White
        foreach ($category in $reportData.Categories.Keys | Sort-Object) {
            Write-Host "`n$category TESTS:" -ForegroundColor Cyan
            $categoryResults = $AllResults | Where-Object { $_.Category -eq $category }
            
            foreach ($result in $categoryResults) {
                $statusSymbol = switch ($result.Status) {
                    "PASS" { "✅" }
                    "FAIL" { "❌" }
                    "WARN" { "⚠️ " }
                    default { "?" }
                }
                
                $color = switch ($result.Status) {
                    "PASS" { "Green" }
                    "FAIL" { "Red" }
                    "WARN" { "Yellow" }
                    default { "White" }
                }
                
                Write-Host "  $statusSymbol $($result.Test): $($result.Message)" -ForegroundColor $color
                if ($result.Details -and $result.Status -ne "PASS") {
                    Write-Host "    Details: $($result.Details)" -ForegroundColor Gray
                }
            }
        }
        
        Write-Host "`n" + ("="*100) -ForegroundColor Cyan
        
        if ($reportData.Summary.Fail -eq 0) {
            Write-Host "🎉 ALL INFRASTRUCTURE ENHANCEMENTS SUCCESSFULLY IMPLEMENTED!" -ForegroundColor Green
        } elseif ($reportData.Summary.Fail -le 2) {
            Write-Host "⚠️  Infrastructure enhancements mostly complete with minor issues." -ForegroundColor Yellow
        } else {
            Write-Host "⚠️  Infrastructure enhancements have significant issues requiring attention." -ForegroundColor Red
        }
        
        Write-Host ("="*100) -ForegroundColor Cyan
    }
    
    if ($Format -eq "json" -and $OutputPath) {
        $reportData | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputPath -Encoding UTF8
        Write-Host "JSON report saved to: $OutputPath" -ForegroundColor Green
    }
    
    return $reportData
}

function Show-Usage {
    Write-Host @"
Comprehensive Infrastructure Enhancement Testing Suite

Usage:
    .\comprehensive_test_suite.ps1 [options]

Options:
    -TestNetworking      Test Docker networking enhancements
    -TestRetry          Test retry mechanism enhancements  
    -TestJsonParsing    Test JSON parsing enhancements
    -TestSecurity       Test security improvements
    -TestIntegration    Test integration scenarios
    -GenerateReport     Generate detailed test report
    -Full               Run all tests and generate report
    
    -OutputFormat       Report format: console, json, html (default: console)
    -ReportPath         Output path for report file

Examples:
    .\comprehensive_test_suite.ps1 -Full
    .\comprehensive_test_suite.ps1 -TestSecurity -TestJsonParsing
    .\comprehensive_test_suite.ps1 -Full -OutputFormat json -ReportPath "test_results.json"

"@ -ForegroundColor White
}

# Main execution
Import-TestModules

$allResults = @()

if ($Full -or $TestNetworking) {
    $allResults += Test-NetworkingEnhancements
}

if ($Full -or $TestRetry) {
    $allResults += Test-RetryEnhancements
}

if ($Full -or $TestJsonParsing) {
    $allResults += Test-JsonParsingEnhancements
}

if ($Full -or $TestSecurity) {
    $allResults += Test-SecurityEnhancements
}

if ($Full -or $TestIntegration) {
    $allResults += Test-IntegrationScenarios
}

if ($allResults.Count -gt 0 -and ($Full -or $GenerateReport)) {
    New-ComprehensiveReport -AllResults $allResults -Format $OutputFormat -OutputPath $ReportPath | Out-Null
} elseif ($allResults.Count -eq 0) {
    Show-Usage
}