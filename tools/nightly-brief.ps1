<#
.SYNOPSIS
  Nightly brief data run: analyze the watchlist with the chosen model profile, add market data, write brief-data.json.

.DESCRIPTION
  1. Starts the trading-agents container with per-role models (small local model for the high-volume
     steps, larger local model for the Research Manager, Trader and Portfolio Manager).
  2. Runs tools/eval-decisions.ps1 once per ticker and parses the Portfolio Manager JSON from each log.
  3. Adds company name, price, trend, valuation and analyst data from the local yahoo-finance service.
  4. Writes logs/nightly/<date>/brief-data.json (and logs/nightly/latest.json).

  Paper analysis only. Takes about 2.5 minutes per ticker.

.EXAMPLE
  .\tools\nightly-brief.ps1 -Tickers NVDA,KO
#>
param(
  [string[]]$Tickers = @('NVDA','MSFT','GOOGL','AMZN','TSLA','PLTR','JPM','UNH','KO','WMT','XOM','CAT'),  # 12 names across sectors; pass -Tickers to change
  [string]$Date = (Get-Date -Format yyyy-MM-dd),
  [string]$YahooUrl = 'http://localhost:38402',
  [string]$ModelProfile,   # name from tools/model-profiles.json (default there)
  [string]$FastModel,      # optional one-off override
  [string]$DecisionModel,  # optional one-off override
  [string]$Adjustments = 'all'  # analysis adjustments: indicators,entrycheck,flat, all, or '' for none
)
$env:ANALYSIS_ADJUSTMENTS = $Adjustments
$ErrorActionPreference = 'Continue'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$outDir = Join-Path $root "logs/nightly/$Date"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Cut($s, $n) { if ($s) { $s = [string]$s; $s.Substring(0, [Math]::Min($n, $s.Length)) } else { '' } }
function Raw($v) { if ($null -eq $v) { return $null }; if ($v -is [psobject] -and $v.PSObject.Properties['raw']) { return $v.raw }; return $v }
function NormAction($v) {
  if (-not $v) { return '' }
  $s = ([string]$v).Trim().ToLower() -replace '[\s-]+', '_'
  if ($s -in 'enter_now','wait_for_trigger','hold_existing','reduce','exit') { return $s }
  if ($s -match 'trigger|pullback|dip|limit|on_|if_|pending|wait') { return 'wait_for_trigger' }
  if ($s -match 'partial|enter|buy|add|accumulate|initiate|short') { return 'enter_now' }
  if ($s -match 'trim|reduce|scale') { return 'reduce' }
  if ($s -match 'exit|sell|close|cover') { return 'exit' }
  if ($s -match 'hold|keep|maintain') { return 'hold_existing' }
  return ''
}
function CallLabel($d, $a) {
  if ($a -eq 'wait_for_trigger') { if ($d -eq 'SELL') { return 'Short if price reaches trigger' } else { return 'Buy if price reaches trigger' } }
  if ($d -eq 'BUY') { if ($a -eq 'hold_existing') { return 'Keep' } else { return 'Buy now' } }
  if ($d -eq 'SELL') { if ($a -eq 'reduce') { return 'Trim' } elseif ($a -eq 'enter_now') { return 'Short (bet price falls)' } else { return 'Exit' } }
  if ($a -eq 'hold_existing') { return 'Keep' } else { return 'Wait' }
}

# 1. Models come from tools/model-profiles.json (never hardcoded here).
. (Join-Path $PSScriptRoot 'model-profile.ps1')
$prof = Use-ModelProfile -Name $ModelProfile -Fast $FastModel -Decision $DecisionModel
Write-Host ('Profile {0}: fast={1} decision={2}' -f $prof.Profile, $prof.Fast, $prof.Decision)
& (Join-Path $PSScriptRoot 'compose.ps1') up -d | Out-Null
Start-Sleep 15
Write-Host "Models: PM=$(docker exec trading-agents-main printenv PORTFOLIO_MANAGER_LLM_MODEL) analysts=$(docker exec trading-agents-main printenv MARKET_ANALYST_LLM_MODEL)"

