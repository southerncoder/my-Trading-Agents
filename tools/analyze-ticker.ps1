<#
.SYNOPSIS
  The portfolio service's adapter to the agent pipeline: analyze one ticker, return the decision with its reasoning.

.DESCRIPTION
  Runs the full pipeline once in the trading-agents container (with whatever model profile it was last started
  with), reads the Portfolio Manager's decision with the same parser the nightly run uses, adds price, averages and
  analyst target from the local yahoo-finance service, and writes one JSON object in the decision-ledger shape.
  The log is kept in logs\eval\ondemand-<stamp>\<TICKER>-1.log.

.EXAMPLE
  .\tools\analyze-ticker.ps1 -Ticker NVDA -OutFile $env:TEMP\nvda.json
#>
param(
  [Parameter(Mandatory)][string]$Ticker,
  [string]$Date = (Get-Date -Format yyyy-MM-dd),
  [string]$YahooUrl = 'http://localhost:38402',
  [string]$OutFile
)
# Continue, not Stop: Windows PowerShell turns every stderr line of a native command (dotenv's banner, warnings)
# into an error record, and Stop would abort on the first one. Real failures are thrown explicitly below.
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot 'decision-parse.ps1')
$Ticker = $Ticker.Trim().ToUpper()
if ($Ticker -notmatch '^[A-Z][A-Z0-9.\-]{0,9}$') { throw "Not a stock symbol: $Ticker" }
$root = Split-Path $PSScriptRoot -Parent
$dir = Join-Path $root ("logs\eval\ondemand-" + (Get-Date -Format yyyyMMdd-HHmmss) + "-$Ticker")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$log = Join-Path $dir "$Ticker-1.log"

$sw = [Diagnostics.Stopwatch]::StartNew()
& (Join-Path $PSScriptRoot 'compose.ps1') exec -T trading-agents sh -c "cd /app && node cli.js analyze $Ticker $Date" *>&1 | Out-File -Encoding utf8 $log
$sw.Stop()
$text = Get-Content $log -Raw
if (-not $text -or $text -notmatch 'Final trading decision|"decision"') { throw "The analysis produced no decision (see $log)" }
$pmd = Read-PmDecision $text
$json = $pmd.Json

$price = $null; $ma50 = $null; $ma200 = $null; $target = $null
try {
  $q = (Invoke-RestMethod "$YahooUrl/api/quote/$Ticker" -TimeoutSec 40).data
  $price = [math]::Round([double]$q.regularMarketPrice, 2)
  if ($q.fiftyDayAverage) { $ma50 = [math]::Round([double]$q.fiftyDayAverage, 2) }
  if ($q.twoHundredDayAverage) { $ma200 = [math]::Round([double]$q.twoHundredDayAverage, 2) }
  $s = (Invoke-RestMethod "$YahooUrl/api/quote-summary/${Ticker}?modules=financialData" -TimeoutSec 40).data
  $tp = Raw $s.financialData.targetMeanPrice
  if ($tp) { $target = [math]::Round([double]$tp, 2) }
} catch { Write-Warning "Market data failed for ${Ticker}: $($_.Exception.Message)" }

# A trigger or walk-away far from the price is treated as a parsing mistake and dropped (same rule as the nightly run).
$trigger = if ($pmd.Action -eq 'wait_for_trigger') { Num $json.trigger_price } else { $null }
if ($trigger -and $price -and ($trigger -lt 0.5 * $price -or $trigger -gt 1.5 * $price)) { $trigger = $null }
$walk = Num $json.walk_away_price
if ($walk -and $price -and ($walk -lt 0.4 * $price -or $walk -gt 1.6 * $price)) { $walk = $null }
$ttype = $null
if ($trigger -and $price) { $ttype = if ($json.trigger_type -eq 'event') { 'event' } elseif ($trigger -ge $price) { 'breakout' } else { 'pullback' } }

$out = [ordered]@{
  date = $Date; ticker = $Ticker; group = 'on_demand'
  profile = 'container'; fast_model = $env:MARKET_ANALYST_LLM_MODEL; decision_model = $env:PORTFOLIO_MANAGER_LLM_MODEL
  decision = $pmd.Decision; confidence = $pmd.Confidence; action_now = $pmd.Action; label = $pmd.Label
  price = $price; ma50 = $ma50; ma200 = $ma200; target = $target
  pm = $json
  trigger_price = $trigger; trigger_type = $ttype; trigger_reason = (Cut $json.trigger_reason 140); walk_away = $walk
  seconds = [int]$sw.Elapsed.TotalSeconds
  log = $log
}
# Which models the container actually ran with (env of this shell may not be set).
try {
  $out.fast_model = (& docker exec trading-agents-main printenv MARKET_ANALYST_LLM_MODEL 2>$null)
  $out.decision_model = (& docker exec trading-agents-main printenv PORTFOLIO_MANAGER_LLM_MODEL 2>$null)
} catch { }
$jsonOut = $out | ConvertTo-Json -Depth 8 -Compress
if ($OutFile) { [IO.File]::WriteAllText($OutFile, $jsonOut, (New-Object Text.UTF8Encoding($false))) }
$jsonOut
