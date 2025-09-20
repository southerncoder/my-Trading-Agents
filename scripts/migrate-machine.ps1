<#
Migration helper script for Windows (PowerShell)
Runs repository setup, copies .env, optionally starts zep_graphiti services, and runs smoke checks.
Usage: Open PowerShell as normal user in repository root and run:
  ./scripts/migrate-machine.ps1 [-StartPyZep] [-SkipInstall]
#>

param(
  [switch]$StartZepGraphiti = $false,
  [switch]$SkipInstall = $false
)

function ExitWithError($message) {
  Write-Error $message
  exit 1
}

Write-Host "Starting migration helper script..."

$root = Resolve-Path -Path "." | Select-Object -ExpandProperty Path
Write-Host "Repository root: $root"

# Ensure Node.js and npm are available
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($null -eq $nodeCmd -or $null -eq $npmCmd) {
  Write-Error "Node.js and/or npm not found in PATH. Please install Node.js (v18+) and ensure 'node' and 'npm' are on your PATH."
  Write-Host "Download: https://nodejs.org/"
  Exit 1
}

if (-not $SkipInstall) {
  Write-Host "Running npm install (this may take a few minutes)..."
  Push-Location (Join-Path $root "js")
  npm install
  $npmExit = $LASTEXITCODE
  Pop-Location
  if ($npmExit -ne 0) { ExitWithError "npm install failed with exit code $npmExit" }
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

# Optionally start zep_graphiti services
if ($StartZepGraphiti) {
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
      # NOTE: Default Windows Docker Desktop path. If installed elsewhere, set DOCKER_DESKTOP_PATH env var before running
      $dockerExe = $env:DOCKER_DESKTOP_PATH
      if (-not $dockerExe -or -not (Test-Path $dockerExe)) {
          $dockerExe = "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"
      }
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
  Write-Warning "Docker Desktop not found at $dockerExe. Ensure Docker is installed if you plan to use services/zep_graphiti via Docker."
    }
  }
  Start-DockerDesktopIfNeeded

  $zepGraphitiScript = Join-Path $root "services\zep_graphiti\start-zep-services.ps1"
  if (Test-Path $zepGraphitiScript) {
    Write-Host "Starting zep_graphiti services via start-zep-services.ps1"
    powershell -ExecutionPolicy Bypass -File $zepGraphitiScript
    if ($LASTEXITCODE -ne 0) { ExitWithError "zep_graphiti services failed to start (exit code $LASTEXITCODE)" }
  } else {
    Write-Warning "zep_graphiti start script not found at services\zep_graphiti\start-zep-services.ps1; attempting docker-compose fallback"
    Push-Location (Join-Path $root "services\zep_graphiti")
    docker-compose up --build -d
    if ($LASTEXITCODE -ne 0) { ExitWithError "docker-compose failed to start zep_graphiti services (exit code $LASTEXITCODE)" }
    Pop-Location
  }
} else {
  Write-Host "Skipping zep_graphiti startup. Use -StartZepGraphiti to start services from this script."
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