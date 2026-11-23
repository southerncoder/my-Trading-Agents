<#
.SYNOPSIS
  Runs queued analysis requests from the portfolio service (asked for on the Picks page, or queued by the nightly
  rules: stop or target hit, a big move, a stale position) and hands each result back.

.DESCRIPTION
  Claims one request at a time, runs tools\analyze-ticker.ps1, and posts the result (or the error). Exits when the
  queue is empty or after -MaxJobs. Does nothing while the nightly run is working (unless -FromNightly) or when
  another worker holds the lock, so a scheduled copy every few minutes is safe.

.EXAMPLE
  .\tools\portfolio-worker.ps1 -MaxJobs 3
#>
param(
  [string]$PortfolioUrl = 'http://localhost:38408/api/portfolio',
  [int]$MaxJobs = 3,
  [switch]$FromNightly
)
$ErrorActionPreference = 'Continue'
$root = Split-Path $PSScriptRoot -Parent
$logDir = Join-Path $root 'logs\portfolio-worker'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$lock = Join-Path $logDir 'worker.lock'

function Say([string]$m) { $line = "$(Get-Date -Format s) $m"; Write-Host $line; Add-Content -Path (Join-Path $logDir 'worker.log') -Value $line -Encoding utf8 }
function Post([string]$path, $body) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 10 -Compress))
  Invoke-RestMethod "$PortfolioUrl$path" -Method Post -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 60
}

if (-not $FromNightly) {
  $task = Get-ScheduledTask -TaskName 'Nightly stock brief' -ErrorAction SilentlyContinue
  if ($task -and $task.State -eq 'Running') { exit 0 }
  # The nightly run can also be started by another launcher; its lock file says so either way.
  $nightLock = Join-Path $root "logs\nightly\$(Get-Date -Format yyyy-MM-dd)\run.lock"
  if (Test-Path $nightLock) {
    $holder = [string](Get-Content $nightLock -TotalCount 1)
    if ($holder -match '^\d+$' -and (Get-Process -Id ([int]$holder) -ErrorAction SilentlyContinue)) { exit 0 }
  }
}
# One worker at a time; a lock older than 2 hours (or whose process is gone) is stale.
if (Test-Path $lock) {
  $held = Get-Content $lock -ErrorAction SilentlyContinue | Select-Object -First 1
  $alive = $held -and (Get-Process -Id ([int]$held) -ErrorAction SilentlyContinue)
  if ($alive -and (Get-Item $lock).LastWriteTime -gt (Get-Date).AddHours(-2)) { exit 0 }
}
Set-Content -Path $lock -Value $PID -Encoding ascii
try {
  try { Invoke-RestMethod "$PortfolioUrl/health" -TimeoutSec 10 | Out-Null } catch { exit 0 }   # service or Docker not up: try again later
  for ($i = 0; $i -lt $MaxJobs; $i++) {
    $job = (Post '/analysis-requests/claim' @{}).data
    if (-not $job) { break }
    Say "claimed #$($job.id) $($job.ticker) ($($job.reason))"
    $tmp = Join-Path $env:TEMP "analysis-$($job.id).json"
    try {
      & (Join-Path $PSScriptRoot 'analyze-ticker.ps1') -Ticker $job.ticker -OutFile $tmp | Out-Null
      $analysis = Get-Content $tmp -Raw -Encoding utf8 | ConvertFrom-Json
      $null = $analysis.PSObject.Properties.Remove('log')
      $res = (Post "/analysis-requests/$($job.id)/complete" @{ analysis = $analysis }).data
      Say "done #$($job.id) $($job.ticker): $($res.candidate.label) $($res.candidate.decision) $($res.candidate.confidence)"
    } catch {
      $msg = $_.Exception.Message
      if ($_.ErrorDetails.Message) { $msg = "$msg $($_.ErrorDetails.Message)" }
      Say "failed #$($job.id) $($job.ticker): $msg"
      try { Post "/analysis-requests/$($job.id)/fail" @{ error = $msg.Substring(0, [Math]::Min(1900, $msg.Length)) } | Out-Null } catch { }
    } finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
  }
} finally { Remove-Item $lock -Force -ErrorAction SilentlyContinue }
