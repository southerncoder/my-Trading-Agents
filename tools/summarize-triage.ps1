$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..') | Select-Object -ExpandProperty Path
$inPath = Join-Path $repoRoot 'secrets-triage.json'
if (-not (Test-Path $inPath)) { Write-Error "Not found: $inPath"; exit 2 }
$j = Get-Content $inPath -Raw | ConvertFrom-Json
# Counts
$counts = $j | Group-Object Severity | ForEach-Object { [PSCustomObject]@{Severity=$_.Name; Count=$_.Count} }
$counts | ConvertTo-Json -Depth 2 | Out-File (Join-Path $repoRoot 'secrets-triage-counts.json') -Encoding utf8
# Top 10 high
$topHigh = $j | Where-Object { $_.Severity -eq 'high' } | Select-Object -First 10
$topHigh | ConvertTo-Json -Depth 6 | Out-File (Join-Path $repoRoot 'secrets-triage-high10.json') -Encoding utf8
Write-Output "WROTE secrets-triage-counts.json and secrets-triage-high10.json"
exit 0
