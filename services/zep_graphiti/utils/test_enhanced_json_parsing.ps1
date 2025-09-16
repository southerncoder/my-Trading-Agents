# Enhanced JSON parsing test for Windows PowerShell
# This script tests the enhanced JSON parsing logic using PowerShell

param(
    [switch]$Test,
    [string]$TestType = "all"
)

function Test-EnhancedJsonParsing {
    Write-Host "Testing enhanced JSON parsing functions..." -ForegroundColor Cyan
    
    $testDir = "$env:TEMP\json_parsing_test"
    New-Item -ItemType Directory -Force -Path $testDir | Out-Null
    
    try {
        # Test 1: Valid OpenAI-style JSON response
        Write-Host "`nTest 1: Valid OpenAI-style JSON response" -ForegroundColor Yellow
        $validJson = @{
            data = @(
                @{ id = "test-model-1"; object = "model" },
                @{ id = "test-model-2"; object = "model" }
            )
        } | ConvertTo-Json -Depth 3
        
        $validJson | Out-File -FilePath "$testDir\valid_response.json" -Encoding UTF8
        
        $result = Test-ModelInResponse -ModelName "test-model-1" -ResponseFile "$testDir\valid_response.json"
        if ($result.Found) {
            Write-Host "✅ Test 1 PASSED: Valid JSON with exact match" -ForegroundColor Green
        } else {
            Write-Host "❌ Test 1 FAILED: Valid JSON with exact match" -ForegroundColor Red
            Write-Host "  Result: $($result.Message)" -ForegroundColor Red
        }
        
        # Test 2: Fuzzy matching
        Write-Host "`nTest 2: Fuzzy matching" -ForegroundColor Yellow
        $fuzzyResult = Test-ModelInResponse -ModelName "test-model" -ResponseFile "$testDir\valid_response.json"
        if ($fuzzyResult.Found) {
            Write-Host "✅ Test 2 PASSED: Fuzzy matching" -ForegroundColor Green
        } else {
            Write-Host "❌ Test 2 FAILED: Fuzzy matching" -ForegroundColor Red
            Write-Host "  Result: $($fuzzyResult.Message)" -ForegroundColor Red
        }
        
        # Test 3: Invalid JSON
        Write-Host "`nTest 3: Invalid JSON handling" -ForegroundColor Yellow
        $invalidJson = '{"invalid": json syntax}'
        $invalidJson | Out-File -FilePath "$testDir\invalid_response.json" -Encoding UTF8
        
        $invalidResult = Test-ModelInResponse -ModelName "test-model" -ResponseFile "$testDir\invalid_response.json"
        if (-not $invalidResult.Found -and $invalidResult.Message -like "*JSON*") {
            Write-Host "✅ Test 3 PASSED: Invalid JSON properly rejected" -ForegroundColor Green
        } else {
            Write-Host "❌ Test 3 FAILED: Invalid JSON not properly rejected" -ForegroundColor Red
            Write-Host "  Result: $($invalidResult.Message)" -ForegroundColor Red
        }
        
        # Test 4: Direct array format
        Write-Host "`nTest 4: Direct array format" -ForegroundColor Yellow
        $arrayJson = @(
            @{ id = "array-model-1" },
            @{ id = "array-model-2" }
        ) | ConvertTo-Json -Depth 2
        
        $arrayJson | Out-File -FilePath "$testDir\array_response.json" -Encoding UTF8
        
        $arrayResult = Test-ModelInResponse -ModelName "array-model-1" -ResponseFile "$testDir\array_response.json"
        if ($arrayResult.Found) {
            Write-Host "✅ Test 4 PASSED: Direct array format" -ForegroundColor Green
        } else {
            Write-Host "❌ Test 4 FAILED: Direct array format" -ForegroundColor Red
            Write-Host "  Result: $($arrayResult.Message)" -ForegroundColor Red
        }
        
        # Test 5: LM Studio format
        Write-Host "`nTest 5: LM Studio models format" -ForegroundColor Yellow
        $lmStudioJson = @{
            models = @("lmstudio-model-1", "lmstudio-model-2")
        } | ConvertTo-Json -Depth 2
        
        $lmStudioJson | Out-File -FilePath "$testDir\lmstudio_response.json" -Encoding UTF8
        
        $lmStudioResult = Test-ModelInResponse -ModelName "lmstudio-model-1" -ResponseFile "$testDir\lmstudio_response.json"
        if ($lmStudioResult.Found) {
            Write-Host "✅ Test 5 PASSED: LM Studio format" -ForegroundColor Green
        } else {
            Write-Host "❌ Test 5 FAILED: LM Studio format" -ForegroundColor Red
            Write-Host "  Result: $($lmStudioResult.Message)" -ForegroundColor Red
        }
        
    } finally {
        # Cleanup
        Remove-Item -Path $testDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "`nEnhanced JSON parsing tests completed" -ForegroundColor Cyan
}

function Test-ModelInResponse {
    param(
        [string]$ModelName,
        [string]$ResponseFile
    )
    
    try {
        if (-not (Test-Path $ResponseFile)) {
            return @{ Found = $false; Message = "Response file not found: $ResponseFile" }
        }
        
        $content = Get-Content -Path $ResponseFile -Raw -Encoding UTF8
        if (-not $content) {
            return @{ Found = $false; Message = "Empty response file" }
        }
        
        # Sanitize and validate JSON
        $content = $content.Trim()
        if (-not ($content.StartsWith('{') -or $content.StartsWith('['))) {
            return @{ Found = $false; Message = "Response does not appear to be JSON" }
        }
        
        try {
            $data = $content | ConvertFrom-Json
        } catch {
            return @{ Found = $false; Message = "JSON_PARSE_ERROR: $($_.Exception.Message)" }
        }
        
        # Extract models from various formats
        $modelsFound = @()
        
        if ($data -is [System.Object] -and $data.PSObject.Properties['data']) {
            # OpenAI-style response
            foreach ($item in $data.data) {
                if ($item.PSObject.Properties['id']) {
                    $modelsFound += $item.id
                }
            }
        } elseif ($data -is [Array]) {
            # Direct array format
            foreach ($item in $data) {
                if ($item -is [String]) {
                    $modelsFound += $item
                } elseif ($item.PSObject.Properties['id']) {
                    $modelsFound += $item.id
                }
            }
        } elseif ($data -is [System.Object] -and $data.PSObject.Properties['models']) {
            # Models field format
            foreach ($model in $data.models) {
                if ($model -is [String]) {
                    $modelsFound += $model
                } elseif ($model.PSObject.Properties['id']) {
                    $modelsFound += $model.id
                }
            }
        }
        
        if ($modelsFound.Count -eq 0) {
            return @{ Found = $false; Message = "NO_MODELS_FOUND: Response contains no recognizable models" }
        }
        
        # Check for exact match
        if ($modelsFound -contains $ModelName) {
            return @{ Found = $true; Message = "MODEL_FOUND_EXACT: $ModelName" }
        }
        
        # Check for fuzzy match
        foreach ($model in $modelsFound) {
            if ($model -like "*$ModelName*" -or $ModelName -like "*$model*") {
                $similarity = Get-StringSimilarity -String1 $ModelName -String2 $model
                if ($similarity -gt 0.8) {
                    return @{ Found = $true; Message = "MODEL_FOUND_FUZZY: $model (similarity: $([math]::Round($similarity, 2)))" }
                }
            }
        }
        
        return @{ Found = $false; Message = "MODEL_NOT_FOUND: $ModelName. Available: $($modelsFound -join ', ')" }
        
    } catch {
        return @{ Found = $false; Message = "ENHANCED_CHECK_ERROR: $($_.Exception.Message)" }
    }
}

function Get-StringSimilarity {
    param([string]$String1, [string]$String2)
    
    $s1 = $String1.ToLower()
    $s2 = $String2.ToLower()
    
    if ($s1 -eq $s2) { return 1.0 }
    if ($s1.Length -eq 0 -or $s2.Length -eq 0) { return 0.0 }
    
    # Simple similarity calculation
    $longer = if ($s1.Length -gt $s2.Length) { $s1 } else { $s2 }
    $shorter = if ($s1.Length -gt $s2.Length) { $s2 } else { $s1 }
    
    $matchCount = 0
    for ($i = 0; $i -lt $shorter.Length; $i++) {
        if ($i -lt $longer.Length -and $shorter[$i] -eq $longer[$i]) {
            $matchCount++
        }
    }
    
    return $matchCount / $longer.Length
}

function Show-Usage {
    Write-Host @"
Enhanced JSON Parsing Test Script

Usage:
    .\test_enhanced_json_parsing.ps1 -Test [-TestType <type>]

Parameters:
    -Test       Run the test suite
    -TestType   Type of test to run (all, valid, invalid, fuzzy)

Examples:
    .\test_enhanced_json_parsing.ps1 -Test
    .\test_enhanced_json_parsing.ps1 -Test -TestType valid

"@ -ForegroundColor White
}

# Main execution
if ($Test) {
    Test-EnhancedJsonParsing
} else {
    Show-Usage
}