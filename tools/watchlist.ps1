# Watchlist helpers. Dot-source this file: . .\tools\watchlist.ps1
# tools\watchlist.json holds the stocks; cadence decides which ones run on a given night.
$script:WatchlistPath = Join-Path $PSScriptRoot 'watchlist.json'

function Get-Watchlist([string]$Date = (Get-Date -Format yyyy-MM-dd)) {
  if (-not (Test-Path $script:WatchlistPath)) { return $null }
  try { $wl = Get-Content $script:WatchlistPath -Raw | ConvertFrom-Json } catch { Write-Warning "watchlist.json is not valid JSON: $($_.Exception.Message)"; return $null }
  $day = ([datetime]$Date).DayOfWeek
  $core = @(); $brands = @(); $once = @(); $lessons = @{}; $skipped = @()
  foreach ($s in @($wl.stocks)) {
    $t = ([string]$s.ticker).Trim().ToUpper()
    if ($t -notmatch '^[A-Z][A-Z0-9.\-]{0,9}$') { Write-Warning "Skipping bad ticker '$($s.ticker)' in watchlist.json"; continue }
    $cad = if ($s.cadence) { ([string]$s.cadence).ToLower() } else { 'nightly' }
    $run = switch ($cad) { 'nightly' { $true } 'weekly' { $day -eq 'Monday' } 'once' { $true } 'paused' { $false } default { Write-Warning "Unknown cadence '$cad' for $t; treating as paused"; $false } }
    if (-not $run) { $skipped += $t; continue }
    if ($cad -eq 'once') { $once += $t }
    if ($s.lesson) { $lessons[$t] = [string]$s.lesson }
    if ($s.list -eq 'core') { $core += $t } else { $brands += $t }
  }
  [pscustomobject]@{ Core = $core; Brands = $brands; Once = $once; Skipped = $skipped; Lessons = $lessons }
}

# After a good run: drop the 'once' stocks that ran.
function Remove-OnceStocks([string[]]$Tickers) {
  if (-not $Tickers -or -not (Test-Path $script:WatchlistPath)) { return }
  $wl = Get-Content $script:WatchlistPath -Raw | ConvertFrom-Json
  $wl.stocks = @($wl.stocks | Where-Object { -not (($_.cadence -eq 'once') -and ($_.ticker.ToUpper() -in $Tickers)) })
  [IO.File]::WriteAllText($script:WatchlistPath, (($wl | ConvertTo-Json -Depth 5) + "`n"), (New-Object Text.UTF8Encoding($false)))
}
