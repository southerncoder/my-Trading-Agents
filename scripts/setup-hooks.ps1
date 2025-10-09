Write-Host "Installing repo git hooks..."
if (-not (Test-Path '.git\hooks')) { New-Item -ItemType Directory -Path '.git\hooks' | Out-Null }
Copy-Item -Path 'scripts\hooks\pre-commit.ps1' -Destination '.git\hooks\pre-commit.ps1' -Force
Copy-Item -Path 'scripts\hooks\pre-commit' -Destination '.git\hooks\pre-commit' -Force -ErrorAction SilentlyContinue
Write-Host "Installed hooks to .git/hooks"
Write-Host "To enable PowerShell execution for this session: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass"
