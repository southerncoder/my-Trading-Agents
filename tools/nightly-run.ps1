# Unattended nightly run: starts what is needed, runs nightly-brief.ps1, checks the result, writes a status file.
# Meant for Windows Task Scheduler (no AI session needed). Output: logs\nightly\run.log and logs\nightly\<date>\status.txt
param(
  [string]$YahooUrl = 'http://localhost:38402',
  [int]$PriceRetryMinutes = 15,
  [switch]$Force   # run again even if tonight already finished
)
$ErrorActionPreference = 'Continue'
$root = Split-Path $PSScriptRoot -Parent
$date = Get-Date -Format yyyy-MM-dd
$nightly = Join-Path $root 'logs\nightly'
$outDir = Join-Path $nightly $date
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
# Two launchers (Task Scheduler and the Claude scheduled task) may both fire; only the first one does the work.
$statusFile = Join-Path $outDir 'status.txt'
if (-not $Force -and (Test-Path $statusFile)) {
  $first = [string](Get-Content $statusFile -TotalCount 1)
  if ($first -notmatch 'PROBLEMS|FAILED') { Write-Host "Tonight's run already finished ($statusFile). Use -Force to run again."; exit 0 }
}
Start-Transcript -Path (Join-Path $nightly 'run.log') -Force | Out-Null
Set-Location $root
$problems = New-Object System.Collections.Generic.List[string]

function Notify([string]$title, [string]$text) {
  try {
    [void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $tpl = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $nodes = $tpl.GetElementsByTagName('text')
    [void]$nodes.Item(0).AppendChild($tpl.CreateTextNode($title))
    [void]$nodes.Item(1).AppendChild($tpl.CreateTextNode($text))
    $toast = [Windows.UI.Notifications.ToastNotification]::new($tpl)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Nightly stock brief').Show($toast)
  } catch { Write-Warning "Toast failed: $($_.Exception.Message)" }
}
function Test-Url([string]$u) { try { Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 5 | Out-Null; $true } catch { $false } }

# 1. Docker Desktop and Ollama must be up.
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
  $dd = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  if (Test-Path $dd) { Start-Process $dd }
  $deadline = (Get-Date).AddMinutes(5)
  do { Start-Sleep -Seconds 15; & docker info *> $null } while ($LASTEXITCODE -ne 0 -and (Get-Date) -lt $deadline)
  if ($LASTEXITCODE -ne 0) { $problems.Add('Docker Desktop did not start within 5 minutes') }
}
if (-not (Test-Url 'http://localhost:11434/api/tags')) {
  if (-not $env:OLLAMA_MODELS -and (Test-Path 'D:\ollama\models')) { $env:OLLAMA_MODELS = 'D:\ollama\models' }
  Start-Process ollama -ArgumentList 'serve' -WindowStyle Hidden
  $deadline = (Get-Date).AddMinutes(2)
  while (-not (Test-Url 'http://localhost:11434/api/tags') -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 5 }
  if (-not (Test-Url 'http://localhost:11434/api/tags')) { $problems.Add('Ollama is not answering on port 11434') }
}
if ($problems.Count -gt 0) {
  $msg = "FAILED before the run: " + ($problems -join '; ')
  Set-Content -Path (Join-Path $outDir 'status.txt') -Value $msg -Encoding utf8
  Notify 'Nightly stock brief failed' $msg
  Stop-Transcript | Out-Null
  exit 1
}
# The quote service runs in Docker; bring it up if it is not answering.
if (-not (Test-Url "$YahooUrl/health")) {
  & docker compose up -d yahoo-finance *> $null
  Start-Sleep -Seconds 20
}

. (Join-Path $PSScriptRoot 'watchlist.ps1')
$wlChanges = @()
try { $wlChanges = @(Apply-WatchlistRequests) } catch { $wlChanges = @("Watchlist changes could not be applied: $($_.Exception.Message)") }
$wlRun = Get-Watchlist -Date $date
if (-not $wlRun) { $wlRun = [pscustomobject]@{ Core = @(1..12); Brands = @(1..12); Once = @() } }

# 2. The run itself (about 70 to 90 minutes).
$sw = [Diagnostics.Stopwatch]::StartNew()
try { & (Join-Path $PSScriptRoot 'nightly-brief.ps1') } catch { $problems.Add("nightly-brief.ps1 threw: $($_.Exception.Message)") }

