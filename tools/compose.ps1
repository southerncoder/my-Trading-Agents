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
Push-Location $root
try { docker compose @args } finally { Pop-Location }
