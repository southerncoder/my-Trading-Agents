<#
.SYNOPSIS
  Measures decision stability: runs the analysis N times per ticker and summarizes the spread.

.DESCRIPTION
  Data is fetched live, so repeats made minutes apart see (nearly) the same inputs; the spread
  therefore mostly reflects model/prompt variance. Compare spreads before and after a prompt
  change, or between models. Logs go to logs/eval/<stamp>/.

.EXAMPLE
  .\tools\eval-decisions.ps1 -Tickers NVDA,AAPL -Repeats 3
  .\tools\eval-decisions.ps1 -Tickers KO,PG -Repeats 3 -ModelProfile cloud
#>
param(
  [string[]]$Tickers = @('NVDA', 'AAPL', 'MSFT'),
  [int]$Repeats = 3,
  [string]$Date = (Get-Date -Format yyyy-MM-dd),
  [string]$ModelProfile   # if set: apply this profile from tools/model-profiles.json and recreate the container
)

$root = Split-Path $PSScriptRoot -Parent
if ($ModelProfile) {
  . (Join-Path $PSScriptRoot 'model-profile.ps1')
  $prof = Use-ModelProfile -Name $ModelProfile
  Write-Host ('Profile {0}: fast={1} decision={2}' -f $prof.Profile, $prof.Fast, $prof.Decision)
  & (Join-Path $PSScriptRoot 'compose.ps1') up -d trading-agents | Out-Null
  Start-Sleep 15
}
$modelLabel = if ($env:PORTFOLIO_MANAGER_LLM_MODEL) { $env:PORTFOLIO_MANAGER_LLM_MODEL } else { $env:DEFAULT_LLM_MODEL }
$stamp = Get-Date -Format yyyyMMdd-HHmmss
$outDir = Join-Path $root "logs/eval/$stamp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$rows = @()

foreach ($t in $Tickers) {
  for ($i = 1; $i -le $Repeats; $i++) {
    $log = Join-Path $outDir "$t-$i.log"
    $sw = [Diagnostics.Stopwatch]::StartNew()
    & (Join-Path $PSScriptRoot 'compose.ps1') exec -T trading-agents sh -c "cd /app && node cli.js analyze $t $Date" *>&1 |
      Out-File -Encoding utf8 $log
    $sw.Stop()
    $text = Get-Content $log -Raw
    $m = [regex]::Match($text, 'Final trading decision:\s*(BUY|HOLD|SELL)\s*\(Confidence:\s*([0-9.]+)\)')
    $q = [regex]::Match($text, 'Data quality:[^\r\n]*').Value
    $am = [regex]::Matches($text, '\"action_now\"\s*:\s*\"([a-z_]+)\"'); $action = if ($am.Count) { $am[$am.Count - 1].Groups[1].Value } else { '' }
    $note = if ($text -match 'CONSISTENCY CHECK') { 'consistency-downgrade' } elseif ($text -match 'DATA QUALITY GUARD') { 'guard-hold' } else { '' }
    $rows += [pscustomobject]@{
      Ticker = $t; Run = $i; Profile = $ModelProfile; DecisionModel = $modelLabel; Variant = $env:PM_PROMPT_VARIANT; Action = $action
      Decision = if ($m.Success) { $m.Groups[1].Value } else { 'NONE' }
      Confidence = if ($m.Success) { [double]$m.Groups[2].Value } else { $null }
      Seconds = [int]$sw.Elapsed.TotalSeconds
      DataQuality = $q.Replace('Data quality: ', '')
      Note = $note
    }
    Write-Host ("{0} #{1}: {2} {3} ({4}s) {5}" -f $t, $i, $rows[-1].Decision, $rows[-1].Confidence, $rows[-1].Seconds, $note)
  }
}

$rows | Export-Csv -NoTypeInformation -Path (Join-Path $outDir 'runs.csv')
Write-Host "`n=== Stability summary ==="
$rows | Group-Object Ticker | ForEach-Object {
  $conf = @($_.Group | Where-Object { $null -ne $_.Confidence } | ForEach-Object { $_.Confidence })
  $mean = if ($conf.Count) { ($conf | Measure-Object -Average).Average } else { $null }
  $sd = if ($conf.Count -gt 1) { [math]::Sqrt((($conf | ForEach-Object { ($_ - $mean) * ($_ - $mean) } | Measure-Object -Sum).Sum) / ($conf.Count - 1)) } else { 0 }
  $decisions = ($_.Group | Group-Object Decision | ForEach-Object { "$($_.Name)x$($_.Count)" }) -join ' '
  [pscustomobject]@{
    Ticker = $_.Name; Decisions = $decisions
    Agree = (($_.Group | Group-Object Decision | Sort-Object Count -Descending | Select-Object -First 1).Count / $_.Count).ToString('P0')
    ConfMean = if ($null -ne $mean) { [math]::Round($mean, 2) } else { 'n/a' }
    ConfSD = [math]::Round($sd, 2)
  }
} | Format-Table -AutoSize
Write-Host "Runs and logs: $outDir"
