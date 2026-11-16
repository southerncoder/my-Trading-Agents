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
if (-not $scored) { Write-Host "Nothing old enough yet (need calls at least $MinDays days old)."; exit 0 }
Write-Host "`n=== By call ==="
$scored | Group-Object Label | ForEach-Object { [pscustomobject]@{ Call = $_.Name; N = $_.Count; AvgRetPct = [math]::Round(($_.Group | Measure-Object RetPct -Average).Average, 2); UpShare = '{0:P0}' -f (($_.Group | Where-Object RetPct -gt 0).Count / $_.Count) } } | Format-Table -AutoSize
Write-Host "=== By confidence band ==="
$scored | Group-Object Band | ForEach-Object { [pscustomobject]@{ Band = $_.Name; N = $_.Count; AvgRetPct = [math]::Round(($_.Group | Measure-Object RetPct -Average).Average, 2); UpShare = '{0:P0}' -f (($_.Group | Where-Object RetPct -gt 0).Count / $_.Count) } } | Format-Table -AutoSize