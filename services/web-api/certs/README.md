# SSL Certificates Directory

This directory contains SSL certificates for local HTTPS development.

## 🔐 Certificate Generation

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
   mkcert -key-file api-key.pem -cert-file api-cert.pem localhost 127.0.0.1 ::1
   ```

### Manual Generation with OpenSSL (Fallback)

```bash
openssl req -x509 -newkey rsa:4096 -keyout api-key.pem -out api-cert.pem \
  -days 365 -nodes -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1"
```

## 🚀 Usage

1. Generate certificates (see above)
2. Set environment variable: `HTTPS_ENABLED=true`
3. Start the server: `npm run dev:https`
4. Access API at: `https://localhost:3001`

## 🔒 Security Notes

- **Local Development Only**: These certificates are for local development only
- **Never Commit**: Certificate files are git-ignored for security
- **Expiration**: Certificates expire in 365 days
- **Browser Warnings**: Self-signed certificates will show browser warnings (mkcert certificates are trusted)

## 📁 Expected Files

- `api-cert.pem` - API server certificate
- `api-key.pem` - API server private key
- `frontend-cert.pem` - Frontend certificate (if needed)
- `frontend-key.pem` - Frontend private key (if needed)

## 🔧 Troubleshooting

### Certificate Not Found Error
```
Error: ENOENT: no such file or directory, open 'certs/api-cert.pem'
```
**Solution**: Run `npm run generate-certs` to create certificates

### Browser Security Warning
**With mkcert**: No warnings (certificates are locally trusted)
**With OpenSSL**: Click "Advanced" → "Proceed to localhost"

### Node.js Certificate Error
```
Error: unable to verify the first certificate
```
**Solution**: Set `NODE_TLS_REJECT_UNAUTHORIZED=0` for development only (not recommended for production)