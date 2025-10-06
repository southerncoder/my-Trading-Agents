Local Docker Registry (dev)

This repository includes helper files to run a local Docker registry and push built images to it.

Start a local registry:

```cmd
cd D:\Code\PersonalDev\my-Trading-Agents
docker compose -f docker-compose.local.yml up -d
```

Build and push a service image (Windows cmd):

```cmd
cd services\finance-aggregator-service
scripts\build-and-push-local.cmd

cd services\news-aggregator-service
scripts\build-and-push-local.cmd
```

TLS and trusting the registry (recommended for LAN use)

The compose file now supports TLS. To use a registry accessible on your LAN (e.g., 192.168.1.10:5000), generate a self-signed certificate for the registry domain/ip and place the files under `docker/certs` as `domain.crt` and `domain.key`.

Example (PowerShell) - generate self-signed cert for 192.168.1.10:

```powershell
mkdir .\docker\certs
$ip = '192.168.1.10'
$cert = New-SelfSignedCertificate -DnsName $ip -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(1) -KeyExportPolicy Exportable
$pwd = ConvertTo-SecureString -String "changeit" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath .\docker\certs\domain.pfx -Password $pwd
# Extract key and cert (requires OpenSSL installed or use PowerShell to export)
openssl pkcs12 -in .\docker\certs\domain.pfx -nocerts -nodes -out .\docker\certs\domain.key -passin pass:changeit
openssl pkcs12 -in .\docker\certs\domain.pfx -clcerts -nokeys -out .\docker\certs\domain.crt -passin pass:changeit
```

Trust the certificate on your development machines (so Docker and browsers accept it):

- On Windows, import `domain.crt` into "Trusted Root Certification Authorities" (Local Machine). Docker Desktop will then accept pushes/pulls to `192.168.1.10:5000` without marking it insecure.
- On Linux/macOS, add the certificate to system trust stores (platform steps vary).

Start the registry bound to a LAN IP (replace 192.168.1.10 with your host IP):

```cmd
set LOCAL_REGISTRY_BIND=192.168.1.10
docker compose -f docker-compose.local.yml up -d
```

Notes

- The registry is served over TLS using the certs in `./docker/certs`.
- Do not expose this registry publicly without proper TLS + authentication.

CI / Remote registry failover

This repo includes a GitHub Actions workflow that builds images and pushes them to a registry. By default the workflow will push to `GHCR` when you configure `GHCR_REGISTRY` and the appropriate token in GitHub secrets.

To configure GHCR in your repo:

1. Create a Personal Access Token (PAT) or use GitHub Actions `GITHUB_TOKEN` with write packages permission.
2. Add a repository secret `GHCR_REGISTRY` set to `ghcr.io` and a secret for credentials (e.g., `GHCR_TOKEN`).
3. The workflow `.github/workflows/build-and-push.yml` will detect the secret and push to GHCR. If no registry secret is provided, it falls back to `localhost:5000` (useful for self-hosted runners).

This allows anyone cloning the public repo to either pull images from GHCR (public/organization images) or run the local registry and build images locally. It provides a safe failover path from local dev to a secure web registry.
