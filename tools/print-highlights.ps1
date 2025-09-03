# Print the first 20 high-risk matches from secrets-highlights.json with redaction
param()
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..') | Select-Object -ExpandProperty Path
$inPath = Join-Path $repoRoot 'secrets-highlights.json'
$outPath = Join-Path $repoRoot 'secrets-highlights-20.json'
if (-not (Test-Path $inPath)) { Write-Error "Input not found: $inPath"; exit 2 }
$j = Get-Content $inPath -Raw | ConvertFrom-Json
if (-not $j) { Write-Error "No JSON objects found in $inPath"; exit 3 }
$sel = $j | Select-Object -First 20
$results = @()
foreach ($item in $sel) {
    $path = $item.Path
    $line = $item.Line
    $match = $item.Match
    $context = $item.Context
    if ($match) {
        $redacted = ($match -replace '([A-Za-z0-9_\-]{4,})','[REDACTED]')
    } else {
        $redacted = '[REDACTED]'
    }
    $type = 'Potential secret'
    if ($match -and ($match -match 'AKIA')) { $type = 'AWS Access Key' }
    elseif ($match -and ($match -match 'sk-')) { $type = 'sk token' }
    elseif ($match -and ($match -match 'ghp_')) { $type = 'GitHub token' }
    elseif ( ($match -and $match -match 'BEGIN.*PRIVATE KEY') -or ($context -and $context -match 'BEGIN.*PRIVATE KEY') ) { $type = 'Private Key' }
    elseif ($match -and ($match -match 'AIza')) { $type = 'Google API key' }
    elseif ($match -and ($match -match 'ssh-rsa')) { $type = 'SSH key-like' }

    $results += [PSCustomObject]@{
        Path = $path
        Line = $line
        Type = $type
        Snippet = $redacted
        Context = ($context -replace '\r|\n',' ')
    }
}
$results | ConvertTo-Json -Depth 4 | Out-File $outPath -Encoding utf8
Write-Output "WROTE $outPath (count=$($results.Count))"
exit 0
