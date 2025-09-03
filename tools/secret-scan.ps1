# Recursively search repository files for secret-like patterns, excluding node_modules and .git
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\secret-scan.ps1

$repoRoot = Split-Path -Parent $PSScriptRoot
$patterns = @(
    'AKIA[A-Z0-9]{16}',
    'BEGIN RSA PRIVATE KEY',
    'BEGIN PRIVATE KEY',
    'OPENAI_API_KEY',
    'NPM_TOKEN',
    'GITHUB_TOKEN',
    'PASSWORD',
    'PRIVATE_KEY',
    '-----BEGIN'
)

$excludeDirs = @('node_modules', '.git', '.venv', '.venv*', 'env', '.env', 'dist', 'build')

Write-Output "Starting secret scan at $repoRoot"

$MaxDepth = 6

# Only include files with these extensions or sensitive filenames to reduce noise and run-time
$allowedExt = @('.env','.json','.yaml','.yml','.py','.js','.ts','.ps1','.sh','.pem','.key','.txt','.md','.xml','.ini','.config','.properties')
$allowedNames = @('package.json','.env','docker-compose.yml')

# Enumerate files but skip excluded directories early for performance
$files = Get-ChildItem -Path $repoRoot -Recurse -File -Force -ErrorAction SilentlyContinue | Where-Object {
    $skip = $false
    foreach ($ex in $excludeDirs) {
        if ($_.FullName -match [regex]::Escape('\' + $ex + '\')) { $skip = $true; break }
    }
    if ($skip) { return $false }
    # Optional depth limit
    if ($MaxDepth -gt 0) {
        $rel = $_.FullName.Substring($repoRoot.Length).TrimStart('\')
        if ($rel -eq '') { return $true }
        $depth = ($rel -split '\\').Count
        if ($depth -gt $MaxDepth) { return $false }
    }
    $ext = $_.Extension.ToLower()
    $name = $_.Name.ToLower()
    if ($allowedExt -contains $ext -or $allowedNames -contains $name) { return $true }
    return $false
}

$results = @()

foreach ($file in $files) {
    try {
        $text = Get-Content -LiteralPath $file.FullName -ErrorAction Stop -Raw
    } catch {
        continue
    }
    if ([string]::IsNullOrEmpty($text)) {
        continue
    }

    foreach ($pat in $patterns) {
        try {
            $regexMatches = [regex]::Matches($text, $pat)
        } catch {
            continue
        }
        foreach ($m in $regexMatches) {
            $lineNumber = ($text.Substring(0, $m.Index) -split "\r?\n").Count
            $results += [PSCustomObject]@{
                Path = $file.FullName
                Line = $lineNumber
                Match = $m.Value
                Context = ($text -split "\r?\n")[($lineNumber-1)]
            }
        }
    }
}

# Write both a human readable text file and a machine readable JSON file (filtered)
$outFileTxt = Join-Path $repoRoot 'secrets-scan-results.txt'
$outFileJson = Join-Path $repoRoot 'secrets-scan-results.json'

# Filtered results (exclude noisy paths)
$filtered = $results | Where-Object { $false -eq ($_.Path -match '\\.venv\\\b|\\.venv|\\.venv\\*|\\\benv\\\b|\\.env\\b|\\bdist\\b|\\bbuild\\b') }

if ($filtered.Count -eq 0) {
    "No matches found (after filtering)." | Out-File -FilePath $outFileTxt -Encoding utf8
    @() | ConvertTo-Json | Out-File -FilePath $outFileJson -Encoding utf8
    Write-Output "No matches found after filtering. Results written to $outFileTxt and $outFileJson"
} else {
    $filtered | Sort-Object Path, Line | Format-Table -AutoSize | Out-String | Out-File -FilePath $outFileTxt -Encoding utf8
    $filtered | Sort-Object Path, Line | ConvertTo-Json -Depth 5 | Out-File -FilePath $outFileJson -Encoding utf8
    Write-Output "Found $($filtered.Count) matches (after filtering). Results written to $outFileTxt and $outFileJson"
}
