# Runs SQL in the project Postgres container. Credentials come from the container's own Docker secrets,
# so nothing sensitive is typed, printed or stored.
#   .\tools\psql.ps1 'select count(*) from portfolio.portfolios'
# (The SQL goes in as a file: Windows PowerShell 5.1 strips inner quotes from native command arguments.)
param([Parameter(Mandatory)][string]$Sql)
$tmp = [IO.Path]::GetTempFileName()
try {
  [IO.File]::WriteAllText($tmp, $Sql, (New-Object Text.UTF8Encoding($false)))
  docker cp $tmp trading-agents-postgresql:/tmp/psql-input.sql | Out-Null
  docker exec trading-agents-postgresql sh -c 'psql -X -q -v ON_ERROR_STOP=1 -P pager=off -U $(cat /run/secrets/postgres_user) -d $(cat /run/secrets/postgres_db) -f /tmp/psql-input.sql'
} finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
