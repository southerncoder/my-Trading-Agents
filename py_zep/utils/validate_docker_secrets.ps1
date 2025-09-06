# Docker Secrets Validation Script
# Tests the security enhancement migration and Docker secrets functionality

param(
    [switch]$TestSecrets,
    [switch]$ValidateDockerCompose,
    [switch]$TestStartWrapper,
    [switch]$Full
)

function Test-DockerSecretsConfiguration {
    Write-Host "Testing Docker Secrets Configuration..." -ForegroundColor Cyan
    
    $secretsPath = "c:\code\PersonalDev\my-Trading-Agents\py_zep\secrets"
    $composePath = "c:\code\PersonalDev\my-Trading-Agents\py_zep\docker-compose.yml"
    $envPath = "c:\code\PersonalDev\my-Trading-Agents\py_zep\.env.local"
    
    $testResults = @()
    
    # Test 1: Verify secret files exist and are not empty
    Write-Host "`nTest 1: Secret Files Validation" -ForegroundColor Yellow
    $requiredSecrets = @(
        "embedder_api_key.txt",
        "openai_api_key.txt", 
        "neo4j_user.txt",
        "neo4j_password.txt",
        "lm_studio_url.txt"
    )
    
    foreach ($secret in $requiredSecrets) {
        $secretFile = Join-Path $secretsPath $secret
        if (Test-Path $secretFile) {
            $content = Get-Content $secretFile -Raw -ErrorAction SilentlyContinue
            if ($content -and $content.Trim().Length -gt 0) {
                Write-Host "  ✅ $secret exists and has content" -ForegroundColor Green
                $testResults += @{ Test = "Secret: $secret"; Status = "PASS"; Message = "File exists with content" }
            } else {
                Write-Host "  ❌ $secret exists but is empty" -ForegroundColor Red
                $testResults += @{ Test = "Secret: $secret"; Status = "FAIL"; Message = "File is empty" }
            }
        } else {
            Write-Host "  ❌ $secret not found" -ForegroundColor Red
            $testResults += @{ Test = "Secret: $secret"; Status = "FAIL"; Message = "File not found" }
        }
    }
    
    # Test 2: Verify docker-compose.yml has secrets configuration
    Write-Host "`nTest 2: Docker Compose Secrets Configuration" -ForegroundColor Yellow
    if (Test-Path $composePath) {
        $composeContent = Get-Content $composePath -Raw
        
        # Check for secrets section
        if ($composeContent -match "secrets:") {
            Write-Host "  ✅ Secrets section found in docker-compose.yml" -ForegroundColor Green
            $testResults += @{ Test = "Docker Compose Secrets"; Status = "PASS"; Message = "Secrets section exists" }
            
            # Check each required secret is defined
            foreach ($secret in $requiredSecrets) {
                $secretName = $secret -replace "\.txt$", ""
                if ($composeContent -match "$secretName\s*:") {
                    Write-Host "  ✅ Secret '$secretName' configured in docker-compose.yml" -ForegroundColor Green
                    $testResults += @{ Test = "Compose Config: $secretName"; Status = "PASS"; Message = "Secret configured" }
                } else {
                    Write-Host "  ❌ Secret '$secretName' not configured in docker-compose.yml" -ForegroundColor Red
                    $testResults += @{ Test = "Compose Config: $secretName"; Status = "FAIL"; Message = "Secret not configured" }
                }
            }
        } else {
            Write-Host "  ❌ No secrets section found in docker-compose.yml" -ForegroundColor Red
            $testResults += @{ Test = "Docker Compose Secrets"; Status = "FAIL"; Message = "Secrets section missing" }
        }
        
        # Check if zep-graphiti service uses secrets
        if ($composeContent -match "zep-graphiti[\s\S]*?secrets:") {
            Write-Host "  ✅ zep-graphiti service configured to use secrets" -ForegroundColor Green
            $testResults += @{ Test = "Service Secrets"; Status = "PASS"; Message = "Service uses secrets" }
        } else {
            Write-Host "  ❌ zep-graphiti service not configured for secrets" -ForegroundColor Red
            $testResults += @{ Test = "Service Secrets"; Status = "FAIL"; Message = "Service not using secrets" }
        }
    }
    
    # Test 3: Verify .env.local doesn't contain sensitive data
    Write-Host "`nTest 3: Environment File Security" -ForegroundColor Yellow
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
        
        $sensitivePatterns = @(
            "OPENAI_API_KEY\s*=\s*[a-zA-Z0-9-]{10,}",
            "EMBEDDER_API_KEY\s*=\s*[a-zA-Z0-9-]{10,}",
            "NEO4J_PASSWORD\s*=\s*[a-zA-Z0-9]{6,}"
        )
        
        $foundSensitiveData = $false
        foreach ($pattern in $sensitivePatterns) {
            if ($envContent -match $pattern) {
                Write-Host "  ❌ Sensitive data pattern found: $pattern" -ForegroundColor Red
                $testResults += @{ Test = "Env Security"; Status = "FAIL"; Message = "Sensitive data found: $pattern" }
                $foundSensitiveData = $true
            }
        }
        
        if (-not $foundSensitiveData) {
            Write-Host "  ✅ No sensitive data found in .env.local" -ForegroundColor Green
            $testResults += @{ Test = "Env Security"; Status = "PASS"; Message = "No sensitive data in environment file" }
        }
        
        # Check for security comments
        if ($envContent -match "moved to Docker secrets|secrets/.*\.txt") {
            Write-Host "  ✅ Security migration comments found" -ForegroundColor Green
            $testResults += @{ Test = "Security Documentation"; Status = "PASS"; Message = "Migration documented" }
        } else {
            Write-Host "  ⚠️  No security migration comments found" -ForegroundColor Yellow
            $testResults += @{ Test = "Security Documentation"; Status = "WARN"; Message = "Migration not documented" }
        }
    }
    
    return $testResults
}

