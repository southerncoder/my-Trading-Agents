<#
.SYNOPSIS
  Nightly brief data run: analyze the watchlist with the chosen model profile, add market data, write brief-data.json.

.DESCRIPTION
  1. Starts the trading-agents container with per-role models (small local model for the high-volume
     steps, larger local model for the Research Manager, Trader and Portfolio Manager).
  2. Runs tools/eval-decisions.ps1 once per ticker and parses the Portfolio Manager JSON from each log.
  3. Adds company name, price, trend, valuation and analyst data from the local yahoo-finance service.
  4. Writes logs/nightly/<date>/brief-data.json (and logs/nightly/latest.json).

  Two rounds: the core watchlist and a second list of household brands under $50 (-BrandTickers).
  5. Builds logs/nightly/<date>/brief.html, a self-contained page with trigger cards.

  Paper analysis only. Takes about 2.5 minutes per ticker on the local models.

.EXAMPLE
  .\tools\nightly-brief.ps1 -Tickers NVDA,KO
#>
param(
  [string[]]$Tickers = @('NVDA','MSFT','GOOGL','AMZN','TSLA','PLTR','JPM','UNH','KO','WMT','XOM','CAT'),  # 12 names across sectors; pass -Tickers to change
  # Second round: household brands under $50 a share, each picked because it teaches something. Pass @() to skip.
  [string[]]$BrandTickers = @('F','T','PFE','NKE','SNAP','CCL','AAL','SOFI','RIVN','KHC','GME','M'),
  [string]$Date = (Get-Date -Format yyyy-MM-dd),
  [string]$YahooUrl = 'http://localhost:38402',
  [string]$ModelProfile,   # name from tools/model-profiles.json (default there)
  [string]$FastModel,      # optional one-off override
  [string]$DecisionModel,  # optional one-off override
  [string]$Adjustments = 'all',  # analysis adjustments: indicators,entrycheck,flat, all, or '' for none
  [string]$ReuseEvalDir     # rebuild data and page from an earlier run's logs (e.g. logs\eval\20261116-164247) without re-running the models
)
. (Join-Path $PSScriptRoot 'watchlist.ps1')
# The stock lists come from tools\watchlist.json unless -Tickers / -BrandTickers are passed.
$wl = Get-Watchlist -Date $Date
if ($wl) {
  if (-not $PSBoundParameters.ContainsKey('Tickers')) { $Tickers = @($wl.Core) }
  if (-not $PSBoundParameters.ContainsKey('BrandTickers')) { $BrandTickers = @($wl.Brands) }
  if ($wl.Skipped.Count) { Write-Host "Not running tonight (paused or off-day): $($wl.Skipped -join ', ')" }
}
$env:ANALYSIS_ADJUSTMENTS = $Adjustments
$groupOf = @{}; foreach ($x in $BrandTickers) { $groupOf[$x] = 'brands' }; foreach ($x in $Tickers) { $groupOf[$x] = 'core' }
$Tickers = @(@($Tickers) + @($BrandTickers) | Where-Object { $_ } | Select-Object -Unique)
# What each brand is on the list to teach (shown on the page).
$lessons = @{
  F = 'Cyclical business: profits swing with the economy, and the dividend depends on them.'
  T = 'Dividend versus debt: a big payout is only as safe as the cash left after interest.'
  PFE = 'Patent cliff: what happens to a drug maker when its best sellers lose protection.'
  NKE = 'Fallen giant: a great brand is not the same thing as a great stock.'
  SNAP = 'Ad-dependent and volatile: one revenue source, big swings on every earnings report.'
  CCL = 'Heavy debt after a crisis: recovery in sales does not mean recovery for shareholders.'
  AAL = 'Airlines: thin margins, fuel costs and the economy decide the year.'
  SOFI = 'Growth fintech: sensitive to interest rates and to promises about future profit.'
  RIVN = 'Cash burn: a company spending more than it makes lives on its remaining cash.'
  KHC = 'Value or value trap: a low price and a high dividend can both be warnings.'
  GME = 'Sentiment stock: the crowd, not the business, often moves the price.'
  M = 'Retail in decline: cheap can stay cheap when the business keeps shrinking.'
}
if ($wl) { foreach ($k in $wl.Lessons.Keys) { $lessons[$k] = $wl.Lessons[$k] } }
function Num($v) { if ($null -eq $v) { return $null }; $s = ([string]$v) -replace '[^0-9.\-]', ''; $n = 0.0; if ($s -and [double]::TryParse($s, [ref]$n)) { return $n }; return $null }
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
if ($ReuseEvalDir) {
  $evalDir = Get-Item (Resolve-Path $ReuseEvalDir)
  Write-Host "Reusing analysis logs from $($evalDir.FullName) (no model calls)"
} else {
Write-Host ('Profile {0}: fast={1} decision={2}' -f $prof.Profile, $prof.Fast, $prof.Decision)
& (Join-Path $PSScriptRoot 'compose.ps1') up -d | Out-Null
Start-Sleep 15
Write-Host "Models: PM=$(docker exec trading-agents-main printenv PORTFOLIO_MANAGER_LLM_MODEL) analysts=$(docker exec trading-agents-main printenv MARKET_ANALYST_LLM_MODEL)"

# 2. Analyze every ticker once.
$before = @(Get-ChildItem (Join-Path $root 'logs/eval') -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.Name })
& (Join-Path $PSScriptRoot 'eval-decisions.ps1') -Tickers $Tickers -Repeats 1 -Date $Date | Out-Host
$evalDir = Get-ChildItem (Join-Path $root 'logs/eval') -Directory | Where-Object { $before -notcontains $_.Name } | Sort-Object Name | Select-Object -Last 1
}
if (-not $evalDir) { Write-Error 'No eval output found'; exit 1 }

