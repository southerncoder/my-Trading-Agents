param(
    [string]$IpOrHost = '127.0.0.1',
    [string]$OutDir = "$PSScriptRoot\..\docker\certs",
    [System.Security.SecureString]$Password = $null,
    [string]$OpenSslPath = $null
)

# Ensure output directory exists
if (-not (Test-Path -Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

Write-Host "Generating self-signed certificate for $IpOrHost into $OutDir"

# Create cert in machine store (requires elevated privileges)
$cert = New-SelfSignedCertificate -DnsName $IpOrHost -CertStoreLocation Cert:\LocalMachine\My -NotAfter (Get-Date).AddYears(2) -KeyExportPolicy Exportable

# Export PFX (ask for password if not provided as SecureString)
$pfxPath = Join-Path $OutDir 'domain.pfx'
if ($null -eq $Password) {
    $pfxPwd = Read-Host -Prompt 'Enter password to protect PFX (input hidden)' -AsSecureString
} else {
    $pfxPwd = $Password
}
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pfxPwd | Out-Null

# Export certificate (CRT)
$crtPath = Join-Path $OutDir 'domain.crt'
Export-Certificate -Cert $cert -FilePath $crtPath | Out-Null

# Try to export private key using .NET APIs. This may not produce PEM; OpenSSL can convert from PFX if needed.
$keyPath = Join-Path $OutDir 'domain.key'
try {
    $bytes = $cert.PrivateKey.ExportPkcs8PrivateKey()
    [System.IO.File]::WriteAllBytes($keyPath, $bytes)
    Write-Host "Exported private key to $keyPath (PKCS#8 binary). Some tools expect PEM; use OpenSSL to convert if needed."
} catch {
    Write-Warning 'Could not export private key as PKCS#8. If you have OpenSSL, convert the PFX to PEM/key using: openssl pkcs12 -in domain.pfx -nocerts -nodes -out domain.key'
}

Write-Host "Certificate (CRT) at: $crtPath"
Write-Host "PFX at: $pfxPath"
Write-Host "If Docker Desktop does not trust this certificate for the registry host, import the CRT into ''Trusted Root Certification Authorities'' (Local Machine) and restart Docker Desktop."

# If OpenSSL is available, convert PFX to PEM files for Docker registry usage (domain.crt and domain.key)
try {
    # Selection order for OpenSSL executable:
    # 1) explicit $OpenSslPath parameter
    # 2) environment variables OPENSSL_BIN or OPENSSL_PATH
    # 3) repo-local relative ../..\Openssl/bin/openssl.exe
    # 4) system PATH
    $envCandidates = @($env:OPENSSL_BIN, $env:OPENSSL_PATH) | Where-Object { $_ -and $_ -ne '' }
    $opensslExe = $null

    if ($OpenSslPath) {
        if (Test-Path $OpenSslPath) { $opensslExe = (Resolve-Path $OpenSslPath).ProviderPath; Write-Host "Using OpenSSL from parameter: $opensslExe" }
        else { Write-Warning "Provided OpenSslPath does not exist: $OpenSslPath" }
    }

    if (-not $opensslExe -and $envCandidates.Count -gt 0) {
        foreach ($c in $envCandidates) {
            if (Test-Path $c) { $opensslExe = (Resolve-Path $c).ProviderPath; Write-Host "Using OpenSSL from environment variable: $opensslExe"; break }
        }
    }

    if (-not $opensslExe) {
        $preferredOpenSsl = Join-Path $PSScriptRoot "..\..\Openssl\bin\openssl.exe" | Resolve-Path -ErrorAction SilentlyContinue | ForEach-Object { $_.ProviderPath } 2>$null
        if ($preferredOpenSsl -and (Test-Path $preferredOpenSsl)) { $opensslExe = $preferredOpenSsl; Write-Host "Using repo-local OpenSSL: $opensslExe" }
    }

    if (-not $opensslExe) {
        $cmd = Get-Command openssl -ErrorAction SilentlyContinue
        if ($cmd) { $opensslExe = $cmd.Path; Write-Host "Using OpenSSL from PATH: $opensslExe" }
    }

    if ($null -ne $opensslExe) {
        Write-Host 'OpenSSL found — converting PFX to PEM (domain.key/domain.crt) using OpenSSL.'

        function SecureStringToPlainText($ss) {
            if ($null -eq $ss) { return '' }
            $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
            try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
        }

        $plainPwd = SecureStringToPlainText $pfxPwd

        # Use -passin pass:<password> — note: visible to process list briefly. Alternative is to use a temp file and pass file:filename
        $pemKeyPath = Join-Path $OutDir 'domain.key'
        & "$opensslExe" pkcs12 -in "$pfxPath" -clcerts -nokeys -out "$crtPath" -nodes -passin "pass:$plainPwd"
        & "$opensslExe" pkcs12 -in "$pfxPath" -nocerts -nodes -out "$pemKeyPath" -passin "pass:$plainPwd"
        Write-Host "Wrote PEM files: $crtPath and $pemKeyPath"
    } else {
        Write-Host 'OpenSSL not found. If you want automatic PEM output, install OpenSSL (see docker/install-openssl-windows.ps1 for a helper).'
    }
} catch {
    Write-Warning "OpenSSL conversion failed: $_"
}
