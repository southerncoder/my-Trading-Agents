# 🔒 TradingAgents Security Implementation

## Overview

This document outlines the comprehensive security measures implemented in the TradingAgents web application to protect against common web vulnerabilities and ensure the safety of financial trading data.

## 🛡️ Security Headers Implemented

### Frontend (Nginx)

#### Content Security Policy (CSP)
```
Content-Security-Policy: default-src 'self'; 
  script-src 'self'; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
  font-src 'self' https://fonts.gstatic.com; 
  img-src 'self' data: https:; 
  connect-src 'self' ws://localhost:3001 wss://localhost:3001; 
  frame-ancestors 'none'; 
  base-uri 'self'; 
  form-action 'self';
```

#### Frame Protection
```
X-Frame-Options: DENY
```
- **Purpose**: Prevents clickjacking attacks by blocking iframe embedding
- **Impact**: Application cannot be embedded in other websites

#### MIME Type Protection
```
X-Content-Type-Options: nosniff
```
- **Purpose**: Prevents MIME type sniffing attacks
- **Impact**: Browsers must respect declared content types

#### XSS Protection
```
X-XSS-Protection: 1; mode=block
```
- **Purpose**: Enables browser XSS filtering (legacy browsers)
- **Impact**: Blocks pages when XSS attacks are detected

#### Referrer Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
- **Purpose**: Controls referrer information sent with requests
- **Impact**: Limits information leakage to external sites

#### Permissions Policy
```
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), encrypted-media=(), fullscreen=(self), picture-in-picture=()
```
- **Purpose**: Restricts browser API access
- **Impact**: Prevents unauthorized access to device features

### Backend (Express.js)

#### Rate Limiting
- **API Endpoints**: 100 requests per 15 minutes (production)
- **Analysis Endpoints**: 10 requests per 5 minutes (production)
- **Development**: More lenient limits for testing

#### Input Validation
- **XSS Protection**: Blocks script injection attempts
- **SQL Injection**: Prevents database manipulation
- **Path Traversal**: Blocks directory traversal attacks
- **Code Injection**: Prevents eval() and function injection

#### CORS Configuration
- **Allowed Origins**: Restricted to configured domains only
- **Methods**: Limited to necessary HTTP methods
- **Headers**: Controlled allowed headers
- **Credentials**: Enabled for authenticated requests

## 🚨 Threat Protection

### 1. Cross-Site Scripting (XSS)
**Protection Methods:**
- Strict Content Security Policy
- Input validation and sanitization
- Output encoding
- X-XSS-Protection header

**Implementation:**
```typescript
// Input validation middleware
const checkForMaliciousContent = (obj: any): boolean => {
  // Checks for script tags, javascript: URLs, event handlers
  return securityPatterns.xss.some(pattern => pattern.test(obj))
}
```

### 2. Clickjacking
**Protection Methods:**
- X-Frame-Options: DENY
- CSP frame-ancestors 'none'

**Implementation:**
```nginx
add_header X-Frame-Options "DENY" always;
```

### 3. SQL Injection
**Protection Methods:**
- Input validation patterns
- Parameterized queries (when database is added)
- Request sanitization

**Implementation:**
```typescript
// SQL injection pattern detection
sqlInjection: [
  /union.*select/gi,
  /insert.*into/gi,
  /delete.*from/gi,
  // ... more patterns
]
```

### 4. Cross-Site Request Forgery (CSRF)
**Protection Methods:**
- SameSite cookie attributes
- Origin validation
- CORS restrictions

### 5. Information Disclosure
**Protection Methods:**
- Server header removal
- Error message sanitization
- Cache control headers
- No-index meta tags

**Implementation:**
```typescript
// Remove server information
res.removeHeader('X-Powered-By')
res.removeHeader('Server')
res.setHeader('Server', 'TradingAgents-Web')
```

## 🔐 Environment-Specific Security

### Development Environment
- **Rate Limits**: More lenient (1000 requests/minute)
- **HSTS**: Disabled (no HTTPS requirement)
- **CSP**: Includes localhost WebSocket connections
- **Logging**: Verbose security logging

### Production Environment
- **Rate Limits**: Strict (100 requests/15min)
- **HSTS**: Enabled with preload
- **CSP**: Strict policy with upgrade-insecure-requests
- **Logging**: Security incident logging only

## 📊 Security Monitoring

