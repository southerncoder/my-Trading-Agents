Param()
Set-StrictMode -Version Latest

# Lightweight staged-file scanner for Windows PowerShell
$forbiddenPatterns = @(
  'sk-[A-Za-z0-9_-]{16,}',
  'AKIA[0-9A-Z]{16,}',
  'ghp_[A-Za-z0-9_\\-]{10,}',
  '-----BEGIN PRIVATE KEY-----',
  'PRIVATE_KEY',
  'OPENAI_API_KEY'
)

$staged = git diff --cached --name-only --diff-filter=ACM
if (-not $staged) { exit 0 }

$failed = $false
foreach ($f in $staged -split "\r?\n") {
  try {
    git ls-files --error-unmatch -- $f > $null 2>&1
  } catch {
    continue
  }
  $content = git show :"$f" 2>$null
  if (-not $content) { continue }
  foreach ($pat in $forbiddenPatterns) {
    if ($content -match $pat) {
      Write-Host "[pre-commit] Forbidden token found in staged file: $f"
      $matchedLines = ($content -split '\r?\n') | Select-String -Pattern $pat -AllMatches
      $matchedLines | ForEach-Object { Write-Host "    $($_.LineNumber): $($_.Line)" }
      $failed = $true
    }
  }
}

if ($failed) {
  Write-Error "Commit aborted: remove or rotate secrets and retry."
  exit 1
}

exit 0