# 3. Parse decisions and add market data.
# The most recent earlier call per ticker, to show whether the price moved toward or away from the trigger.
$prevCall = @{}
$ledgerPath = Join-Path $root 'data/ledger/decisions.jsonl'
if (Test-Path $ledgerPath) {
  Get-Content $ledgerPath | Where-Object { $_.Trim() } | ForEach-Object { try { $_ | ConvertFrom-Json } catch { } } |
    Where-Object { $_.date -lt $Date } | Sort-Object date | ForEach-Object { $prevCall[$_.ticker] = $_ }
}
$rows = @()
foreach ($t in $Tickers) {
  $o = [ordered]@{ ticker = $t }
  $logPath = Join-Path $evalDir.FullName "$t-1.log"
  $text = if (Test-Path $logPath) { Get-Content $logPath -Raw } else { '' }
  $json = $null
  $ms = [regex]::Matches($text, '\{[^{}]*"decision"[^{}]*\}')
  # Models sometimes write LaTeX-style escapes (\%) inside the JSON; strip them or the whole block is lost.
  if ($ms.Count) { try { $json = ($ms[$ms.Count - 1].Value -replace '\\(?!["\\/bfnrtu])', '') | ConvertFrom-Json } catch { $json = $null } }
  $fin = [regex]::Match($text, 'Final trading decision:\s*(BUY|HOLD|SELL)\s*\(Confidence:\s*([0-9.]+)\)')
  $d = if ($json) { ([string]$json.decision).ToUpper() } elseif ($fin.Success) { $fin.Groups[1].Value } else { 'HOLD' }
  $c = if ($json -and $json.confidence) { [double]$json.confidence } elseif ($fin.Success) { [double]$fin.Groups[2].Value } else { 0.3 }
  $a = if ($json) { NormAction $json.action_now } else { '' }
  $o['decision'] = $d; $o['confidence'] = $c; $o['action_now'] = $a; $o['label'] = CallLabel $d $a
  $o['why'] = Cut $json.rationale 140
  $o['top_risk'] = Cut (@($json.key_risks)[0]) 90
  $o['change_my_mind'] = Cut $json.what_would_change_my_mind 120
  $o['pm_raw'] = if ($json) { ($json | ConvertTo-Json -Compress -Depth 4) } else { $null }
  $o['group'] = $groupOf[$t]; if ($lessons[$t] -and $groupOf[$t] -eq 'brands') { $o['lesson'] = $lessons[$t] }
  $o['why_full'] = Cut $json.rationale 420
  $o['risks'] = @(@($json.key_risks) | Where-Object { $_ } | Select-Object -First 3 | ForEach-Object { Cut $_ 110 })
  $o['trigger_price'] = if ($a -eq 'wait_for_trigger') { Num $json.trigger_price } else { $null }
  $o['trigger_type'] = if ($json.trigger_type) { ([string]$json.trigger_type).ToLower() } else { $null }
  $o['trigger_reason'] = Cut $json.trigger_reason 140
  $o['walk_away'] = Num $json.walk_away_price
  try {
    $q = (Invoke-RestMethod "$YahooUrl/api/quote/$t" -TimeoutSec 40).data
    $s = (Invoke-RestMethod "$YahooUrl/api/quote-summary/${t}?modules=assetProfile,financialData" -TimeoutSec 40).data
    $start = (Get-Date $Date).AddDays(-45).ToString('yyyy-MM-dd'); $end = (Get-Date $Date).AddDays(2).ToString('yyyy-MM-dd')
    # Price history on its own: if it fails, the quote-based numbers (price, trigger gap) still go on the page.
    $csv = try { Invoke-RestMethod "$YahooUrl/api/historical/${t}?startDate=$start&endDate=$end" -TimeoutSec 40 } catch { Write-Warning "Price history failed for ${t}: $($_.Exception.Message)"; '' }
    $closes = @(); $bars = @(); $dates = @()
    foreach ($l in ($csv -split "`n")) { if ($l -match '^\d{4}-\d\d-\d\d,') { $c = $l -split ','; $closes += [double]$c[4]; $dates += $c[0]; $bars += , @([double]$c[2], [double]$c[3], [double]$c[4]) } }
    # ATR(14): the average daily range, used to say how many "typical days" away a trigger is.
    $trs = @(); for ($i = 1; $i -lt $bars.Count; $i++) { $trs += [math]::Max($bars[$i][0] - $bars[$i][1], [math]::Max([math]::Abs($bars[$i][0] - $bars[$i - 1][2]), [math]::Abs($bars[$i][1] - $bars[$i - 1][2]))) }
    $atr = if ($trs.Count -ge 14) { ($trs | Select-Object -Last 14 | Measure-Object -Average).Average } else { $null }
    $closes = @($closes | Select-Object -Last 30)
    $price = [double]$q.regularMarketPrice; $lo = [double]$q.fiftyTwoWeekLow; $hi = [double]$q.fiftyTwoWeekHigh
    $o['company'] = if ($q.displayName) { [string]$q.displayName } else { [string]$q.shortName }
    $o['price'] = [math]::Round($price, 2)
    $o['day_pct'] = [math]::Round([double]$q.regularMarketChangePercent, 2)
    $o['ret30_pct'] = if ($closes.Count -gt 1) { [math]::Round(($closes[-1] / $closes[0] - 1) * 100, 1) } else { 0 }
    $o['range_pos'] = if ($hi -gt $lo) { [math]::Round((($price - $lo) / ($hi - $lo)) * 100, 0) } else { 50 }
    $o['spark'] = ($closes | ForEach-Object { [math]::Round($_, 2) }) -join ','
    $o['spark_dates'] = (@($dates | Select-Object -Last 30)) -join ','
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
    $o['atr'] = if ($atr) { [math]::Round($atr, 2) } else { $null }
    # Trigger card numbers. A trigger far from the price is treated as a parsing mistake and dropped.
    $tp = $o['trigger_price']
    if ($tp -and $price -and ($tp -lt 0.5 * $price -or $tp -gt 1.5 * $price)) { $tp = $null; $o['trigger_price'] = $null }
    if ($o['walk_away'] -and $price -and ($o['walk_away'] -lt 0.4 * $price -or $o['walk_away'] -gt 1.6 * $price)) { $o['walk_away'] = $null }
    if ($tp -and $price) {
      if ($o['trigger_type'] -ne 'event') { $o['trigger_type'] = if ($tp -ge $price) { 'breakout' } else { 'pullback' } }
      $o['trigger_gap_pct'] = [math]::Round(($tp / $price - 1) * 100, 2)
      if ($atr) { $o['trigger_days'] = [math]::Round([math]::Abs($tp - $price) / $atr, 1) }
      $pv = $prevCall[$t]
      if ($pv -and $pv.price) {
        $o['prev_date'] = $pv.date; $o['prev_price'] = $pv.price; $o['prev_trigger'] = $pv.trigger_price
        $was = [math]::Abs($tp - [double]$pv.price); $now = [math]::Abs($tp - $price)
        $o['trigger_trend'] = if ($now -lt $was * 0.98) { 'closer' } elseif ($now -gt $was * 1.02) { 'farther' } else { 'same' }
      }
    } elseif ($a -ne 'wait_for_trigger') { $o['trigger_type'] = $null; $o['trigger_reason'] = '' }
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
    date = $Date; ticker = $r.ticker; group = $r.group; profile = $prof.Profile; adjustments = $Adjustments; fast_model = $prof.Fast; decision_model = $prof.Decision
    decision = $r.decision; confidence = $r.confidence; action_now = $r.action_now; label = $r.label
    price = $r.price; ma50 = $r.ma50; ma200 = $r.ma200; target = $r.target; range_pos = $r.range_pos
    pm = if ($r.pm_raw) { $r.pm_raw | ConvertFrom-Json } else { $null }
    stance = if ($trace[$r.ticker]) { [ordered]@{ market = $trace[$r.ticker].market; rm = $trace[$r.ticker].rm; trader = $trace[$r.ticker].trader; pm = $trace[$r.ticker].pm } } else { $null }
    trigger_price = $r.trigger_price; trigger_type = $r.trigger_type; trigger_reason = $r.trigger_reason; walk_away = $r.walk_away; atr = $r.atr
  } | ConvertTo-Json -Compress -Depth 6
}
Set-Content -Path $ledgerFile -Value (@($keep) + @($lines)) -Encoding utf8
Write-Host "Ledger: $ledgerFile ($($keep.Count + @($lines).Count) lines)"
$file = Join-Path $outDir 'brief-data.json'
($rows | ConvertTo-Json -Depth 4) | Set-Content -Path $file -Encoding utf8
# Full transcript per stock (every analyst, the debate, the plan, the risk voices, the final memo) for the page.
try { & python (Join-Path $PSScriptRoot 'extract-pipeline.py') $evalDir.FullName (Join-Path $outDir 'pipeline.json') | Out-Null } catch { Write-Warning "Transcript extract failed: $($_.Exception.Message)" }
# Data for the viewer page (logs/nightly/latest.html, written once); best effort, needs python.
try { & python (Join-Path $PSScriptRoot 'build-brief-page.py') $file $Date | Out-Host } catch { Write-Warning "Page data build failed: $($_.Exception.Message)" }
Copy-Item $file (Join-Path $root 'logs/nightly/latest.json') -Force
Write-Host "Page: $(Join-Path $root 'logs\nightly\latest.html') (opens the newest night; older nights from its picker)"
Write-Host "`nWrote $file ($($rows.Count) rows)"
$rows | Group-Object label | ForEach-Object { Write-Host ("  {0}: {1}" -f $_.Name, $_.Count) }
