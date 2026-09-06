# Web API Security Setup Guide

## 🔒 Current Security Implementation

The TradingAgents Web API implements comprehensive security measures for local development and production deployment.

### ✅ Implemented Security Features

#### 1. CORS (Cross-Origin Resource Sharing)
- **Configured Origins**: Restricts API access to authorized domains
- **Development**: `http://localhost:3000`, `https://localhost:3000`
- **Production**: Configurable via `FRONTEND_URL` environment variable
- **Credentials Support**: Enabled for authenticated requests (future)

#### 2. Request Validation with Zod
- **Input Sanitization**: All request bodies validated against schemas
- **Type Safety**: TypeScript integration with runtime validation
- **Error Handling**: Structured error responses for invalid input

#### 3. Rate Limiting
- **API Rate Limit**: 100 requests per 15 minutes (production)
- **Analysis Rate Limit**: 10 analysis requests per 5 minutes (production)
- **Development Mode**: More lenient limits for development
- **IP-based Tracking**: Per-IP address rate limiting

#### 4. Security Headers (Helmet.js)
- **Content Security Policy**: Prevents XSS and code injection
- **HSTS**: HTTP Strict Transport Security for HTTPS
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Referrer Policy**: Controls referrer information leakage

#### 5. Input Security Validation
- **XSS Prevention**: Detects and blocks script injection attempts
- **SQL Injection Protection**: Prevents database injection attacks
- **Path Traversal Protection**: Blocks directory traversal attempts
- **Code Injection Prevention**: Detects malicious code patterns

#### 6. HTTPS Support
- **Local Development**: Self-signed certificates with mkcert
- **Production Ready**: Configurable HTTPS with proper certificates
- **Automatic Fallback**: Falls back to HTTP if certificates unavailable

## 🚀 Quick Setup

### 1. Basic Security (HTTP)
```bash
cd services/web-api
npm install
npm run dev
```

### 2. Secure Development (HTTPS)
```bash
# Generate local certificates
npm run generate-certs

# Start with HTTPS enabled
npm run dev:https
```

### 3. Production Deployment
```bash
# Build the application
npm run build

# Set production environment
export NODE_ENV=production
export HTTPS_ENABLED=true
export FRONTEND_URL=https://your-domain.com

# Start production server
npm run start:https
```

## 🔐 HTTPS Configuration

### Automatic Certificate Generation

#### Using mkcert (Recommended)
```bash
# Install mkcert
brew install mkcert          # macOS
choco install mkcert         # Windows
# See mkcert docs for Linux

# Generate certificates
npm run generate-certs
```

#### Using OpenSSL (Fallback)
```bash
# Manual certificate generation
openssl req -x509 -newkey rsa:4096 -keyout certs/api-key.pem -out certs/api-cert.pem \
  -days 365 -nodes -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1"
```

### Certificate Files
- `certs/api-cert.pem` - Server certificate
- `certs/api-key.pem` - Private key
- `certs/frontend-cert.pem` - Frontend certificate (if needed)
- `certs/frontend-key.pem` - Frontend private key (if needed)

### Environment Configuration
```bash
# Enable HTTPS
HTTPS_ENABLED=true

# Configure CORS for HTTPS
FRONTEND_URL=https://localhost:3000
CORS_ORIGIN=https://localhost:3000
```

## 🛡️ Security Configuration

### Environment Variables

#### Required Security Settings
```bash
# CORS Configuration
FRONTEND_URL=https://localhost:3000
ALLOWED_ORIGINS=https://localhost:3000,https://127.0.0.1:3000

# HTTPS Configuration
HTTPS_ENABLED=true

# Rate Limiting (optional - has defaults)
API_RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
API_RATE_LIMIT_MAX=100             # 100 requests per window
ANALYSIS_RATE_LIMIT_WINDOW_MS=300000  # 5 minutes
ANALYSIS_RATE_LIMIT_MAX=10         # 10 analysis requests per window
```

#### Development vs Production
```bash
# Development (.env.local)
NODE_ENV=development
HTTPS_ENABLED=true
FRONTEND_URL=https://localhost:3000

# Production
NODE_ENV=production
HTTPS_ENABLED=true
FRONTEND_URL=https://your-production-domain.com
```

### Security Headers Configuration

The API automatically applies comprehensive security headers:

