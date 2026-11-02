# SSL Certificates Directory

This directory contains SSL certificates for local HTTPS development of the web frontend.

## Certificate Generation

### Automatic Generation (Recommended)

```bash
# Linux/macOS
npm run generate-certs

# Windows PowerShell
npm run generate-certs:windows
```

### Manual Generation with mkcert (Recommended)

1. Install mkcert:
   ```bash
   # macOS
   brew install mkcert
   
   # Windows
   choco install mkcert
   
   # Linux
   # See: https://github.com/FiloSottile/mkcert#linux
   ```

2. Install the local CA:
   ```bash
   mkcert -install
   ```

3. Generate certificates:
   ```bash
   mkcert -key-file frontend-key.pem -cert-file frontend-cert.pem localhost 127.0.0.1 ::1
   ```

### Manual Generation with OpenSSL (Fallback)

```bash
openssl req -x509 -newkey rsa:4096 -keyout frontend-key.pem -out frontend-cert.pem \
  -days 365 -nodes -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1"
```

## Usage

1. Generate certificates (see above)
2. Set environment variable: `HTTPS_ENABLED=true`
3. Start the frontend: `npm run dev:https`
4. Access frontend at: `https://localhost:3000`

## Security Notes

- **Local Development Only**: These certificates are for local development only
- **Never Commit**: Certificate files are git-ignored for security
- **Expiration**: Certificates expire in 365 days
- **Browser Warnings**: Self-signed certificates will show browser warnings (mkcert certificates are trusted)

## Expected Files

- `frontend-cert.pem` - Frontend certificate
- `frontend-key.pem` - Frontend private key

## Troubleshooting

### Certificate Not Found Error
```
Error: ENOENT: no such file or directory, open 'certs/frontend-cert.pem'
```
**Solution**: Run `npm run generate-certs` to create certificates

### Browser Security Warning
**With mkcert**: No warnings (certificates are locally trusted)
**With OpenSSL**: Click "Advanced" → "Proceed to localhost"

### Vite HTTPS Error
```
Error: unable to load local CA certificate
```
**Solution**: Ensure certificates exist and have correct permissions