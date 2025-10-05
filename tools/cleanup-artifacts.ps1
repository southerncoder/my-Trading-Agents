<#
Cleanup build/test artifacts and transient result files.
Usage:
  pwsh -File scripts/cleanup-artifacts.ps1 [-WhatIf]
#>
param(
  [switch]$WhatIf
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$paths = @(
  'workflow-results.json',
  'secrets-scan-results.json',
  'secrets-scan-results.txt',
  'services/trading-agents/workflow-results.json',
  'services/zep_graphiti/integration_test_results.json',
  'performance-analysis-results.json',
  'performance-comparison-results.json'
)
# Expand additional patterns
$patterns = @('**/performance-analysis-results.json','**/performance-comparison-results.json')

$removed = @()
foreach ($rel in $paths) {
  $full = Join-Path $repoRoot $rel
  if (Test-Path $full) {
    if ($WhatIf) { Write-Host "Would remove $rel" -ForegroundColor Yellow }
    else { Remove-Item $full -ErrorAction SilentlyContinue; if (-not (Test-Path $full)) { $removed += $rel } }
  }
}
foreach ($pattern in $patterns) {
  Get-ChildItem -Path $repoRoot -Recurse -Filter (Split-Path $pattern -Leaf) -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($repoRoot.Length+1)
    if ($WhatIf) { Write-Host "Would remove $rel" -ForegroundColor Yellow }
    else { Remove-Item $_.FullName -ErrorAction SilentlyContinue; if (-not (Test-Path $_.FullName)) { $removed += $rel } }
  }
}

if (-not $WhatIf) {
  if ($removed.Count -gt 0) { Write-Host "Removed artifacts:"; $removed | ForEach-Object { Write-Host " - $_" } }
  else { Write-Host "No matching artifacts found." }
}
