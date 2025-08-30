<#
Migration helper script for Windows (PowerShell)
Runs repository setup, copies .env, optionally starts py_zep services, and runs smoke checks.
Usage: Open PowerShell as normal user in repository root and run:
  ./scripts/migrate-machine.ps1 [-StartPyZep] [-SkipInstall]
#>

param(
  [switch]$StartPyZep = $false,
  [switch]$SkipInstall = $false
)

function ExitWithError($message) {
  Write-Error $message
  exit 1
}

Write-Host "Starting migration helper script..."

$root = Resolve-Path -Path "." | Select-Object -ExpandProperty Path
Write-Host "Repository root: $root"

if (-not $SkipInstall) {
  Write-Host "Running npm install (this may take a few minutes)..."
  npm install
  if ($LASTEXITCODE -ne 0) { ExitWithError "npm install failed with exit code $LASTEXITCODE" }
} else {
  Write-Host "Skipping npm install as requested (--SkipInstall)"
}

# Setup .env.local
$envExample = Join-Path $root "js\.env.example"
$envLocal = Join-Path $root "js\.env.local"
if (Test-Path $envExample) {
  if (-not (Test-Path $envLocal)) {
    Write-Host "Copying .env.example to .env.local"
    Copy-Item -Path $envExample -Destination $envLocal
  } else {
    Write-Host ".env.local already exists; leaving unchanged"
  }
} else {
  Write-Warning ".env.example not found in js/; please create .env.local manually from template or provider docs"
}

# Optionally start py_zep services
if ($StartPyZep) {
  # Check Docker Desktop: if Docker Desktop is installed but not running, try to start it
  function Start-DockerDesktopIfNeeded() {
    # Check for docker daemon via docker info
    try {
      & docker info > $null 2>&1
      if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker daemon is running."
        return
      }
    } catch {
      # ignore
    }

    # Check for Docker Desktop executable in default install path
    $dockerExe = "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"
    if (Test-Path $dockerExe) {
      Write-Host "Docker daemon not running. Attempting to start Docker Desktop..."
      Start-Process -FilePath $dockerExe -Verb runAs
      Write-Host "Waiting up to 60 seconds for Docker to become available..."
      $wait = 0
      while ($wait -lt 60) {
        Start-Sleep -Seconds 2
        try { & docker info > $null 2>&1 } catch {}
        if ($LASTEXITCODE -eq 0) { Write-Host "Docker is now available."; return }
        $wait += 2
      }
      Write-Warning "Docker did not become available within 60s. Continue with caution."
    } else {
      Write-Warning "Docker Desktop not found at $dockerExe. Ensure Docker is installed if you plan to use py_zep via Docker."
    }
  }
  Start-DockerDesktopIfNeeded

  $pyZepScript = Join-Path $root "py_zep\start-zep-services.ps1"
  if (Test-Path $pyZepScript) {
    Write-Host "Starting py_zep services via start-zep-services.ps1"
    powershell -ExecutionPolicy Bypass -File $pyZepScript
    if ($LASTEXITCODE -ne 0) { ExitWithError "py_zep services failed to start (exit code $LASTEXITCODE)" }
  } else {
    Write-Warning "py_zep start script not found at py_zep\start-zep-services.ps1; attempt docker-compose instead"
    Push-Location (Join-Path $root "py_zep")
    docker-compose up --build -d
    if ($LASTEXITCODE -ne 0) { ExitWithError "docker-compose failed to start py_zep services (exit code $LASTEXITCODE)" }
    Pop-Location
  }
} else {
  Write-Host "Skipping py_zep startup. Use -StartPyZep to start services from this script."
}

# Run smoke checks
Write-Host "Running smoke checks: TypeScript check and tests"
Push-Location (Join-Path $root "js")
$npxCmd = Get-Command npx -ErrorAction SilentlyContinue
if ($null -eq $npxCmd) {
  Write-Host "npx not found; ensure Node.js is available in PATH"
} else {
  npx tsc --noEmit
  if ($LASTEXITCODE -ne 0) { Write-Warning "TypeScript check failed (tsc returned non-zero). Review output above." }
}

# Run npm smoke script if available
npm run smoke
if ($LASTEXITCODE -ne 0) { Write-Warning "Smoke script returned non-zero exit code. Check logs above." }

Pop-Location

Write-Host "Migration helper script finished. Review output for any warnings or errors."