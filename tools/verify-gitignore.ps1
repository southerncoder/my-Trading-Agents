# Security Verification Script
Write-Host "
Checking gitignore protection...
" -ForegroundColor Cyan

$errors = 0
$passed = 0

# Test docker secrets
Write-Host "Testing Docker Secrets..." -ForegroundColor Yellow
$result = git check-ignore docker/secrets/openai_api_key.txt 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [PASS] openai_api_key.txt is gitignored" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  [FAIL] openai_api_key.txt is NOT gitignored!" -ForegroundColor Red
    $errors++
}

# Test .env.local
Write-Host "
Testing Environment Files..." -ForegroundColor Yellow
$result = git check-ignore .env.local 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [PASS] .env.local is gitignored" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  [FAIL] .env.local is NOT gitignored!" -ForegroundColor Red
    $errors++
}

# Check git tracking
Write-Host "
Checking Git Tracking..." -ForegroundColor Yellow
$tracked = git ls-files docker/secrets/*.txt 2>$null
if ($tracked) {
    Write-Host "  [FAIL] Secret files are tracked!" -ForegroundColor Red
    $errors++
} else {
    Write-Host "  [PASS] No secrets tracked in git" -ForegroundColor Green
    $passed++
}

# Summary
Write-Host "
============================================" -ForegroundColor Cyan
Write-Host "Passed: $passed  |  Errors: $errors" -ForegroundColor White
Write-Host "============================================
" -ForegroundColor Cyan

if ($errors -gt 0) {
    Write-Host "CRITICAL ISSUES FOUND!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "All security checks passed!" -ForegroundColor Green
    exit 0
}