# 2. Analyze every ticker once.
$before = @(Get-ChildItem (Join-Path $root 'logs/eval') -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.Name })
& (Join-Path $PSScriptRoot 'eval-decisions.ps1') -Tickers $Tickers -Repeats 1 -Date $Date | Out-Host
$evalDir = Get-ChildItem (Join-Path $root 'logs/eval') -Directory | Where-Object { $before -notcontains $_.Name } | Sort-Object Name | Select-Object -Last 1
if (-not $evalDir) { Write-Error 'No eval output found'; exit 1 }

# 3. Parse decisions and add market data.
$rows = @()
foreach ($t in $Tickers) {
  $o = [ordered]@{ ticker = $t }
  $logPath = Join-Path $evalDir.FullName "$t-1.log"
  $text = if (Test-Path $logPath) { Get-Content $logPath -Raw } else { '' }
  $json = $null
  $ms = [regex]::Matches($text, '\{[^{}]*"decision"[^{}]*\}')
  if ($ms.Count) { try { $json = $ms[$ms.Count - 1].Value | ConvertFrom-Json } catch { $json = $null } }
  $fin = [regex]::Match($text, 'Final trading decision:\s*(BUY|HOLD|SELL)\s*\(Confidence:\s*([0-9.]+)\)')
  $d = if ($json) { ([string]$json.decision).ToUpper() } elseif ($fin.Success) { $fin.Groups[1].Value } else { 'HOLD' }
  $c = if ($json -and $json.confidence) { [double]$json.confidence } elseif ($fin.Success) { [double]$fin.Groups[2].Value } else { 0.3 }
  $a = if ($json) { NormAction $json.action_now } else { '' }
  $o['decision'] = $d; $o['confidence'] = $c; $o['action_now'] = $a; $o['label'] = CallLabel $d $a
  $o['why'] = Cut $json.rationale 140
  $o['top_risk'] = Cut (@($json.key_risks)[0]) 90
  $o['change_my_mind'] = Cut $json.what_would_change_my_mind 120
  $o['pm_raw'] = if ($json) { ($json | ConvertTo-Json -Compress -Depth 4) } else { $null }
  try {
    $q = (Invoke-RestMethod "$YahooUrl/api/quote/$t" -TimeoutSec 40).data
    $s = (Invoke-RestMethod "$YahooUrl/api/quote-summary/${t}?modules=assetProfile,financialData" -TimeoutSec 40).data
    $start = (Get-Date $Date).AddDays(-45).ToString('yyyy-MM-dd'); $end = (Get-Date $Date).AddDays(2).ToString('yyyy-MM-dd')
    $csv = Invoke-RestMethod "$YahooUrl/api/historical/${t}?startDate=$start&endDate=$end" -TimeoutSec 40
    $closes = @(); foreach ($l in ($csv -split "`n")) { if ($l -match '^\d{4}-\d\d-\d\d,') { $closes += [double](($l -split ',')[4]) } }
    $closes = @($closes | Select-Object -Last 30)
    $price = [double]$q.regularMarketPrice; $lo = [double]$q.fiftyTwoWeekLow; $hi = [double]$q.fiftyTwoWeekHigh
    $o['company'] = if ($q.displayName) { [string]$q.displayName } else { [string]$q.shortName }
    $o['price'] = [math]::Round($price, 2)
    $o['day_pct'] = [math]::Round([double]$q.regularMarketChangePercent, 2)
    $o['ret30_pct'] = if ($closes.Count -gt 1) { [math]::Round(($closes[-1] / $closes[0] - 1) * 100, 1) } else { 0 }
    $o['range_pos'] = if ($hi -gt $lo) { [math]::Round((($price - $lo) / ($hi - $lo)) * 100, 0) } else { 50 }
    $o['spark'] = ($closes | ForEach-Object { [math]::Round($_, 2) }) -join ','
    $o['market_cap_b'] = [math]::Round([double]$q.marketCap / 1e9, 0)
    $o['sector'] = [string]$s.assetProfile.sectorDisp; $o['industry'] = [string]$s.assetProfile.industryDisp
    $biz = [string]$s.assetProfile.longBusinessSummary; $first = ($biz -split '(?<=\.)\s')[0]
    $o['business'] = if ($first.Length -gt 170) { $first.Substring(0, 167) + '...' } else { $first }
    $o['pe'] = if ($q.trailingPE) { [math]::Round([double]$q.trailingPE, 1) } else { $null }
    $o['fwd_pe'] = if ($q.forwardPE) { [math]::Round([double]$q.forwardPE, 1) } else { $null }
    $o['ma50'] = [math]::Round([double]$q.fiftyDayAverage, 2); $o['ma200'] = [math]::Round([double]$q.twoHundredDayAverage, 2)
    $o['analyst'] = [string]$q.averageAnalystRating
    $tp = Raw $s.financialData.targetMeanPrice
    $o['target'] = if ($tp) { [math]::Round([double]$tp, 2) } else { $null }
    $o['div_yield'] = if ($q.dividendYield) { [math]::Round([double]$q.dividendYield, 2) } else { 0 }
    $o['hi52'] = $hi; $o['lo52'] = $lo
  } catch {
    Write-Warning "Market data failed for ${t}: $($_.Exception.Message)"
    if (-not $o.Contains('company')) { $o['company'] = $t }
  }
  $rows += [pscustomobject]$o
}

