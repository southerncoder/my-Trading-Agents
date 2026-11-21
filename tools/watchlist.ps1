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
# --- Change requests from the web UI -------------------------------------------------------------------
# The web API only appends validated requests to data\requests\watchlist.jsonl. This function is the single
# writer of watchlist.json: it applies the requests, records each result in watchlist.done.jsonl and returns
# summary lines for status.txt. Rules are the same as Get-Watchlist, but stricter: list must be core or brands.
function Apply-WatchlistRequests(
  [string]$WatchlistPath = $script:WatchlistPath,
  [string]$QueuePath = (Join-Path (Split-Path $PSScriptRoot -Parent) 'data\requests\watchlist.jsonl'),
  [string]$DonePath = (Join-Path (Split-Path $PSScriptRoot -Parent) 'data\requests\watchlist.done.jsonl')
) {
  $enc = New-Object Text.UTF8Encoding($false)
  $processing = "$QueuePath.processing"
  $summary = New-Object System.Collections.Generic.List[string]

  # Move the queue aside first: a request the API appends while we work starts a fresh queue, so it is not lost.
  # Work left in .processing by a crashed run is kept and handled first.
  if (Test-Path $QueuePath) {
    try {
      $moved = "$QueuePath.moving.$([guid]::NewGuid().ToString('N'))"
      Move-Item $QueuePath $moved -Force -ErrorAction Stop
      $text = [IO.File]::ReadAllText($moved)
      if ((Test-Path $processing) -and -not ([IO.File]::ReadAllText($processing)).EndsWith("`n")) { $text = "`n" + $text }
      [IO.File]::AppendAllText($processing, $text, $enc)
      Remove-Item $moved -Force
    } catch { return @("Watchlist requests are waiting: could not read the request queue ($($_.Exception.Message))") }
  }
  if (-not (Test-Path $processing)) { return @() }

  $wl = $null
  try { $wl = Get-Content $WatchlistPath -Raw -ErrorAction Stop | ConvertFrom-Json } catch { }
  if (-not $wl -or -not ($wl.PSObject.Properties.Name -contains 'stocks')) {
    return @('Watchlist requests are waiting: watchlist.json could not be read, nothing was changed')
  }

  $stocks = New-Object System.Collections.ArrayList
  foreach ($s in @($wl.stocks)) { [void]$stocks.Add($s) }
  $find = { param($t) @($stocks | Where-Object { ([string]$_.ticker).Trim().ToUpper() -eq $t }) }
  $okCadence = 'nightly', 'weekly', 'once', 'paused'
  $results = New-Object System.Collections.Generic.List[string]
  $applied = New-Object System.Collections.Generic.List[string]
  $rejected = New-Object System.Collections.Generic.List[string]

  foreach ($line in (([IO.File]::ReadAllText($processing) -replace '^\uFEFF', '') -split "`r?`n")) {
    if (-not $line.Trim()) { continue }
    $req = $null; $reason = $null; $label = '?'
    try { $req = $line | ConvertFrom-Json } catch { $reason = 'unreadable line' }
    if (-not $reason) {
      $t = ([string]$req.ticker).Trim().ToUpper()
      $cad = ([string]$req.cadence).Trim().ToLower()
      $label = $t
      if ($t -notmatch '^[A-Z][A-Z0-9.\-]{0,9}$') { $reason = 'bad ticker'; $label = '?' }
      elseif ([string]$req.action -eq 'add') {
        $list = [string]$req.list
        if ($list -notin 'core', 'brands') { $reason = 'list must be core or brands' }
        elseif ($cad -notin $okCadence) { $reason = 'unknown schedule' }
        elseif (@(& $find $t).Count -gt 0) { $reason = 'already on the watchlist' }
        else {
          $o = [ordered]@{ ticker = $t; list = $list; cadence = $cad }
          $lesson = (([string]$req.lesson) -replace '[\x00-\x1f\x7f]', ' ').Trim()
          if ($lesson.Length -gt 200) { $lesson = $lesson.Substring(0, 200).Trim() }
          if ($lesson) { $o.lesson = $lesson }
          [void]$stocks.Add([pscustomobject]$o)
          $applied.Add("added $t ($list, $cad)")
        }
      }
      elseif ([string]$req.action -eq 'set_cadence') {
        $hit = @(& $find $t)
        if ($cad -notin $okCadence) { $reason = 'unknown schedule' }
        elseif ($hit.Count -eq 0) { $reason = 'not on the watchlist' }
        else {
          $hit[0] | Add-Member -NotePropertyName cadence -NotePropertyValue $cad -Force
          $applied.Add("$t now $cad")
        }
      }
      else { $reason = 'unknown action' }
    }
    if ($reason) { $rejected.Add("$label ($reason)") }
    $results.Add(([pscustomobject]@{ at = (Get-Date).ToString('s'); request = $(if ($req) { $req } else { $line }); result = $(if ($reason) { 'rejected' } else { 'applied' }); reason = $reason } | ConvertTo-Json -Compress -Depth 5))
  }

  if ($applied.Count -gt 0) {
    $wl.stocks = @($stocks.ToArray())
    $tmp = "$WatchlistPath.tmp"
    [IO.File]::WriteAllText($tmp, (($wl | ConvertTo-Json -Depth 5) + "`n"), $enc)
    Move-Item $tmp $WatchlistPath -Force
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $DonePath) | Out-Null
  [IO.File]::AppendAllText($DonePath, (($results -join "`n") + "`n"), $enc)
  Remove-Item $processing -Force
  if ($applied.Count -gt 0) { $summary.Add('Watchlist changes applied: ' + ($applied -join '; ')) }
  if ($rejected.Count -gt 0) { $summary.Add('Watchlist changes rejected: ' + ($rejected -join '; ')) }
  return $summary.ToArray()
}