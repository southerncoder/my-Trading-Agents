# Runs `docker compose` for this project with credentials loaded from docker/secrets,
# so nothing sensitive is typed or stored in a .env file.
#   .\tools\compose.ps1 up -d
#   .\tools\compose.ps1 ps
$root = Split-Path $PSScriptRoot -Parent
$sec = Join-Path $root 'docker\secrets'
function Read-Secret($n) { $p = Join-Path $sec $n; if (Test-Path -PathType Leaf $p) { (Get-Content $p -Raw).Trim() } }
$env:NEO4J_USER      = Read-Secret 'neo4j_user.txt'
$env:NEO4J_PASSWORD  = Read-Secret 'neo4j_password.txt'
$env:POSTGRES_USER   = Read-Secret 'postgres_user.txt'
$env:POSTGRES_PASSWORD = Read-Secret 'postgres_password.txt'
$env:POSTGRES_DB     = Read-Secret 'postgres_db.txt'
# Optional macro-data keys for the government-data service (absent: FRED is skipped, BLS runs keyless).
$env:FRED_API_KEY    = Read-Secret 'fred_api_key.txt'
$env:BLS_API_KEY     = Read-Secret 'bls_api_key.txt'
# Optional: Census now refuses keyless requests (free key: https://api.census.gov/data/key_signup.html).
$env:CENSUS_API_KEY  = Read-Secret 'census_api_key.txt'
Push-Location $root
try { docker compose @args } finally { Pop-Location }