function Test-StartWrapperSecrets {
    Write-Host "`nTesting start-wrapper.sh secrets integration..." -ForegroundColor Cyan
    
    $startWrapperPath = "c:\code\PersonalDev\my-Trading-Agents\py_zep\secrets\start-wrapper.sh"
    
    if (-not (Test-Path $startWrapperPath)) {
        Write-Host "❌ start-wrapper.sh not found at $startWrapperPath" -ForegroundColor Red
        return @(@{ Test = "Start Wrapper"; Status = "FAIL"; Message = "File not found" })
    }
    
    $content = Get-Content $startWrapperPath -Raw
    $testResults = @()
    
    # Check for secrets loading function
    if ($content -match "load_secret\s*\(\s*\)") {
        Write-Host "✅ load_secret function found" -ForegroundColor Green
        $testResults += @{ Test = "Secrets Function"; Status = "PASS"; Message = "load_secret function exists" }
    } else {
        Write-Host "❌ load_secret function not found" -ForegroundColor Red
        $testResults += @{ Test = "Secrets Function"; Status = "FAIL"; Message = "load_secret function missing" }
    }
    
    # Check for secrets directory usage
    if ($content -match "/run/secrets/") {
        Write-Host "✅ Docker secrets path usage found" -ForegroundColor Green
        $testResults += @{ Test = "Secrets Path"; Status = "PASS"; Message = "Uses /run/secrets/ path" }
    } else {
        Write-Host "❌ Docker secrets path usage not found" -ForegroundColor Red
        $testResults += @{ Test = "Secrets Path"; Status = "FAIL"; Message = "Docker secrets path not used" }
    }
    
    # Check for secret environment variable setting
    $secretVars = @("EMBEDDER_API_KEY", "OPENAI_API_KEY", "LM_STUDIO_URL")
    foreach ($var in $secretVars) {
        if ($content -match "export\s+$var\s*=") {
            Write-Host "✅ $var export found" -ForegroundColor Green
            $testResults += @{ Test = "Export: $var"; Status = "PASS"; Message = "Variable exported" }
        } else {
            Write-Host "⚠️  $var export not found" -ForegroundColor Yellow
            $testResults += @{ Test = "Export: $var"; Status = "WARN"; Message = "Variable not explicitly exported" }
        }
    }
    
    return $testResults
}

function New-TestReport {
    param($TestResults)
    
    Write-Host "`n" + ("="*80) -ForegroundColor Cyan
    Write-Host "DOCKER SECRETS VALIDATION REPORT" -ForegroundColor Cyan
    Write-Host ("="*80) -ForegroundColor Cyan
    
    $passCount = 0
    $failCount = 0
    $warnCount = 0
    
    foreach ($result in $TestResults) {
        $status = $result.Status
        $color = switch ($status) {
            "PASS" { "Green"; $passCount++ }
            "FAIL" { "Red"; $failCount++ }
            "WARN" { "Yellow"; $warnCount++ }
            default { "White" }
        }
        
        $statusSymbol = switch ($status) {
            "PASS" { "✅" }
            "FAIL" { "❌" }
            "WARN" { "⚠️ " }
            default { "?" }
        }
        
        Write-Host "$statusSymbol $($result.Test): $($result.Message)" -ForegroundColor $color
    }
    
    Write-Host "`n" + ("-"*80) -ForegroundColor Cyan
    Write-Host "SUMMARY: $passCount passed, $failCount failed, $warnCount warnings" -ForegroundColor Cyan
    Write-Host ("-"*80) -ForegroundColor Cyan
    
    if ($failCount -eq 0) {
        Write-Host "`n🎉 Docker Secrets Migration: SUCCESS" -ForegroundColor Green
        Write-Host "All critical security enhancements are properly configured." -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Docker Secrets Migration: ISSUES FOUND" -ForegroundColor Yellow
        Write-Host "$failCount critical issues need attention." -ForegroundColor Yellow
    }
    
    return @{
        Passed = $passCount
        Failed = $failCount
        Warnings = $warnCount
        Total = $TestResults.Count
    }
}

function Show-Usage {
    Write-Host @"
Docker Secrets Validation Script

Usage:
    .\validate_docker_secrets.ps1 [-TestSecrets] [-ValidateDockerCompose] [-TestStartWrapper] [-Full]

Parameters:
    -TestSecrets            Test secret files existence and content
    -ValidateDockerCompose  Validate docker-compose.yml secrets configuration
    -TestStartWrapper       Test start-wrapper.sh secrets integration
    -Full                   Run all tests

Examples:
    .\validate_docker_secrets.ps1 -Full
    .\validate_docker_secrets.ps1 -TestSecrets -ValidateDockerCompose

"@ -ForegroundColor White
}

# Main execution
if ($Full -or ($TestSecrets -and $ValidateDockerCompose -and $TestStartWrapper)) {
    $allResults = @()
    $allResults += Test-DockerSecretsConfiguration
    $allResults += Test-StartWrapperSecrets
    New-TestReport -TestResults $allResults | Out-Null
} elseif ($TestSecrets -or $ValidateDockerCompose) {
    $results = Test-DockerSecretsConfiguration
    New-TestReport -TestResults $results | Out-Null
} elseif ($TestStartWrapper) {
    $results = Test-StartWrapperSecrets
    New-TestReport -TestResults $results | Out-Null
} else {
    Show-Usage
}