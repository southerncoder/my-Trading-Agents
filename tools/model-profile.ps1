<#
.SYNOPSIS
  Dot-source to get Use-ModelProfile: sets the per-role LLM env vars from tools/model-profiles.json.

.EXAMPLE
  . .\tools\model-profile.ps1
  Use-ModelProfile -Name cloud
  Use-ModelProfile -Name hybrid -Decision 'some-other-model:cloud'   # one-off override
#>
function Use-ModelProfile {
  param(
    [string]$Name,
    [string]$Fast,
    [string]$Decision
  )
  $cfg = Get-Content (Join-Path $PSScriptRoot 'model-profiles.json') -Raw | ConvertFrom-Json
  if (-not $Name) { $Name = $cfg.default }
  $p = $cfg.profiles.$Name
  if (-not $p) { throw "Unknown model profile '$Name'. Known: $(($cfg.profiles.PSObject.Properties.Name) -join ', ')" }
  if (-not $Fast) { $Fast = $p.fast }
  if (-not $Decision) { $Decision = $p.decision }
  $env:DEFAULT_LLM_MODEL = $Fast; $env:QUICK_THINK_LLM = $Fast; $env:DEEP_THINK_LLM = $Decision
  $env:RESEARCH_MANAGER_LLM_MODEL = $Decision; $env:TRADER_LLM_MODEL = $Decision; $env:PORTFOLIO_MANAGER_LLM_MODEL = $Decision
  [pscustomobject]@{ Profile = $Name; Fast = $Fast; Decision = $Decision }
}
