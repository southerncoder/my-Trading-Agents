# Watchlist helpers. Dot-source this file: . .\tools\watchlist.ps1
# tools\watchlist.json holds the stocks; cadence decides which ones run on a given night.
$script:WatchlistPath = Join-Path $PSScriptRoot 'watchlist.json'

# Windows PowerShell 5.1 reads BOM-less UTF-8 as ANSI with Get-Content; always read through this.
function Read-Utf8([string]$Path) { [IO.File]::ReadAllText($Path, (New-Object Text.UTF8Encoding($false))) }

function Get-Watchlist([string]$Date = (Get-Date -Format yyyy-MM-dd)) {
  if (-not (Test-Path $script:WatchlistPath)) { return $null }
  try { $wl = Read-Utf8 $script:WatchlistPath | ConvertFrom-Json } catch { Write-Warning "watchlist.json is not valid JSON: $($_.Exception.Message)"; return $null }
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
  $wl = Read-Utf8 $script:WatchlistPath | ConvertFrom-Json
  $wl.stocks = @($wl.stocks | Where-Object { -not (($_.cadence -eq 'once') -and ($_.ticker.ToUpper() -in $Tickers)) })
  [IO.File]::WriteAllText($script:WatchlistPath, (($wl | ConvertTo-Json -Depth 5) + "`n"), (New-Object Text.UTF8Encoding($false)))
}
# --- Change requests from the web UI -------------------------------------------------------------------
# The web API only appends validated requests to data\requests\watchlist.jsonl. This function is the single
# writer of watchlist.json: it applies the requests, records each result in watchlist.done.jsonl and returns
# summary lines for status.txt. Rules are the same as Get-Watchlist, but stricter: list must be core or brands.
# Batches are the files <queue>.processing and <queue>.moving.<time>.<id>. A batch file is deleted only after its
# results are logged and only if it has not grown since it was read, so a crash or a late append loses nothing.
function Apply-WatchlistRequests(
  [string]$WatchlistPath = $script:WatchlistPath,
  [string]$QueuePath = (Join-Path (Split-Path $PSScriptRoot -Parent) 'data\requests\watchlist.jsonl'),
  [string]$DonePath = (Join-Path (Split-Path $PSScriptRoot -Parent) 'data\requests\watchlist.done.jsonl')
) {
  $enc = New-Object Text.UTF8Encoding($false)
  $summary = New-Object System.Collections.Generic.List[string]

  # Move the queue aside first: a request the API appends while we work starts a fresh queue.
  if (Test-Path $QueuePath) {
    try {
      $stamp = (Get-Date).ToString('yyyyMMddHHmmssfff')
      Move-Item $QueuePath ("$QueuePath.moving.$stamp.$([guid]::NewGuid().ToString('N'))") -Force -ErrorAction Stop
    } catch { return @("Watchlist requests are waiting: could not read the request queue ($($_.Exception.Message))") }
  }
  $leaf = Split-Path $QueuePath -Leaf
  $batches = @(Get-ChildItem -LiteralPath (Split-Path $QueuePath) -Filter "$leaf.*" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '\.(processing|moving\.[^.]+\.[^.]+)$' } |
    Sort-Object @{ Expression = { if ($_.Name -like '*.processing') { 0 } else { 1 } } }, Name)
  if ($batches.Count -eq 0) { return @() }

  $texts = @{}
  try { foreach ($b in $batches) { $texts[$b.FullName] = Read-Utf8 $b.FullName } }
  catch { return @("Watchlist requests are waiting: could not read the request queue ($($_.Exception.Message))") }
  if ($global:AfterBatchRead) { & $global:AfterBatchRead }   # test hook: simulates an append after the read

  $wl = $null
  try { $wl = Read-Utf8 $WatchlistPath | ConvertFrom-Json } catch { }
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

  $allText = (($batches | ForEach-Object { $texts[$_.FullName].TrimStart([char]0xFEFF) }) -join "`n")
  foreach ($line in ($allText -split "`r?`n")) {
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
        if ($list -cnotin 'core', 'brands') { $reason = 'list must be core or brands' }
        elseif ($cad -notin $okCadence) { $reason = 'unknown schedule' }
        elseif (@(& $find $t).Count -gt 0) { $reason = 'already on the watchlist' }
        else {
          $o = [ordered]@{ ticker = $t; list = $list; cadence = $cad }
          $lesson = (([string]$req.lesson) -replace '[\x00-\x1f\x7f]', ' ').Trim()
          if ($lesson.Length -gt 200) {
            $cut = $lesson.Substring(0, 200)
            # Never end on half of a surrogate pair (emoji and other characters outside the BMP).
            if ([char]::IsHighSurrogate($cut[$cut.Length - 1])) { $cut = $cut.Substring(0, $cut.Length - 1) }
            $lesson = $cut.Trim()
          }
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
    try {
      [IO.File]::WriteAllText($tmp, (($wl | ConvertTo-Json -Depth 5) + "`n"), $enc)
      Move-Item $tmp $WatchlistPath -Force -ErrorAction Stop
    } catch {
      Remove-Item $tmp -Force -ErrorAction SilentlyContinue
      return @("Watchlist requests are waiting: watchlist.json could not be updated ($($_.Exception.Message)); will retry next run")
    }
  }
  if ($results.Count -gt 0) {
    New-Item -ItemType Directory -Force -Path (Split-Path $DonePath) | Out-Null
    [IO.File]::AppendAllText($DonePath, (($results -join "`n") + "`n"), $enc)
  }
  foreach ($b in $batches) {
    try { if ((Read-Utf8 $b.FullName) -eq $texts[$b.FullName]) { Remove-Item $b.FullName -Force } } catch { }
  }
  if ($applied.Count -gt 0) { $summary.Add('Watchlist changes applied: ' + ($applied -join '; ')) }
  if ($rejected.Count -gt 0) { $summary.Add('Watchlist changes rejected: ' + ($rejected -join '; ')) }
  return $summary.ToArray()
}
