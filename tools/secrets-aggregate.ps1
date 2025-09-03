param()

# Aggregation script for secrets-scan-results.json
# Writes two files to the repository root:
# - secrets-top-files.txt (top 30 files by match count)
# - secrets-highlights.json (high-risk matches)

try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    $repoRoot = Resolve-Path (Join-Path $scriptDir '..') | Select-Object -ExpandProperty Path
    $jsonPath = Join-Path $repoRoot 'secrets-scan-results.json'

    if (-not (Test-Path $jsonPath)) {
        Write-Error "Input file not found: $jsonPath"
        exit 2
    }

    Write-Output "Reading $jsonPath"
    $j = Get-Content $jsonPath -Raw | ConvertFrom-Json

    if (-not $j) {
        Write-Error "No JSON objects found in $jsonPath"
        exit 3
    }

    # Top files by match count
    $top = $j | Group-Object Path | Sort-Object Count -Descending | Select-Object -First 30
    $topOutPath = Join-Path $repoRoot 'secrets-top-files.txt'
    $top | ForEach-Object { "{0}`t{1}" -f $_.Count, $_.Name } | Out-File $topOutPath -Encoding utf8
    Write-Output "WROTE $topOutPath"

    # High-risk patterns (private keys, known token formats, API keys)
    $patterns = @(
        '-----BEGIN (RSA )?PRIVATE KEY-----',
        '-----BEGIN OPENSSH PRIVATE KEY-----',
        '-----BEGIN PRIVATE KEY-----',
        'PRIVATE_KEY',
        'SECRET_KEY',
        'AKIA[0-9A-Z]{16}',
        'sk-[A-Za-z0-9_\-]{20,}',
        'ghp_[A-Za-z0-9]{36}',
        'AIza[0-9A-Za-z_\-]{35}',
        'ssh-rsa AAAA[0-9A-Za-z+/=]{100,}',
        '-----BEGIN CERTIFICATE-----',
        'aws_secret_access_key',
        'password\s*[:=]\s*[^\s\r\n]+'
    )

    $high = $j | Where-Object {
        $found = $false
        foreach ($p in $patterns) {
            if ( ($_.'Match' -ne $null -and ($_.'Match' -match $p)) -or ($_.'Context' -ne $null -and ($_.'Context' -match $p)) ) {
                $found = $true
                break
            }
        }
        $found
    }

    $highOutPath = Join-Path $repoRoot 'secrets-highlights.json'
    $high | ConvertTo-Json -Depth 6 | Out-File $highOutPath -Encoding utf8
    Write-Output "WROTE $highOutPath (found $($high.Count) matches)"

    exit 0
}
catch {
    Write-Error "Aggregation failed: $_"
    exit 1
}
