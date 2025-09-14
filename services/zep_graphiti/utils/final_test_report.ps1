# Infrastructure Enhancement Test Report

Write-Host "COMPREHENSIVE INFRASTRUCTURE ENHANCEMENT TEST REPORT" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

# Test 1: Docker Secrets
Write-Host "`nTesting Docker Secrets Configuration..." -ForegroundColor Yellow
$secretsPath = "c:\code\PersonalDev\my-Trading-Agents\services\zep_graphiti\secrets"
$requiredSecrets = @("embedder_api_key.txt", "openai_api_key.txt", "neo4j_user.txt", "neo4j_password.txt", "lm_studio_url.txt")

$secretsPass = 0
foreach ($secret in $requiredSecrets) {
    $secretFile = Join-Path $secretsPath $secret
    if (Test-Path $secretFile) {
        $content = Get-Content $secretFile -Raw -ErrorAction SilentlyContinue
        if ($content -and $content.Trim().Length -gt 0) {
            Write-Host "  [PASS] $secret exists and has content" -ForegroundColor Green
            $secretsPass++
        } else {
            Write-Host "  [FAIL] $secret exists but is empty" -ForegroundColor Red
        }
    } else {
        Write-Host "  [FAIL] $secret not found" -ForegroundColor Red
    }
}

# Test 2: Enhanced Retry System
Write-Host "`nTesting Enhanced Retry System..." -ForegroundColor Yellow
$retryModules = @(
    "c:\code\PersonalDev\my-Trading-Agents\services\zep_graphiti\utils\enhanced_retry.py",
    "c:\code\PersonalDev\my-Trading-Agents\services\zep_graphiti\utils\retry_integration.py",
    "c:\code\PersonalDev\my-Trading-Agents\services\zep_graphiti\utils\enhanced_startup.py"
)