```typescript
// Content Security Policy
"Content-Security-Policy": "default-src 'self'; script-src 'self'; ..."

// Security Headers
"X-Content-Type-Options": "nosniff"
"X-Frame-Options": "DENY"
"X-XSS-Protection": "1; mode=block"
"Referrer-Policy": "strict-origin-when-cross-origin"

// HTTPS Security (when HTTPS enabled)
"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
```

## 🔍 Security Monitoring

### Request Logging
All requests are logged with security information:
- IP address
- User agent
- Request method and URL
- Response status and timing
- Suspicious pattern detection

### Suspicious Activity Detection
The API monitors for:
- XSS injection attempts
- SQL injection patterns
- Directory traversal attempts
- Code injection attempts
- Unusual request patterns

### Security Alerts
```typescript
// Example security log entry
{
  "level": "warn",
  "message": "🚨 SECURITY WARNING: Suspicious request detected",
  "ip": "192.168.1.100",
  "method": "POST",
  "url": "/api/analysis",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "suspiciousPatterns": ["<script>", "eval("]
}
```

## 🧪 Security Testing

### Manual Security Testing
```bash
# Test rate limiting
for i in {1..20}; do curl -X POST http://localhost:3001/api/analysis/market; done

# Test input validation
curl -X POST http://localhost:3001/api/analysis/market \
  -H "Content-Type: application/json" \
  -d '{"symbol": "<script>alert(\"xss\")</script>"}'

# Test CORS
curl -X GET http://localhost:3001/api/health \
  -H "Origin: https://malicious-site.com"
```

### Automated Security Scanning
```bash
# Install security audit tools
npm install -g npm-audit-resolver
npm install -g snyk

# Run security audits
npm audit
snyk test

# Check for vulnerabilities
npm audit --audit-level moderate
```

## 🚨 Security Incident Response

### Immediate Actions
1. **Identify the threat**: Check logs for suspicious activity
2. **Block malicious IPs**: Update firewall rules if needed
3. **Review access logs**: Identify scope of potential breach
4. **Update security measures**: Patch vulnerabilities immediately

### Log Analysis
```bash
# Check for suspicious requests
grep "SECURITY WARNING" logs/application.log

# Analyze rate limiting triggers
grep "RATE_LIMIT_EXCEEDED" logs/application.log

# Review blocked origins
grep "ORIGIN_NOT_ALLOWED" logs/application.log
```

## 🔧 Troubleshooting

### Common Issues

#### HTTPS Certificate Errors
```
Error: ENOENT: no such file or directory, open 'certs/api-cert.pem'
```
**Solution**: Run `npm run generate-certs` to create certificates

#### CORS Errors
```
Access to fetch at 'http://localhost:3001/api/health' from origin 'http://localhost:3000' has been blocked by CORS policy
```
**Solution**: Add the origin to `ALLOWED_ORIGINS` environment variable

#### Rate Limiting Issues
```
{"success":false,"error":"Too many requests from this IP","code":"RATE_LIMIT_EXCEEDED"}
```
**Solution**: Wait for the rate limit window to reset, or adjust limits for development

#### Browser Security Warnings
**With mkcert**: No warnings (certificates are locally trusted)
**With OpenSSL**: Click "Advanced" → "Proceed to localhost"

### Debug Mode
```bash
# Enable debug logging
DEBUG=trading-agents:* npm run dev

# Check security configuration
curl -v http://localhost:3001/api/health
```

## 📋 Security Checklist

### Development Setup
- [ ] HTTPS certificates generated and working
- [ ] CORS configured for development origins
- [ ] Rate limiting tested and appropriate for development
- [ ] Security headers verified in browser dev tools
- [ ] Input validation tested with malicious payloads

### Production Deployment
- [ ] Production HTTPS certificates installed
- [ ] CORS configured for production domains only
- [ ] Rate limiting set to production values
- [ ] Security monitoring and logging enabled
- [ ] Regular security audits scheduled
- [ ] Incident response procedures documented

### Ongoing Maintenance
- [ ] Regular dependency updates for security patches
- [ ] Certificate renewal procedures in place
- [ ] Security log monitoring and alerting
- [ ] Periodic penetration testing
- [ ] Security training for development team

## 🔗 Additional Resources

- [OWASP Web Application Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)