# 3. Check the data; if prices are missing, wait and rebuild from the same model output without re-running the models.
function Read-Rows { $f = Join-Path $outDir 'brief-data.json'; if (Test-Path $f) { @(Get-Content $f -Raw | ConvertFrom-Json) } else { @() } }
$rows = Read-Rows
$noPrice = @($rows | Where-Object { -not $_.price })
if ($rows.Count -gt 0 -and $noPrice.Count -gt 0) {
  Write-Host "Missing prices for $($noPrice.Count) rows; waiting $PriceRetryMinutes minutes, then rebuilding."
  Start-Sleep -Seconds ($PriceRetryMinutes * 60)
  $evalRoot = Join-Path $root 'logs\eval'
  $newest = Get-ChildItem $evalRoot -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($newest) { try { & (Join-Path $PSScriptRoot 'nightly-brief.ps1') -ReuseEvalDir $newest.FullName } catch { $problems.Add("rebuild threw: $($_.Exception.Message)") } }
  $rows = Read-Rows
  $noPrice = @($rows | Where-Object { -not $_.price })
}
$expected = @($wlRun.Core).Count + @($wlRun.Brands).Count
if ($rows.Count -ne $expected) { $problems.Add("expected $expected rows, found $($rows.Count)") }
if ($noPrice.Count -gt 0) { $problems.Add("no price for: " + (($noPrice | ForEach-Object { $_.ticker }) -join ', ')) }
$js = Join-Path $outDir 'brief-data.js'
if (-not (Test-Path $js) -or (Get-Item $js).LastWriteTime.Date -ne (Get-Date).Date) { $problems.Add('brief-data.js was not written today') }
$nj = Join-Path $nightly 'nights.js'
if (-not (Test-Path $nj) -or -not (Select-String -Path $nj -Pattern $date -Quiet)) { $problems.Add("nights.js does not list $date") }

# 3b. Scorecard of past calls (non-fatal: a failure here only leaves the previous scorecard.json in place).
try {
  Push-Location (Join-Path $root 'services\web-api')
  & npm run score *> (Join-Path $nightly 'score.log')
  if ($LASTEXITCODE -ne 0) { Write-Warning "Scorecard step failed; see logs\nightly\score.log" }
} catch { Write-Warning "Scorecard step threw: $($_.Exception.Message)" } finally { Pop-Location }
# 4. Summary written from the data (no model needed).
$lines = @()
if ($rows.Count -gt 0) {
  $by = $rows | Group-Object label | ForEach-Object { "$($_.Name): $($_.Count)" }
  $climb = @($rows | Where-Object { $_.trigger_type -eq 'breakout' }).Count
  $dip = @($rows | Where-Object { $_.trigger_type -eq 'pullback' }).Count
  $inside = @($rows | Where-Object { $null -ne $_.trigger_days -and $_.trigger_days -lt 0.5 }).Count
  $mv = $rows | Where-Object { $null -ne $_.day_pct } | Sort-Object { [math]::Abs([double]$_.day_pct) } -Descending | Select-Object -First 1
  $lines += "Calls: " + ($by -join '; ') + " | wait for climb (breakout): $climb, wait for dip (pullback): $dip"
  $lines += "Triggers inside half a typical day of movement: $inside of $($rows.Count)"
  if ($mv) { $lines += "Biggest mover: $($mv.ticker) $($mv.day_pct)%" }
}
foreach ($c in $wlChanges) { $lines += $c }
$lines += "Page: $(Join-Path $nightly 'latest.html')"
$lines += "Took $([int]$sw.Elapsed.TotalMinutes) minutes"
if ($problems.Count -gt 0) { $lines = @("PROBLEMS: " + ($problems -join ' | ')) + $lines }
Set-Content -Path (Join-Path $outDir 'status.txt') -Value $lines -Encoding utf8
if ($problems.Count -eq 0 -and @($wlRun.Once).Count -gt 0) { Remove-OnceStocks -Tickers $wlRun.Once; $lines += "Removed one-time stocks: $(@($wlRun.Once) -join ', ')"; Set-Content -Path (Join-Path $outDir 'status.txt') -Value $lines -Encoding utf8 }
$lines | ForEach-Object { Write-Host $_ }
if ($problems.Count -gt 0) { Notify 'Nightly stock brief had problems' ($problems -join '; ') } else { Notify 'Nightly stock brief ready' $lines[0] }
Stop-Transcript | Out-Null
exit ([int]($problems.Count -gt 0))