### Request Logging
```typescript
// Security event logging
console.warn(`🚨 SECURITY WARNING: Suspicious request detected`, {
  ip: req.ip,
  method: req.method,
  url: req.url,
  userAgent: req.get('user-agent'),
  timestamp: new Date().toISOString()
})
```

### Monitored Patterns
- **XSS Attempts**: Script tags, javascript: URLs
- **SQL Injection**: Union selects, database commands
- **Path Traversal**: ../ patterns, system file access
- **Code Injection**: eval(), function constructors

### Rate Limit Monitoring
- **API Abuse**: Tracks excessive requests per IP
- **Analysis Limits**: Prevents resource exhaustion
- **Automatic Blocking**: Temporary IP blocking on violations

## 🛠️ Configuration Management

### Security Configuration File
```typescript
// Environment-aware security settings
export const securityConfig: SecurityConfig = {
  rateLimit: {
    windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000,
    max: isDevelopment ? 1000 : 100
  },
  // ... more configuration
}
```

### Trusted Domains
```typescript
export const trustedDomains = {
  fonts: ['fonts.googleapis.com', 'fonts.gstatic.com'],
  apis: ['api.tradingagents.local'],
  websockets: ['ws://localhost:3001', 'wss://localhost:3001']
}
```

## 🚀 Deployment Security

### Docker Security
- **Non-root User**: All containers run as unprivileged users
- **Minimal Images**: Alpine Linux base for reduced attack surface
- **Security Scanning**: Regular vulnerability scans
- **Resource Limits**: Memory and CPU constraints

### Network Security
- **Container Isolation**: Services communicate via dedicated network
- **Port Restrictions**: Only necessary ports exposed
- **Proxy Configuration**: Nginx as reverse proxy with security headers

## 📋 Security Checklist

### ✅ Implemented
- [x] Content Security Policy (CSP)
- [x] X-Frame-Options (Clickjacking protection)
- [x] X-Content-Type-Options (MIME sniffing protection)
- [x] X-XSS-Protection (Legacy XSS protection)
- [x] Referrer-Policy (Information leakage prevention)
- [x] Permissions-Policy (Browser API restrictions)
- [x] Rate Limiting (API abuse prevention)
- [x] Input Validation (Injection attack prevention)
- [x] CORS Configuration (Cross-origin restrictions)
- [x] Security Headers (Comprehensive protection)
- [x] Error Handling (Information disclosure prevention)
- [x] Server Hardening (Version hiding, token removal)
- [x] Request Logging (Security monitoring)
- [x] Cache Control (Sensitive data protection)

### 🔄 Future Enhancements
- [ ] HTTPS/TLS Implementation
- [ ] Certificate Pinning
- [ ] Subresource Integrity (SRI)
- [ ] Web Application Firewall (WAF)
- [ ] Intrusion Detection System (IDS)
- [ ] Security Audit Logging
- [ ] Automated Security Testing
- [ ] Penetration Testing

## 🆘 Incident Response

### Security Event Detection
1. **Automated Monitoring**: Real-time pattern detection
2. **Logging**: Comprehensive security event logging
3. **Alerting**: Immediate notification of security violations
4. **Blocking**: Automatic IP blocking for severe violations

### Response Procedures
1. **Immediate**: Block malicious requests
2. **Investigation**: Analyze attack patterns
3. **Mitigation**: Update security rules
4. **Documentation**: Record incident details
5. **Review**: Update security policies

## 📞 Security Contacts

For security-related issues or vulnerabilities:
- **Email**: security@tradingagents.local
- **Response Time**: 24 hours for critical issues
- **Disclosure**: Responsible disclosure policy

---

## 🔍 Security Testing

### Manual Testing Commands
```bash
# Test CSP violations
curl -H "Content-Type: application/json" \
     -d '{"symbol":"<script>alert(1)</script>"}' \
     http://localhost:3001/api/analysis/start

# Test rate limiting
for i in {1..150}; do curl http://localhost:3001/api/health; done

# Test CORS violations
curl -H "Origin: https://malicious-site.com" \
     http://localhost:3001/api/health
```

### Automated Security Scanning
```bash
# Install security scanning tools
npm install -g retire
npm install -g nsp

# Run vulnerability scans
npm audit
retire
nsp check
```

This comprehensive security implementation ensures that the TradingAgents application is protected against common web vulnerabilities while maintaining usability for legitimate users.