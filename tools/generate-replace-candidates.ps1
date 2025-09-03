param()
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..') | Select-Object -ExpandProperty Path
$inPath = Join-Path $repoRoot 'secrets-triage.json'
$outPath = Join-Path $repoRoot 'tools\replace-candidates.json'
if (-not (Test-Path $inPath)) { Write-Error "Not found: $inPath"; exit 2 }
$j = Get-Content $inPath -Raw | ConvertFrom-Json
$cands = @()
foreach ($i in $j) {
    $ctx = $i.Context
    $snip = $i.Snippet
    if (($snip -and $snip -match 'sk-|AKIA|ghp_|AIza|PRIVATE_KEY') -or ($ctx -and $ctx -match 'sk-|AKIA|ghp_|AIza|PRIVATE_KEY')) {
        $cands += [PSCustomObject]@{
            Path = $i.Path
            Line = $i.Line
            Type = $i.Type
            Severity = $i.Severity
            Context = ($ctx -replace '\r|\n',' ')
            Snippet = $snip
        }
    }
}
$cands | ConvertTo-Json -Depth 6 | Out-File $outPath -Encoding utf8
Write-Output "WROTE $outPath (count=$($cands.Count))"
exit 0