# Append-only decision ledger (data/ledger/decisions.jsonl): one line per ticker per night, kept in git so
# calls can be scored against later prices. Re-running the same date/ticker/profile replaces that line.
$ledgerDir = Join-Path $root 'data/ledger'; New-Item -ItemType Directory -Force -Path $ledgerDir | Out-Null
$ledgerFile = Join-Path $ledgerDir 'decisions.jsonl'
$keep = @(); if (Test-Path $ledgerFile) { $keep = @(Get-Content $ledgerFile | Where-Object { $_.Trim() }) }
# Stage-by-stage entry stance (where "wait for a trigger" comes from); best effort, needs python.
$trace = @{}
try {
  $traceFile = Join-Path $outDir 'stance.json'
  & python (Join-Path $PSScriptRoot 'trace-stance.py') $evalDir.FullName --json $traceFile | Out-Null
  if (Test-Path $traceFile) { foreach ($s in (Get-Content $traceFile -Raw | ConvertFrom-Json)) { $trace[$s.ticker] = $s } }
} catch { Write-Warning "Stance trace failed: $($_.Exception.Message)" }
$newKeys = @($rows | ForEach-Object { "$Date|$($_.ticker)|$($prof.Profile)" })
$keep = @($keep | Where-Object { $e = $_ | ConvertFrom-Json; "$($e.date)|$($e.ticker)|$($e.profile)" -notin $newKeys })
$lines = foreach ($r in $rows) {
  [ordered]@{
    date = $Date; ticker = $r.ticker; profile = $prof.Profile; adjustments = $Adjustments; fast_model = $prof.Fast; decision_model = $prof.Decision
    decision = $r.decision; confidence = $r.confidence; action_now = $r.action_now; label = $r.label
    price = $r.price; ma50 = $r.ma50; ma200 = $r.ma200; target = $r.target; range_pos = $r.range_pos
    pm = if ($r.pm_raw) { $r.pm_raw | ConvertFrom-Json } else { $null }
    stance = if ($trace[$r.ticker]) { [ordered]@{ market = $trace[$r.ticker].market; rm = $trace[$r.ticker].rm; trader = $trace[$r.ticker].trader; pm = $trace[$r.ticker].pm } } else { $null }
    trigger_price = if ($trace[$r.ticker]) { $trace[$r.ticker].trigger_price } else { $null }
  } | ConvertTo-Json -Compress -Depth 6
}
Set-Content -Path $ledgerFile -Value (@($keep) + @($lines)) -Encoding utf8
Write-Host "Ledger: $ledgerFile ($($keep.Count + @($lines).Count) lines)"
$file = Join-Path $outDir 'brief-data.json'
($rows | ConvertTo-Json -Depth 4) | Set-Content -Path $file -Encoding utf8
Copy-Item $file (Join-Path $root 'logs/nightly/latest.json') -Force
Write-Host "`nWrote $file ($($rows.Count) rows)"
$rows | Group-Object label | ForEach-Object { Write-Host ("  {0}: {1}" -f $_.Name, $_.Count) }
