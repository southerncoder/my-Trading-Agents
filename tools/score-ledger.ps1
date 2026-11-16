<#
.SYNOPSIS
  Scores the decision ledger: forward return of each past call, grouped by call label and confidence band.

.DESCRIPTION
  Reads data/ledger/decisions.jsonl, fetches the latest price from the local yahoo-finance service and
  reports, per call type, how the price moved since the call. Needs a few weeks of nightly runs before the
  numbers mean anything. Paper analysis only.

.EXAMPLE
  .\tools\score-ledger.ps1 -MinDays 5
#>
param([int]$MinDays = 5, [string]$YahooUrl = 'http://localhost:38402')
$root = Split-Path $PSScriptRoot -Parent
$file = Join-Path $root 'data/ledger/decisions.jsonl'
if (-not (Test-Path $file)) { Write-Host 'No ledger yet.'; exit 0 }
$entries = Get-Content $file | Where-Object { $_.Trim() } | ForEach-Object { $_ | ConvertFrom-Json }
$prices = @{}
$scored = foreach ($e in $entries) {
  $age = ((Get-Date) - [datetime]$e.date).Days
  if ($age -lt $MinDays -or -not $e.price) { continue }
  if (-not $prices.ContainsKey($e.ticker)) {
    try { $prices[$e.ticker] = [double](Invoke-RestMethod "$YahooUrl/api/quote/$($e.ticker)" -TimeoutSec 40).data.regularMarketPrice } catch { $prices[$e.ticker] = $null }
  }
  if (-not $prices[$e.ticker]) { continue }
  [pscustomobject]@{
    Date = $e.date; Ticker = $e.ticker; Label = $e.label; Conf = [double]$e.confidence
    Band = if ([double]$e.confidence -ge 0.7) { '0.70+' } elseif ([double]$e.confidence -ge 0.6) { '0.60-0.69' } else { '<0.60' }
    Days = $age; RetPct = [math]::Round(($prices[$e.ticker] / [double]$e.price - 1) * 100, 2)
  }
}
if (-not $scored) { Write-Host "No calls old enough to score returns yet (need at least $MinDays days)." }
if ($scored) {
Write-Host "`n=== By call ==="
$scored | Group-Object Label | ForEach-Object { [pscustomobject]@{ Call = $_.Name; N = $_.Count; AvgRetPct = [math]::Round(($_.Group | Measure-Object RetPct -Average).Average, 2); UpShare = '{0:P0}' -f (($_.Group | Where-Object RetPct -gt 0).Count / $_.Count) } } | Format-Table -AutoSize
Write-Host "=== By confidence band ==="
$scored | Group-Object Band | ForEach-Object { [pscustomobject]@{ Band = $_.Name; N = $_.Count; AvgRetPct = [math]::Round(($_.Group | Measure-Object RetPct -Average).Average, 2); UpShare = '{0:P0}' -f (($_.Group | Where-Object RetPct -gt 0).Count / $_.Count) } } | Format-Table -AutoSize
}

# --- Where does "wait" come from, and is it changing? Share of calls per stage that say wait, by week. ---
$withStance = @($entries | Where-Object { $_.stance })
if ($withStance.Count) {
  Write-Host "=== Share of calls saying 'wait', by stage and week ==="
  $withStance | Group-Object { $d = [datetime]$_.date; $d.AddDays(-[int]$d.DayOfWeek).ToString('yyyy-MM-dd') } | Sort-Object Name | ForEach-Object {
    $g = $_.Group; $n = $g.Count
    [pscustomobject]@{ WeekOf = $_.Name; N = $n
      Market = '{0:P0}' -f (@($g | Where-Object { $_.stance.market -eq 'wait' }).Count / $n)
      ResearchMgr = '{0:P0}' -f (@($g | Where-Object { $_.stance.rm -eq 'wait' }).Count / $n)
      Trader = '{0:P0}' -f (@($g | Where-Object { $_.stance.trader -eq 'wait' }).Count / $n)
      PortfolioMgr = '{0:P0}' -f (@($g | Where-Object { $_.stance.pm -eq 'wait' }).Count / $n) }
  } | Format-Table -AutoSize
}

# --- Did waiting pay? For each pending buy with a trigger price: was the trigger reached, and how does
#     "buy at the call price" compare with "buy only if the trigger is reached" (unfilled = 0% return)? ---
$pending = @($entries | Where-Object { $_.action_now -eq 'wait_for_trigger' -and $_.trigger_price -and $_.price -and ((Get-Date) - [datetime]$_.date).Days -ge $MinDays })
if ($pending.Count) {
  $res = foreach ($e in $pending) {
    try {
      $start = ([datetime]$e.date).AddDays(1).ToString('yyyy-MM-dd'); $end = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
      $csv = Invoke-RestMethod "$YahooUrl/api/historical/$($e.ticker)?startDate=$start&endDate=$end" -TimeoutSec 40
      $bars = foreach ($l in ($csv -split "`n")) { if ($l -match '^\d{4}-\d\d-\d\d,') { $c = $l -split ','; [pscustomobject]@{ High = [double]$c[2]; Low = [double]$c[3]; Close = [double]$c[4] } } }
      if (-not $bars) { continue }
      $trig = [double]$e.trigger_price; $p0 = [double]$e.price; $last = @($bars)[-1].Close
      $hit = if ($trig -lt $p0) { @($bars | Where-Object { $_.Low -le $trig }).Count -gt 0 } else { @($bars | Where-Object { $_.High -ge $trig }).Count -gt 0 }
      [pscustomobject]@{ Ticker = $e.ticker; Date = $e.date; Kind = if ($trig -lt $p0) { 'pullback' } else { 'breakout' }
        GapPct = [math]::Round(($trig / $p0 - 1) * 100, 2); Filled = $hit
        NowRetPct = [math]::Round(($last / $p0 - 1) * 100, 2); WaitRetPct = if ($hit) { [math]::Round(($last / $trig - 1) * 100, 2) } else { 0 } }
    } catch { }
  }
  if ($res) {
    Write-Host "=== Pending buys: did waiting pay? ==="
    $res | Group-Object Kind | ForEach-Object { $g = $_.Group
      [pscustomobject]@{ Kind = $_.Name; N = $g.Count; FillRate = '{0:P0}' -f (@($g | Where-Object Filled).Count / $g.Count)
        AvgGapPct = [math]::Round(($g | Measure-Object GapPct -Average).Average, 2)
        BuyNowAvgPct = [math]::Round(($g | Measure-Object NowRetPct -Average).Average, 2)
        WaitAvgPct = [math]::Round(($g | Measure-Object WaitRetPct -Average).Average, 2) } } | Format-Table -AutoSize
    Write-Host "BuyNowAvgPct above WaitAvgPct means waiting cost money (missed moves); below means waiting helped."
  }
}