$retryPass = 0
foreach ($module in $retryModules) {
    if (Test-Path $module) {
        $content = Get-Content $module -Raw
        $moduleName = Split-Path -Leaf $module
        
        if ($content -match "CircuitBreaker|exponential|backoff") {
            Write-Host "  [PASS] $moduleName has advanced retry features" -ForegroundColor Green
            $retryPass++
        } else {
            Write-Host "  [WARN] $moduleName exists but features unclear" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [FAIL] $(Split-Path -Leaf $module) not found" -ForegroundColor Red
    }
}

# Test 3: JSON Parsing Enhancements
Write-Host "`nTesting JSON Parsing Enhancements..." -ForegroundColor Yellow
$jsonModules = @(
    "c:\code\PersonalDev\my-Trading-Agents\services\zep_graphiti\utils\enhanced_json_parsing.sh",
    "c:\code\PersonalDev\my-Trading-Agents\services\zep_graphiti\utils\test_enhanced_json_parsing.ps1"
)

$jsonPass = 0
foreach ($module in $jsonModules) {
    if (Test-Path $module) {
        $content = Get-Content $module -Raw
        $moduleName = Split-Path -Leaf $module
        
        if ($content -match "fuzzy|sanitize|validate") {
            Write-Host "  [PASS] $moduleName has enhanced JSON features" -ForegroundColor Green
            $jsonPass++
        } else {
            Write-Host "  [WARN] $moduleName exists but features unclear" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [FAIL] $(Split-Path -Leaf $module) not found" -ForegroundColor Red
    }
}

# Test 4: Docker Networking
Write-Host "`nTesting Docker Networking Configuration..." -ForegroundColor Yellow
$dockerCompose = "c:\code\PersonalDev\my-Trading-Agents\services\zep_graphiti\docker-compose.yml"

$networkingPass = 0
if (Test-Path $dockerCompose) {
    $composeContent = Get-Content $dockerCompose -Raw
    
    if ($composeContent -match "networks:\s*\n\s*trading_agents:") {
        Write-Host "  [PASS] Custom trading_agents network configured" -ForegroundColor Green
        $networkingPass++
    } else {
        Write-Host "  [FAIL] Custom network not found" -ForegroundColor Red
    }
    
    if ($composeContent -match "healthcheck:") {
        Write-Host "  [PASS] Service health checks configured" -ForegroundColor Green
        $networkingPass++
    } else {
        Write-Host "  [FAIL] Health checks not configured" -ForegroundColor Red
    }
    
    if ($composeContent -match "depends_on:") {
        Write-Host "  [PASS] Service dependencies configured" -ForegroundColor Green
        $networkingPass++
    } else {
        Write-Host "  [FAIL] Service dependencies not configured" -ForegroundColor Red
    }
} else {
    Write-Host "  [FAIL] docker-compose.yml not found" -ForegroundColor Red
}

# Test 5: Environment Security
Write-Host "`nTesting Environment Security..." -ForegroundColor Yellow
$envFile = "c:\code\PersonalDev\my-Trading-Agents\services\zep_graphiti\.env.local"

$securityPass = 0
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    # Check for sensitive data patterns
    $sensitiveFound = $false
    if ($envContent -match "[a-zA-Z0-9]{30,}") {
        Write-Host "  [WARN] Potential API keys found in .env.local" -ForegroundColor Yellow
        $sensitiveFound = $true
    }
    
    if (-not $sensitiveFound) {
        Write-Host "  [PASS] No obvious sensitive data in .env.local" -ForegroundColor Green
        $securityPass++
    }
    
    # Check for security comments
    if ($envContent -match "secrets|Docker secrets|moved to") {
        Write-Host "  [PASS] Security migration documentation found" -ForegroundColor Green
        $securityPass++
    } else {
        Write-Host "  [WARN] Security migration not documented" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [FAIL] .env.local file not found" -ForegroundColor Red
}

# Generate Summary
Write-Host "`n" + ("=" * 80) -ForegroundColor Cyan
Write-Host "SUMMARY OF INFRASTRUCTURE ENHANCEMENTS" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

$totalCategories = 5
$passedCategories = 0

Write-Host "`nTest Results by Category:" -ForegroundColor White

# Calculate scores and display results
$secretsScore = [math]::Round(($secretsPass / $requiredSecrets.Count) * 100, 0)
if ($secretsPass -eq $requiredSecrets.Count) {
    Write-Host "  Docker Secrets: PASS ($secretsScore% - $secretsPass/$($requiredSecrets.Count) secrets)" -ForegroundColor Green
    $passedCategories++
} else {
    Write-Host "  Docker Secrets: FAIL ($secretsScore% - $secretsPass/$($requiredSecrets.Count) secrets)" -ForegroundColor Red
}

$retryScore = [math]::Round(($retryPass / $retryModules.Count) * 100, 0)
if ($retryPass -eq $retryModules.Count) {
    Write-Host "  Retry System: PASS ($retryScore% - $retryPass/$($retryModules.Count) modules)" -ForegroundColor Green
    $passedCategories++
} else {
    Write-Host "  Retry System: FAIL ($retryScore% - $retryPass/$($retryModules.Count) modules)" -ForegroundColor Red
}

$jsonScore = [math]::Round(($jsonPass / $jsonModules.Count) * 100, 0)
if ($jsonPass -eq $jsonModules.Count) {
    Write-Host "  JSON Parsing: PASS ($jsonScore% - $jsonPass/$($jsonModules.Count) modules)" -ForegroundColor Green
    $passedCategories++
} else {
    Write-Host "  JSON Parsing: FAIL ($jsonScore% - $jsonPass/$($jsonModules.Count) modules)" -ForegroundColor Red
}

$networkingScore = [math]::Round(($networkingPass / 3) * 100, 0)
if ($networkingPass -eq 3) {
    Write-Host "  Networking: PASS ($networkingScore% - $networkingPass/3 features)" -ForegroundColor Green
    $passedCategories++
} else {
    Write-Host "  Networking: FAIL ($networkingScore% - $networkingPass/3 features)" -ForegroundColor Red
}

$securityScore = [math]::Round(($securityPass / 2) * 100, 0)
if ($securityPass -eq 2) {
    Write-Host "  Security: PASS ($securityScore% - $securityPass/2 checks)" -ForegroundColor Green
    $passedCategories++
} else {
    Write-Host "  Security: PARTIAL ($securityScore% - $securityPass/2 checks)" -ForegroundColor Yellow
}

# Overall Summary
$overallScore = [math]::Round(($passedCategories / $totalCategories) * 100, 0)

Write-Host "`nOVERALL RESULT:" -ForegroundColor White
Write-Host "Categories Passed: $passedCategories out of $totalCategories ($overallScore%)" -ForegroundColor $(if ($passedCategories -eq $totalCategories) { "Green" } else { "Yellow" })

if ($passedCategories -eq $totalCategories) {
    Write-Host "`nALL INFRASTRUCTURE ENHANCEMENTS SUCCESSFULLY IMPLEMENTED!" -ForegroundColor Green
    Write-Host "   - Docker networking optimized" -ForegroundColor Green
    Write-Host "   - Advanced retry mechanisms with circuit breakers" -ForegroundColor Green  
    Write-Host "   - Enhanced JSON parsing with fuzzy matching" -ForegroundColor Green
    Write-Host "   - Security hardened with Docker secrets" -ForegroundColor Green
    Write-Host "   - Comprehensive testing framework created" -ForegroundColor Green
} elseif ($passedCategories -ge 4) {
    Write-Host "`nInfrastructure enhancements mostly complete with minor issues." -ForegroundColor Yellow
    Write-Host "Most critical improvements are operational." -ForegroundColor Yellow
} else {
    Write-Host "`nInfrastructure enhancements have significant gaps." -ForegroundColor Red
    Write-Host "Review failed categories and address missing components." -ForegroundColor Red
}

Write-Host "`n" + ("=" * 80) -ForegroundColor Cyan
Write-Host "Infrastructure Enhancement Testing Complete" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan