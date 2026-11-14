<#
Helper: Attempt to install OpenSSL on Windows using Chocolatey.
This script will:
- Detect Chocolatey; if present, install openssl.light or openssl
- If Chocolatey is not present, print concise manual instructions
- Does not elevate to admin itself; run in an elevated PowerShell session
#>

param(
    [switch]$Force
)

function Write-Info([string]$m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Write-ErrorMsg([string]$m) { Write-Host "[ERROR] $m" -ForegroundColor Red }

Write-Info "Checking for Chocolatey..."
$choco = Get-Command choco -ErrorAction SilentlyContinue
if ($null -ne $choco) {
    Write-Info "Chocolatey detected. Installing OpenSSL via choco. You may be prompted for admin rights."
    try {
        choco install openssl.light -y --no-progress
        if ($LASTEXITCODE -ne 0) {
            Write-Info "choco install returned non-zero exit code. Trying 'openssl' package name as fallback."
            choco install openssl -y --no-progress
        }
        Write-Info "Installation attempted. Ensure that C:\\Program Files\\OpenSSL-Win64\\bin (or choco's bin) is in your PATH. Restart shell after install."
    } catch {
        Write-ErrorMsg "Chocolatey installation failed: $_"
    }
} else {
    Write-Info "Chocolatey not found. Manual steps to install OpenSSL on Windows:"
    Write-Host "1) Install Chocolatey (https://chocolatey.org/install) and re-run this script, OR" -ForegroundColor Yellow
    Write-Host "2) Download a Win64 OpenSSL installer (e.g., from https://slproweb.com/products/Win32OpenSSL.html) and install, then add installation\\bin to PATH." -ForegroundColor Yellow
    Write-Host "After install, run 'openssl version' in PowerShell to verify."
}

Write-Info "Done. If you installed openssl, close and reopen your shell, then re-run docker/generate-and-trust-cert.ps1."
