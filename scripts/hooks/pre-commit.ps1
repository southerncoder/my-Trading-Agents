Write-Host "Running pre-commit security checks..."
$staged = git diff --cached --name-only
foreach ($file in $staged) {
    $content = git show ":$file" 2>$null
    if ($content -and $content -match "PersonalDev") {
        Write-Host "[ERROR] Forbidden token 'PersonalDev' found in staged file: $file" -ForegroundColor Red
        Write-Host "Please remove sensitive references before committing."
        exit 1
    }
}
Write-Host "Pre-commit checks passed." -ForegroundColor Green
exit 0
